import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
env_file_path = BACKEND_DIR / ".env"
if env_file_path.exists():
    load_dotenv(dotenv_path=env_file_path, override=True)

class Settings(BaseSettings):
    # Free API Keys
    groq_api_key: str = ""
    gemini_api_key: str = ""
    tavily_api_key: str = ""  # Free tier 1000 searches/mo from https://tavily.com
    
    # JWT Authentication
    jwt_secret: str = "medilens_dev_secret_key_81a7f53c_secure_2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # Local Storage Paths
    chroma_persist_dir: str = str(BACKEND_DIR / "data" / "chroma_db")
    
    @field_validator("chroma_persist_dir", mode="after")
    @classmethod
    def resolve_chroma_dir(cls, v: str) -> str:
        p = Path(v)
        if not p.is_absolute():
            return str((BACKEND_DIR / p).resolve())
        return str(p.resolve())
    # Database
    database_url: str = ""
    database_url_unpooled: str = ""
    sqlite_db_url: str = f"sqlite:///{BACKEND_DIR / 'data' / 'medilens.db'}"
    
    # Embedding Configuration (Google Gemini Cloud API - 0 RAM overhead)
    gemini_embedding_model: str = "models/gemini-embedding-001"
    gemini_embedding_dimension: int = 768
    chroma_collection_name: str = "medilens_knowledge"
    
    @property
    def active_collection_name(self) -> str:
        return self.chroma_collection_name
    
    # Models
    groq_model: str = "qwen/qwen3.8-27b"
    gemini_model: str = "gemini-3.5-flash"
    
    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,https://medilens-chatbot.vercel.app"
    
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

if settings.gemini_api_key:
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
    # Remove stale or invalid system GOOGLE_API_KEY to avoid conflicts with Gemini API
    if "GOOGLE_API_KEY" in os.environ:
        del os.environ["GOOGLE_API_KEY"]

