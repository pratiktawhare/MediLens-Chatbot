from typing import List, Dict, Any
from app.core.config import settings

MODERN_KEYWORDS = [
    "latest", "current", "recent", "new", "updated", "guideline", 
    "guidelines", "fda", "who", "cdc", "2024", "2025", "2026", "modern"
]

def should_trigger_web_search(query: str, kb_citations: List[Dict[str, Any]]) -> bool:
    """
    Decides whether web research is necessary:
    1. If the query explicitly seeks modern/recent guidelines.
    2. Or if the local PDF knowledge base returned 0 results or weak matches (score < 0.60).
    """
    if not settings.tavily_api_key:
        return False
        
    lower_query = query.lower()
    asks_for_current = any(w in lower_query for w in MODERN_KEYWORDS)
    
    kb_is_weak = not kb_citations or (len(kb_citations) > 0 and kb_citations[0].get("score", 0) < 0.60)
    
    return asks_for_current or kb_is_weak

def search_web_clinical_guidance(query: str, max_results: int = 3) -> List[Dict[str, Any]]:
    """
    Searches the live web for authoritative clinical evidence using Tavily.
    """
    if not settings.tavily_api_key:
        return []

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=settings.tavily_api_key)
        
        # Search specifically for clinical guidance to keep evidence high-quality
        response = client.search(
            query=f"{query} medical clinical guidance",
            search_depth="basic",
            max_results=max_results
        )
        
        web_results = []
        for r in response.get("results", []):
            web_results.append({
                "type": "web",
                "title": r.get("title", "Clinical Web Resource"),
                "url": r.get("url", ""),
                "text": r.get("content", "")[:900],
                "file": r.get("title", "Web Source"),
                "page": "Web",
                "score": round(r.get("score", 0.85), 2)
            })
            
        return web_results
    except Exception as e:
        print(f"[Tavily Search Warning]: {e}")
        return []
