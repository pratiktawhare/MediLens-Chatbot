import os
import sqlite3
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from tavily import TavilyClient

from app.core.config import settings, BACKEND_DIR
from app.services.rag_service import search_medical_knowledge

SYSTEM_PROMPT = """You are MediLens AI, an experienced, compassionate, and attentive medical doctor consulting directly with a patient.

TONE & PERSONA:
- Speak directly, warmly, and naturally, like an expert doctor sitting across the desk in a calm, caring clinic.
- Be reassuring, empathetic, and clear. Avoid robotic bureaucratic language, academic disclaimers, or rigid forms.
- Do NOT start messages with boilerplate disclaimers (e.g. do not say "Important Safety Note: I am an AI and not a doctor"). Provide authentic, expert medical guidance.

SPACING & FORMATTING ("GAPS"):
- Keep answers precise, scannable, and spacious.
- ALWAYS leave clean blank line spaces (gaps) between paragraphs, headers, and bullet points. Never squish text together.
- For medical questions and image evaluations, structure your consultation naturally:

  **What's Happening**

  1–2 clear, reassuring sentences directly addressing the patient's concern in everyday language.

  **Likely Possibilities**

  • **[Possibility 1]**: Clear, plain-language explanation of why this happens.

  • **[Possibility 2]**: Another common factor to consider.

  **Helpful Steps You Can Take**

  • **[Practical Step 1]**: Actionable self-care, gentle hygiene, or soothing home measure.

  • **[Practical Step 2]**: What to avoid (e.g., picking, scratching, harsh products).

  **When to Get Checked Out**

  • Specific red flags, changes, or warning signs that mean you should be examined in person.

CONVERSATIONAL GREETINGS & THANKS:
- If the patient is simply saying "thanks", "thank you", "hello", "goodbye", or expressing appreciation, reply naturally in 1–2 friendly, human sentences (e.g., "You're very welcome! I'm glad I could help explain things clearly. If anything else comes up or you feel worse, don't hesitate to reach back out. Take good care of yourself!").
- NEVER use headers, templates, or bullet points for simple conversational chit-chat!

EMERGENCIES:
- If the patient describes sudden life-threatening signs (crushing chest pain radiating to arm/jaw, signs of stroke, severe breathing distress, severe bleeding), urge immediate emergency care (911 / 112).
- Never prescribe exact prescription drug dosages or claim a 100% definitive diagnosis without lab tests.
- When citing reference facts, use clean, subtle tags like [PDF p.N] or [Web: Source]."""

def is_conversational_query(text: str) -> bool:
    """Detects casual social greetings, thank-yous, closings, and small-talk."""
    cleaned = text.strip().lower().rstrip(".!?,")
    casual_phrases = {
        "thanks", "thank you", "thank you so much", "thanks a lot", "thanks means a lot",
        "means a lot", "thank you doctor", "thanks doctor", "thx", "ok", "okay", "ok thanks",
        "okay thanks", "got it", "understood", "alright", "hello", "hi", "hey",
        "good morning", "good afternoon", "good evening", "bye", "goodbye", "see you",
        "great thanks", "perfect thanks", "nice", "awesome", "appreciate it", "appreciated",
        "much appreciated", "who are you", "what can you do", "help", "cool", "thank u"
    }
    if cleaned in casual_phrases:
        return True

    words = cleaned.split()
    if len(words) <= 6:
        social_words = {"thanks", "thank", "thx", "appreciated", "grateful", "welcome", "hello", "hi", "hey", "bye", "goodbye", "cheers"}
        medical_words = {
            "pain", "ache", "hurt", "blood", "fever", "cough", "rash", "headache",
            "pill", "dose", "symptom", "disease", "infection", "vomit", "nausea",
            "cancer", "swollen", "burn", "itch", "wound", "injury", "medication", "drug", "skin", "acne"
        }
        if any(w in social_words for w in words) and not any(w in medical_words for w in words):
            return True

    return False

class AgentState(TypedDict):
    question: str
    history: list
    image_description: str
    kb: list
    web: list
    answer: str
    route: str
    model_used: str

def retrieve(state: AgentState) -> Dict[str, Any]:
    """Retrieve relevant excerpts from local ChromaDB knowledge base using LangChain."""
    # Skip retrieval for simple conversational remarks when no image is attached
    if is_conversational_query(state['question']) and not state.get('image_description'):
        return {'kb': []}

    query = state['question']
    if state.get('image_description'):
        query += " " + state['image_description']
    citations = search_medical_knowledge(query, top_k=4)
    return {'kb': citations}

def route(state: AgentState) -> Dict[str, Any]:
    """
    Decides whether to search the live web via Tavily:
    Triggered if the question asks for current/modern guidelines or if local KB has low confidence.
    """
    if is_conversational_query(state['question']) and not state.get('image_description'):
        return {'route': 'answer'}

    current_keywords = ['latest', 'current', '2024', '2025', '2026', 'guideline', 'updated', 'new treatment', 'modern', 'fda', 'who']
    is_current = any(w in state['question'].lower() for w in current_keywords)
    kb_weak = not state.get('kb') or (len(state['kb']) > 0 and state['kb'][0].get('score', 0) < 0.60)
    
    if (is_current or kb_weak) and settings.tavily_api_key:
        return {'route': 'web'}
    return {'route': 'answer'}

def web_search(state: AgentState) -> Dict[str, Any]:
    """Search the live web for clinical guidance using Tavily."""
    if not settings.tavily_api_key:
        return {'web': []}
    try:
        client = TavilyClient(api_key=settings.tavily_api_key)
        data = client.search(
            query=state['question'] + ' clinical guidance',
            search_depth='basic',
            max_results=3
        )
        web_results = [
            {
                'type': 'web',
                'title': x.get('title', 'Clinical Web Resource'),
                'url': x.get('url', ''),
                'text': x.get('content', '')[:1000],
                'file': x.get('title', 'Web Source'),
                'page': 'Web',
                'score': round(x.get('score', 0.85), 2)
            }
            for x in data.get('results', [])
        ]
        return {'web': web_results}
    except Exception as e:
        print(f"[Tavily Search Error in LangGraph]: {e}")
        return {'web': []}

def answer(state: AgentState) -> Dict[str, Any]:
    """Generate medical education answer using Groq (primary) or Gemini (backup)."""
    kb_context = '\n\n'.join(
        f"[PDF p.{x.get('page', '?')}] {x.get('text', '')}" for x in state.get('kb', [])
    )
    web_context = '\n\n'.join(
        f"[Web Source: {x.get('title', '')} ({x.get('url', '')})]\n{x.get('text', '')}" for x in state.get('web', [])
    )

    is_conversational = is_conversational_query(state['question']) and not state.get('image_description')
    
    if is_conversational:
        sys_instruction = (
            "You are an empathetic, attentive, and expert doctor consulting directly with your patient. "
            "The patient is speaking casually (such as saying thanks, hello, goodbye, or expressing appreciation). "
            "Reply warmly, naturally, and concisely in 1 to 2 pleasant sentences like a caring human doctor. "
            "Do NOT use markdown headers, bullet points, disclaimers, or templates."
        )
        user_prompt = state['question']
    else:
        sys_instruction = SYSTEM_PROMPT
        user_prompt = (
            f"Question: {state['question']}\n"
            f"Visual observations: {state.get('image_description') or 'None'}\n\n"
            f"Local Medical Book Excerpts:\n{kb_context or 'No relevant PDF excerpts found.'}\n\n"
            f"External Web Results:\n{web_context or 'No external web results.'}"
        )
    
    messages = [SystemMessage(content=sys_instruction)]
    
    # Append recent conversation history
    for msg in state.get('history', [])[-6:]:
        if isinstance(msg, dict):
            role = msg.get('role')
            content = msg.get('content', '')
            if role == 'user':
                messages.append(HumanMessage(content=content))
            elif role == 'assistant':
                messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=user_prompt))

    # 1. Primary Choice Everywhere: Groq (ultra-fast reasoning via qwen/qwen3.8-27b)
    if settings.groq_api_key:
        try:
            llm = ChatGroq(
                model=settings.groq_model,
                temperature=0.25,
                api_key=settings.groq_api_key,
                timeout=30
            )
            response = llm.invoke(messages)
            return {'answer': response.content, 'model_used': f"Groq ({settings.groq_model})"}
        except Exception as groq_err:
            print(f"[Groq Error in LangGraph, falling back to Gemini]: {groq_err}")

    # 2. Backup Choice: Google Gemini (gemini-3.5-flash / fallback)
    if settings.gemini_api_key:
        for m in [settings.gemini_model, "gemini-3.5-flash", "gemini-flash-latest"]:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=m,
                    temperature=0.25,
                    google_api_key=settings.gemini_api_key,
                    timeout=20,
                    max_retries=1
                )
                response = llm.invoke(messages)
                content = response.content
                if isinstance(content, list):
                    answer_text = "".join(
                        part.get("text", "") if isinstance(part, dict) else str(part) 
                        for part in content
                    )
                else:
                    answer_text = str(content)
                if answer_text.strip():
                    return {'answer': answer_text.strip(), 'model_used': f"Google Gemini ({m})"}
            except Exception as e:
                print(f"[Gemini {m} Error in LangGraph]: {e}")

    return {
        'answer': (
            "⚠️ **API Key Configuration Required**\n\n"
            "Please configure your free **Groq** (`GROQ_API_KEY`) or **Gemini** (`GEMINI_API_KEY`) "
            "in `backend/.env` to enable AI medical answers."
        ),
        'model_used': 'Offline'
    }

# Build LangGraph StateGraph
builder = StateGraph(AgentState)
builder.add_node('retrieve', retrieve)
builder.add_node('route', route)
builder.add_node('web', web_search)
builder.add_node('answer', answer)

builder.set_entry_point('retrieve')
builder.add_edge('retrieve', 'route')
builder.add_conditional_edges(
    'route',
    lambda s: s['route'],
    {'web': 'web', 'answer': 'answer'}
)
builder.add_edge('web', 'answer')
builder.add_edge('answer', END)

# SQLite persistent checkpointer
db_path = str(BACKEND_DIR / "data" / "medical_memory.db")
os.makedirs(os.path.dirname(db_path), exist_ok=True)
conn = sqlite3.connect(db_path, check_same_thread=False)
memory = SqliteSaver(conn)

graph = builder.compile(checkpointer=memory)
