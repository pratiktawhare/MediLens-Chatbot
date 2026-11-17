import os
import base64
from typing import List, Dict, Any, Optional
from app.core.config import settings

MEDICAL_SYSTEM_PROMPT = """You are MediLens AI, an experienced, compassionate, and attentive medical doctor consulting directly with a patient.

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

def generate_medical_response(
    question: str,
    history: List[Dict[str, str]],
    context_citations: List[Dict[str, Any]],
    web_citations: Optional[List[Dict[str, Any]]] = None,
    image_base64: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a medical education response using Groq (primary) or Gemini (fallback/multimodal).
    Combines local ChromaDB PDF excerpts with live Tavily web research.
    """
    context_sections = []
    
    # 1. Local PDF excerpts
    if context_citations:
        pdf_texts = "\n\n".join(
            f"[PDF Reference: {c.get('file', 'Medical Book')} (Page {c.get('page', '?')})]\n{c.get('text', '')}"
            for c in context_citations
        )
        context_sections.append(f"### Local Medical Reference Excerpts (Historical):\n{pdf_texts}")

    # 2. Live Web Search excerpts (Tavily)
    if web_citations:
        web_texts = "\n\n".join(
            f"[Live Web Guidance: {w.get('title', 'Web Article')} ({w.get('url', '')})]\n{w.get('text', '')}"
            for w in web_citations
        )
        context_sections.append(f"### Live Web Clinical Guidance (Current):\n{web_texts}")

    context_str = "\n\n".join(context_sections) if context_sections else "No external medical reference excerpts available."

    user_prompt = f"""User Medical Inquiry:
{question}

Available Clinical Context:
{context_str}

Please formulate an evidence-informed, empathetic medical education and triage response following the safety rules."""

    # 1. Primary Choice Everywhere: Groq (ultra-fast reasoning via qwen/qwen3.8-27b)
    if settings.groq_api_key:
        try:
            return call_groq(user_prompt, history)
        except Exception as groq_err:
            print(f"[Groq Error, falling back to Gemini]: {groq_err}")

    # 2. Backup: Google Gemini for clinical text synthesis
    if settings.gemini_api_key:
        try:
            return call_gemini(user_prompt, history, image_base64=image_base64)
        except Exception as gemini_err:
            print(f"[Gemini Error]: {gemini_err}")

    return {
        "text": (
            "⚠️ **API Key Configuration Required**\n\n"
            "Please configure your free **Groq** (`console.groq.com`) or **Google Gemini** (`aistudio.google.com`) "
            "API keys in `backend/.env` to enable AI reasoning.\n\n"
            f"**Your Query**: {question}\n"
            f"**Retrieved Sources**: Found {len(context_citations)} PDF excerpts and {len(web_citations or [])} web sources."
        ),
        "model_used": "offline_stub"
    }

def call_groq(prompt: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    from groq import Groq
    client = Groq(api_key=settings.groq_api_key)
    
    messages = [{"role": "system", "content": MEDICAL_SYSTEM_PROMPT}]
    for msg in history[-6:]:
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": msg["content"]})
            
    messages.append({"role": "user", "content": prompt})
    
    completion = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.2,
        max_tokens=1500
    )
    
    return {
        "text": completion.choices[0].message.content or "",
        "model_used": f"Groq ({settings.groq_model})"
    }

def call_gemini(
    prompt: str,
    history: List[Dict[str, str]],
    image_base64: Optional[str] = None
) -> Dict[str, Any]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    contents = []
    
    if image_base64:
        if "," in image_base64:
            header, payload = image_base64.split(",", 1)
            mime_type = header.split(";")[0].split(":")[1] if ":" in header else "image/jpeg"
        else:
            payload = image_base64
            mime_type = "image/jpeg"
            
        raw_bytes = base64.b64decode(payload)
        contents.append(
            types.Part.from_bytes(data=raw_bytes, mime_type=mime_type)
        )
        
    contents.append(
        f"{MEDICAL_SYSTEM_PROMPT}\n\nUser Context and Question:\n{prompt}"
    )

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=contents
    )

    return {
        "text": response.text or "",
        "model_used": f"Google Gemini ({settings.gemini_model})"
    }
