import os
import sys
import time
import re
import argparse
import shutil
import warnings
from pathlib import Path

# Suppress pypdf / fontTools encoding warnings
warnings.filterwarnings("ignore")

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))
from app.core.config import settings

def get_vector_store(reset: bool = False):
    """
    Initializes Chroma vector store with Google Gemini Cloud Embeddings.
    Zero RAM overhead, 768-dimensional Matryoshka vectors.
    """
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not set in backend/.env. Cannot initialize embeddings.")

    if reset and Path(settings.chroma_persist_dir).exists():
        print(f"🗑️  Resetting ChromaDB directory: {settings.chroma_persist_dir}")
        shutil.rmtree(settings.chroma_persist_dir, ignore_errors=True)
        print("✅ Old ChromaDB storage cleared.")

    embeddings = GoogleGenerativeAIEmbeddings(
        model=settings.gemini_embedding_model,
        google_api_key=settings.gemini_api_key,
        output_dimensionality=settings.gemini_embedding_dimension
    )

    print(f"🚀 Google Gemini Cloud Embeddings ({settings.gemini_embedding_model}, dim={settings.gemini_embedding_dimension})")
    print(f"📦 Chroma Collection: {settings.active_collection_name}")
    print(f"📁 Persist Directory: {settings.chroma_persist_dir}")

    return Chroma(
        collection_name=settings.active_collection_name,
        embedding_function=embeddings,
        persist_directory=settings.chroma_persist_dir
    )

def extract_retry_delay(error_str: str, default_wait: float = 12.0) -> float:
    """Extracts the exact retry delay requested by Google's 429 response if present."""
    match = re.search(r"retry in (\d+(?:\.\d+)?)s", error_str, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1)) + 1.0
        except ValueError:
            pass
    return default_wait

def ingest_pdf(
    pdf_path: Path,
    vector_store: Chroma,
    splitter: RecursiveCharacterTextSplitter,
    max_pages: int = None,
    batch_size: int = 50,
    interval: float = 1.0
):
    """
    Ingests PDF documents into ChromaDB with intelligent rate-limit pacing and automatic resumption.
    Paced for Gemini API free tier (tuned for 1500 RPM with graceful backoff).
    """
    print(f"\n[LangChain Ingest] Loading: {pdf_path.name}")
    loader = PyPDFLoader(str(pdf_path))
    raw_docs = loader.load()
    if max_pages:
        raw_docs = raw_docs[:max_pages]
        print(f"  (Testing mode: limiting to first {max_pages} pages)")
    print(f"  Loaded {len(raw_docs)} pages from {pdf_path.name}")

    # Split documents into chunks preserving page metadata
    chunks = splitter.split_documents(raw_docs)
    total_chunks = len(chunks)
    print(f"  Split into {total_chunks} chunks.")

    # Check how many are already indexed in ChromaDB
    already_indexed = vector_store._collection.count()
    if already_indexed >= total_chunks:
        print(f"  ✅ Collection already contains all {already_indexed} chunks. No further ingestion needed.")
        return total_chunks

    start_idx = already_indexed
    if start_idx > 0:
        print(f"  🔄 Resuming ingestion from chunk {start_idx}/{total_chunks}...")

    print(f"  Embedding and indexing into ChromaDB (batch_size={batch_size}, interval={interval}s)...")
    t0 = time.time()
    for i in range(start_idx, total_chunks, batch_size):
        batch = chunks[i:i + batch_size]
        for attempt in range(6):
            try:
                vector_store.add_documents(batch)
                processed = min(i + batch_size, total_chunks)
                elapsed = max(time.time() - t0, 0.1)
                chunks_per_sec = (processed - start_idx) / elapsed
                print(
                    f"  Indexed chunks {processed}/{total_chunks} "
                    f"({(processed/total_chunks)*100:.1f}%) "
                    f"[{chunks_per_sec:.1f} chunks/s]...",
                    flush=True
                )
                if interval > 0:
                    time.sleep(interval)
                break
            except Exception as e:
                err_text = str(e)
                if "429" in err_text or "RESOURCE_EXHAUSTED" in err_text:
                    wait_time = extract_retry_delay(err_text, default_wait=12.0)
                    print(f"  ⏳ Gemini rate-limit reached. Server requested retry in {wait_time:.1f}s (attempt {attempt+1}/6)...", flush=True)
                    time.sleep(wait_time)
                else:
                    print(f"  ⚠️ Error on chunks {i}-{i+len(batch)} (attempt {attempt+1}/6): {e}", flush=True)
                    time.sleep(3.0)

                if attempt == 5:
                    raise e

    print(f"  ✅ Successfully indexed {pdf_path.name}")
    return total_chunks

def main():
    parser = argparse.ArgumentParser(description="MediLens LangChain Gemini Ingestion Engine")
    parser.add_argument("--pdf", type=str, default=None, help="Path to PDF. Defaults to scanning backend/data/")
    parser.add_argument("--reset", action="store_true", help="Clear existing ChromaDB collection first")
    parser.add_argument("--max-pages", type=int, default=None, help="Limit number of pages to index")
    parser.add_argument("--batch-size", type=int, default=50, help="Number of chunks per API batch (default: 50)")
    parser.add_argument("--interval", type=float, default=1.0, help="Delay in seconds between batches (default: 1.0s)")
    args = parser.parse_args()

    vector_store = get_vector_store(reset=args.reset)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " "]
    )

    data_dir = BACKEND_DIR / "data"
    target_pdfs = [Path(args.pdf)] if args.pdf else list(data_dir.glob("*.pdf"))

    if not target_pdfs:
        print(f"No PDFs found to ingest in {data_dir}. Place PDFs there or use --pdf <path>")
        return

    for pdf in target_pdfs:
        if pdf.exists():
            ingest_pdf(
                pdf,
                vector_store,
                splitter,
                max_pages=args.max_pages,
                batch_size=args.batch_size,
                interval=args.interval
            )
        else:
            print(f"File not found: {pdf}")

    print(f"\n🎉 Ingestion Complete! Total documents in vector store: {vector_store._collection.count()}")

if __name__ == "__main__":
    main()
