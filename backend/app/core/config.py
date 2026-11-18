import os
from pathlib import Path
from dotenv import load_dotenv
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
    # Database
    database_url: str = ""
    database_url_unpooled: str = ""
    sqlite_db_url: str = f"sqlite:///{BACKEND_DIR / 'data' / 'medilens.db'}"
    
    # Embedding Model (HuggingFace local model)
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Models
    groq_model: str = "qwen/qwen3.8-27b"
    gemini_model: str = "gemini-3.5-flash"
    
    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

if settings.gemini_api_key:
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
    os.environ["GOOGLE_API_KEY"] = settings.gemini_api_key

