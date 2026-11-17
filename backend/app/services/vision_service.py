import base64
from fastapi import HTTPException
from app.core.config import settings

VISION_PROMPT = (
    "Describe only objectively visible medical-relevant features in this image. "
    "Do not diagnose, estimate severity, or assert absence of illness. "
    "If the image is unclear or low-resolution, say so."
)

def inspect_image(data: str) -> str:
    """
    Analyzes an attached medical image using Groq Vision (primary: qwen/qwen3.8-27b)
    with seamless fallback to Google Gemini Vision.
    """
    if not data:
        return ""

    try:
        if "," in data:
            header, payload = data.split(",", 1)
            mime = header.split(";")[0].split(":")[1] if ":" in header else "image/jpeg"
        else:
            payload = data
            mime = "image/jpeg"

        raw = base64.b64decode(payload, validate=True)
        if mime not in ("image/jpeg", "image/png", "image/webp") or len(raw) > 5_000_000:
            raise ValueError("Only JPEG, PNG, or WebP under 5MB are supported")
    except (ValueError, IndexError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {exc}")

    # 1. Primary: Ultra-fast Groq Multimodal Vision (qwen/qwen3.8-27b)
    if settings.groq_api_key:
        try:
            from groq import Groq
            client = Groq(api_key=settings.groq_api_key)
            data_url = f"data:{mime};base64,{payload}"
            
            completion = client.chat.completions.create(
                model=settings.groq_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VISION_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }],
                max_tokens=400,
                temperature=0.2
            )
            text = completion.choices[0].message.content
            if text:
                return text.strip()
        except Exception as groq_err:
            print(f"[Groq Vision Error, falling back to Gemini]: {groq_err}")

    # 2. Fallback: Google Gemini Multimodal Vision
    if settings.gemini_api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.gemini_api_key)
            candidate_models = [settings.gemini_model, "gemini-3.5-flash", "gemini-flash-latest"]
            
            for model_name in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=raw, mime_type=mime),
                            VISION_PROMPT
                        ]
                    )
                    if response.text:
                        return response.text.strip()
                except Exception as model_err:
                    print(f"[Gemini model {model_name} failed: {model_err}]")
                    continue
        except Exception as gemini_err:
            print(f"[Gemini Vision Inspection Error]: {gemini_err}")

    return "Visual observation could not be processed."
