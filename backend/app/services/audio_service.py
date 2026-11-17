import io
from fastapi import HTTPException
from app.core.config import settings

def transcribe_audio(file_bytes: bytes, filename: str = "voice.webm") -> str:
    """
    Transcribes audio bytes to text using Groq's Free Whisper Large v3 Turbo model.
    """
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="Groq API key required for speech transcription. Set GROQ_API_KEY in .env"
        )

    try:
        from groq import Groq
        client = Groq(api_key=settings.groq_api_key)
        
        audio_file = io.BytesIO(file_bytes)
        audio_file.name = filename

        transcription = client.audio.transcriptions.create(
            file=(filename, audio_file),
            model="whisper-large-v3-turbo",
            response_format="json"
        )
        return transcription.text
    except Exception as exc:
        print(f"[Groq Whisper Transcription Error]: {exc}")
        raise HTTPException(status_code=502, detail=f"Speech transcription failed: {exc}")

def synthesize_speech(text: str) -> bytes:
    """
    Synthesizes text into MP3 audio bytes using gTTS (Google Text-to-Speech) - 100% Free.
    """
    try:
        from gtts import gTTS
        clean_text = text[:3000].replace("*", "").replace("#", "").replace("`", "")
        tts = gTTS(text=clean_text, lang="en", tld="com", slow=False)
        
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()
    except Exception as exc:
        print(f"[gTTS Synthesis Error]: {exc}")
        raise HTTPException(status_code=502, detail=f"Speech synthesis failed: {exc}")
