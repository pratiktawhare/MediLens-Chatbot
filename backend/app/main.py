from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.routers import auth, chat, dashboard, audio
from app.services.rag_service import get_collection_stats

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite database tables
    init_db()
    print("✅ SQLite database tables initialized.")
    yield
    # Shutdown
    print("🛑 MediLens backend shutting down.")

app = FastAPI(
    title="MediLens AI - Clinical Education & Triage Backend",
    version="2.0.0",
    description="Educational Medical AI with LangGraph, ChromaDB RAG, Groq LLaMA 3.3, and Google Gemini Vision",
    lifespan=lifespan
)

# CORS Setup
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if "*" in origins or not origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(audio.router)

@app.get("/api/health")
def health_check():
    chroma_info = get_collection_stats()
    return {
        "status": "online",
        "configured": bool(settings.groq_api_key or settings.gemini_api_key),
        "groq": bool(settings.groq_api_key),
        "gemini": bool(settings.gemini_api_key),
        "tavily": bool(settings.tavily_api_key),
        "knowledge_base": chroma_info
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
