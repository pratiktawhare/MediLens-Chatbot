from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from pydantic import BaseModel
from app.db.database import get_session
from app.db.models import User, ChatSession, ChatMessage, Bookmark
from app.routers.auth import get_current_user
from app.services.rag_service import get_collection_stats
from app.core.config import settings

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Statistics"])

class BookmarkCreate(BaseModel):
    title: str
    snippet: str
    source: str

@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Total user sessions
    session_count = db.exec(
        select(func.count(ChatSession.id)).where(ChatSession.user_id == current_user.id)
    ).one()

    # Total user bookmarks
    bookmark_count = db.exec(
        select(func.count(Bookmark.id)).where(Bookmark.user_id == current_user.id)
    ).one()

    # Vector DB diagnostics
    chroma_stats = get_collection_stats()

    return {
        "user": {
            "name": current_user.full_name or current_user.email.split("@")[0],
            "email": current_user.email
        },
        "stats": {
            "total_consultations": session_count,
            "saved_bookmarks": bookmark_count,
            "vector_documents": chroma_stats.get("document_count", 0),
            "vector_status": chroma_stats.get("status", "unknown")
        },
        "system": {
            "groq_configured": bool(settings.groq_api_key),
            "gemini_configured": bool(settings.gemini_api_key),
            "embedding_model": settings.embedding_model_name
        }
    }

@router.get("/presets")
def get_triage_presets():
    return [
        {
            "id": "chest-pain",
            "title": "Chest Tightness & Discomfort",
            "category": "Cardiovascular / Urgent",
            "prompt": "I'm experiencing intermittent pressure in my chest when walking. What symptoms should I watch for, and when is it an emergency?",
            "icon": "Activity"
        },
        {
            "id": "migraine",
            "title": "Severe Headache & Light Sensitivity",
            "category": "Neurological",
            "prompt": "I have a throbbing headache on one side of my head with nausea and sensitivity to light. How can I differentiate a migraine from tension headache?",
            "icon": "Brain"
        },
        {
            "id": "skin-rash",
            "title": "New Skin Rash / Itching",
            "category": "Dermatology",
            "prompt": "I noticed an itchy, red rash on my forearms that appeared yesterday. What causes are common, and how should it be evaluated?",
            "icon": "ShieldAlert"
        },
        {
            "id": "cold-flu",
            "title": "Fever, Body Aches & Cough",
            "category": "Infectious / Respiratory",
            "prompt": "I have had a 101°F fever, muscle chills, and a dry cough for 2 days. What are the key differences between the flu and a common cold?",
            "icon": "Thermometer"
        }
    ]

@router.get("/bookmarks")
def list_bookmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    stmt = select(Bookmark).where(Bookmark.user_id == current_user.id)
    return db.exec(stmt).all()

@router.post("/bookmarks")
def add_bookmark(
    data: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    bookmark = Bookmark(
        user_id=current_user.id,
        title=data.title,
        snippet=data.snippet,
        source=data.source
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark

@router.delete("/bookmarks/{bookmark_id}")
def delete_bookmark(
    bookmark_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    bookmark = db.get(Bookmark, bookmark_id)
    if not bookmark or bookmark.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bookmark)
    db.commit()
    return {"status": "deleted"}
