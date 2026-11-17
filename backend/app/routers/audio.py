from fastapi import APIRouter, File, UploadFile, HTTPException, Response
from pydantic import BaseModel
from app.services.audio_service import transcribe_audio, synthesize_speech

router = APIRouter(prefix="/api", tags=["Audio & Speech"])

class SpeakRequest(BaseModel):
    text: str

@router.post("/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...)):
    """
    Speech-to-Text endpoint powered by Groq's Free Whisper-large-v3-turbo.
    Accepts webm, wav, mp3 audio uploads under 10MB.
    """
    content = await file.read(10_000_001)
    if len(content) > 10_000_000:
        raise HTTPException(status_code=413, detail="Audio file exceeds 10 MB limit")
        
    text = transcribe_audio(content, filename=file.filename or "voice.webm")
    return {"text": text}

@router.post("/speak")
def speak_endpoint(payload: SpeakRequest):
    """
    Text-to-Speech endpoint powered by free Google Text-to-Speech (gTTS).
    Returns audio/mpeg binary stream for in-browser playback.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Missing text for speech synthesis")
        
    audio_bytes = synthesize_speech(payload.text)
    return Response(content=audio_bytes, media_type="audio/mpeg")
