import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, desc
from pydantic import BaseModel, Field

from app.db.database import get_session
from app.db.models import User, ChatSession, ChatMessage
from app.routers.auth import get_current_user
from app.services.triage_service import evaluate_emergency
from app.services.vision_service import inspect_image
from app.agent import graph

router = APIRouter(prefix="/api/chat", tags=["Chat & Consultations"])

class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    session_id: Optional[str] = None
    image_base64: Optional[str] = None

class SessionCreateRequest(BaseModel):
    title: Optional[str] = "New Consultation"

@router.get("/sessions")
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
    )
    return db.exec(stmt).all()

@router.post("/sessions")
def create_session(
    req: SessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    new_session = ChatSession(
        user_id=current_user.id,
        title=req.title or "New Consultation"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/sessions/{session_id}")
def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    session = db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Consultation session not found")
        
    stmt = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at)
    messages = db.exec(stmt).all()
    
    result = []
    for m in messages:
        sources = []
        if m.sources_json:
            try:
                sources = json.loads(m.sources_json)
            except Exception:
                sources = []
        result.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "image_url": m.image_url,
            "sources": sources,
            "emergency_alert": m.emergency_alert,
            "created_at": m.created_at
        })
    return {"session": session, "messages": result}

@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    session = db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "deleted", "session_id": session_id}

@router.post("")
def send_message(
    payload: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # 1. Resolve or create chat session
    if payload.session_id:
        session = db.get(ChatSession, payload.session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Consultation session not found")
    else:
        title = payload.message[:35] + ("..." if len(payload.message) > 35 else "")
        session = ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Check for Clinical Red-Flag Emergencies
    emergency_eval = evaluate_emergency(payload.message)
    
    # 3. Multimodal Image Analysis via Gemini Vision
    observation = ""
    if payload.image_base64:
        observation = inspect_image(payload.image_base64)

    # 4. Fetch past messages for conversation context
    msg_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    past_messages = db.exec(msg_stmt).all()
    history = [{"role": m.role, "content": m.content} for m in past_messages[-8:]]

    # 5. Invoke LangGraph StateGraph (retrieve -> route -> web? -> answer)
    config = {"configurable": {"thread_id": session.id}}
    state_input = {
        'question': payload.message,
        'history': history,
        'image_description': observation,
        'kb': [],
        'web': [],
        'answer': '',
        'route': '',
        'model_used': ''
    }

    try:
        final_state = graph.invoke(state_input, config=config)
    except Exception as e:
        print(f"[LangGraph Execution Error]: {e}", flush=True)
        raise HTTPException(
            status_code=502,
            detail=f"LangGraph execution encountered an issue: {str(e)}"
        )

    bot_reply = final_state.get('answer', '')
    all_citations = final_state.get('kb', []) + final_state.get('web', [])
    model_used = final_state.get('model_used', 'LangGraph Agent')

    # Prepend critical emergency banner if red-flag detected
    if emergency_eval["is_emergency"]:
        bot_reply = (
            f"⚠️ **{emergency_eval['headline']}**\n\n"
            f"> **CRITICAL ALERT:** {emergency_eval['directive']}\n\n"
            f"---\n\n"
            + bot_reply
        )

    # 6. Save User & Assistant Messages to SQLite DB
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=payload.message,
        image_url=payload.image_base64[:50] + "..." if payload.image_base64 else None,
        emergency_alert=emergency_eval["is_emergency"]
    )
    db.add(user_msg)
    
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=bot_reply,
        sources_json=json.dumps(all_citations),
        emergency_alert=emergency_eval["is_emergency"]
    )
    db.add(assistant_msg)
    
    from datetime import datetime, timezone
    session.updated_at = datetime.now(timezone.utc)
    db.add(session)
    db.commit()

    return {
        "session_id": session.id,
        "reply": bot_reply,
        "citations": all_citations,
        "observation": observation,
        "web_search_used": final_state.get('route') == 'web',
        "emergency_alert": emergency_eval,
        "model_used": model_used
    }
