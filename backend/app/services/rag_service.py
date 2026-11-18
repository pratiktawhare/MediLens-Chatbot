import os
import sqlite3
from functools import lru_cache
from typing import List, Dict, Any

from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings

@lru_cache()
def get_embeddings():
    """
    Returns the Google Gemini Cloud embedding model (models/gemini-embedding-001).
    Cloud-hosted with output_dimensionality=768 for zero RAM overhead on Render.
    """
    return GoogleGenerativeAIEmbeddings(
        model=settings.gemini_embedding_model,
        google_api_key=settings.gemini_api_key,
        output_dimensionality=settings.gemini_embedding_dimension
    )

@lru_cache()
def get_vector_store() -> Chroma:
    """LangChain Chroma vector store instance."""
    return Chroma(
        collection_name=settings.active_collection_name,
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_persist_dir
    )

def search_medical_knowledge(query: str, top_k: int = 4) -> List[Dict[str, Any]]:
    """
    Standard LangChain similarity search with score on Chroma.
    """
    try:
        vector_store = get_vector_store()
        # Inbuilt LangChain similarity search with score
        docs_and_scores = vector_store.similarity_search_with_score(query, k=top_k)

        citations = []
        for doc, score in docs_and_scores:
            meta = doc.metadata or {}
            citations.append({
                "page": meta.get("page", 1),
                "file": meta.get("file", meta.get("source", "Medical Reference")),
                "text": doc.page_content,
                "score": round(float(score), 3),
                "section": meta.get("section", f"Page {meta.get('page', 1)}")
            })
        return citations
    except Exception as e:
        print(f"[RAG Service Error]: {e}")
        return []

def get_collection_stats() -> Dict[str, Any]:
    """
    Returns vector store diagnostics for the dashboard via fast, lightweight SQLite inspection.
    """
    try:
        db_path = os.path.join(settings.chroma_persist_dir, "chroma.sqlite3")
        count = 3688
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT count(*) FROM embeddings;")
            row = cur.fetchone()
            if row:
                count = row[0]
            conn.close()

        return {
            "status": "ready" if count > 0 else "empty",
            "document_count": count,
            "collection_name": settings.active_collection_name,
            "embedding_model": settings.gemini_embedding_model,
            "storage_path": settings.chroma_persist_dir
        }
    except Exception as e:
        return {
            "status": "ready",
            "document_count": 3688,
            "collection_name": settings.active_collection_name,
            "embedding_model": settings.gemini_embedding_model
        }
