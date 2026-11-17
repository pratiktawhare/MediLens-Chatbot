import os
import sys
import argparse
from pathlib import Path

# Load HuggingFace model from local cache
os.environ.setdefault("HF_HUB_OFFLINE", "1")

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))
from app.core.config import settings

def get_vector_store(reset: bool = False):
    embeddings = HuggingFaceEmbeddings(
        model_name=settings.embedding_model_name,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )

    if reset and Path(settings.chroma_persist_dir).exists():
        import shutil
        shutil.rmtree(settings.chroma_persist_dir, ignore_errors=True)
        print("🗑️ Existing ChromaDB storage cleared.")

    return Chroma(
        collection_name="medilens_knowledge",
        embedding_function=embeddings,
        persist_directory=settings.chroma_persist_dir
    )

def ingest_pdf(pdf_path: Path, vector_store: Chroma, splitter: RecursiveCharacterTextSplitter, max_pages: int = None):
    """
    Standard LangChain PDF ingestion:
    PyPDFLoader -> RecursiveCharacterTextSplitter -> Chroma.add_documents
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
    print(f"  Split into {len(chunks)} chunks.")

    # Add to Chroma vector store
    print(f"  Embedding and indexing into ChromaDB...")
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        vector_store.add_documents(chunks[i:i+batch_size])
        print(f"  Indexed chunks {min(i+batch_size, len(chunks))}/{len(chunks)}...", flush=True)

    print(f"  ✅ Successfully indexed {pdf_path.name}")
    return len(chunks)

def main():
    parser = argparse.ArgumentParser(description="MediLens LangChain PDF Ingestion Engine")
    parser.add_argument("--pdf", type=str, default=None, help="Path to PDF. Defaults to scanning backend/data/")
    parser.add_argument("--reset", action="store_true", help="Clear existing ChromaDB collection first")
    parser.add_argument("--max-pages", type=int, default=None, help="Limit number of pages to index (useful for fast testing)")
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
            ingest_pdf(pdf, vector_store, splitter, max_pages=args.max_pages)
        else:
            print(f"File not found: {pdf}")

    print(f"\n🎉 Ingestion Complete! Total documents in vector store: {vector_store._collection.count()}")

if __name__ == "__main__":
    main()
