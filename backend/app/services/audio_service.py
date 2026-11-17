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
    Optimized for fast response with concise synthesis, stripping emojis and dashes.
    """
    try:
        from gtts import gTTS
        import re
        # 1. Remove citations & URLs
        clean_text = re.sub(r'\[(?:PDF|Web)[^\]]*\]', '', text[:1000], flags=re.IGNORECASE)
        clean_text = re.sub(r'\(p\.\s*\d+\)', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'https?://\S+', '', clean_text)
        # 2. Remove emojis, symbols & pictographs
        clean_text = re.sub(r'[\U00010000-\U0010ffff]', '', clean_text)
        clean_text = re.sub(r'[\u2600-\u27bf\ufe00-\ufe0f]', '', clean_text)
        # 3. Remove repeated dashes (---, ------), underscores, equals, tildes
        clean_text = re.sub(r'[-_~=]{2,}', ' ', clean_text)
        # 4. Remove standalone dashes & bullets (preserves hyphenated words)
        clean_text = re.sub(r'(?:^|\s)[-•*+–—]+(?:\s|$)', ' ', clean_text)
        clean_text = re.sub(r'[\u2013\u2014]', ' ', clean_text)
        # 5. Remove markdown symbols
        clean_text = re.sub(r'[*_#`~>|\\^\[\]]', '', clean_text)
        clean_text = re.sub(r'\n+', '. ', clean_text)
        clean_text = re.sub(r'\.{2,}', '.', clean_text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        tts = gTTS(text=clean_text or "No text to speak", lang="en", tld="com", slow=False)
        
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()
    except Exception as exc:
        print(f"[gTTS Synthesis Error]: {exc}")
        raise HTTPException(status_code=502, detail=f"Speech synthesis failed: {exc}")
