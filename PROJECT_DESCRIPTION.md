# MediLens: Evidence-Informed Clinical AI & Triage Platform

## Executive Summary
**MediLens** is an end-to-end, full-stack clinical education and symptom triage platform engineered with an agentic, multi-stage architecture. Built using **LangGraph**, **LangChain**, **FastAPI**, and **React 19**, the system moves beyond basic prompt-response chatbots by implementing a cyclical state-graph agent that autonomously orchestrates local vector memory retrieval, real-time clinical web search, multimodal image inspection, and emergency guardrail evaluations.

* **Live Frontend**: [https://medilens-chatbot.vercel.app](https://medilens-chatbot.vercel.app)
* **Live Backend API**: [https://medilens-backend-kbeu.onrender.com](https://medilens-backend-kbeu.onrender.com)
* **GitHub Repository**: [https://github.com/pratiktawhare/MediLens-Chatbot](https://github.com/pratiktawhare/MediLens-Chatbot)

---

## Technical Architecture & Core Pillars

```
                     ┌────────────────────────────────────────┐
                     │   User Input (Text / Image / Voice)    │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │ Intent Classifier & Emergency Guardrail │
                     └───────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
   [Conversational Intent]                              [Clinical Inquiry]
                 │                                               │
                 ▼                                               ▼
     ┌───────────────────────┐                     ┌───────────────────────────┐
     │ Direct Human Response │                     │  LangGraph State Machine  │
     └───────────────────────┘                     └─────────────┬─────────────┘
                                                                 │
                                         ┌───────────────────────┴───────────────────────┐
                                         │                                               │
                                         ▼                                               ▼
                           ┌───────────────────────────┐                   ┌───────────────────────────┐
                           │    ChromaDB Local RAG     │                   │     Tavily Live Web       │
                           │   (3,688 Book Excerpts)   │                   │    Clinical Guidelines    │
                           └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                                         │                                               │
                                         └───────────────────────┬───────────────────────┘
                                                                 │
                                                                 ▼
                                                   ┌───────────────────────────┐
                                                   │ Dual LLM Synthesis Engine │
                                                   │  (Groq Qwen 27B + Gemini) │
                                                   └─────────────┬─────────────┘
                                                                 │
                                                                 ▼
                                                   ┌───────────────────────────┐
                                                   │  Neon Cloud PostgreSQL    │
                                                   │   (Persistent Storage)    │
                                                   └───────────────────────────┘
```

### 1. LangGraph Agentic Workflow & State Orchestration
* **Cyclical State Machine**: Designed an explicit `StateGraph(AgentState)` pipeline managing conversational memory, question context, retrieved document chunks, web evidence, and routed paths.
* **Autonomous Conditional Routing (`route` node)**:
  * Automatically evaluates the semantic confidence score of retrieved local chunks.
  * If local retrieval confidence falls below threshold ($< 0.60$) or if the inquiry explicitly demands contemporary protocols (e.g., *"latest guidelines"*, *"FDA updates"*, *"2025/2026 protocols"*), the graph dynamically diverges to a dedicated live web search node.
* **State Checkpointing**: Leverages an integrated SQLite checkpoint store (`SqliteSaver`) for thread-isolated state serialization, enabling scalable multi-session conversation branching.
* **Conversational Bypass Sub-Graph**: Implemented deterministic intent routing that intercepts casual pleasantries (*"Thank you doctor"*, *"Good morning"*) and short-circuits retrieval, preventing wasted compute, vector noise, and robotic medical templates.

### 2. Advanced Hybrid RAG (Retrieval-Augmented Generation)
* **Local Medical Knowledge Base**: Processed and vectorized a 637-page authoritative medical encyclopedia into **3,688 semantic chunks** using LangChain's `RecursiveCharacterTextSplitter` ($chunk\_size=800$, $chunk\_overlap=150$).
* **Vector Indexing & Embeddings**: Persisted high-dimensional embeddings generated via `sentence-transformers/all-MiniLM-L6-v2` locally within **ChromaDB**, achieving sub-100ms retrieval without paid external vector cloud subscriptions.
* **Hybrid Knowledge Fusion**: Synthesizes historical peer-reviewed literature from ChromaDB alongside dynamic, live clinical guidance pulled via **Tavily Search API**.
* **Traceable Source Attribution**: Every assertion is tied to explicit citation metadata (`document`, `page number`, `match score`, and `external URL`). In the UI, these render as clickable evidence pills linked to a slide-out drawer with one-click bookmarking.

### 3. Multimodal Sensory Perception Pipeline
* **Vision Inspection Engine**: Integrates **Groq Vision (`qwen/qwen3.8-27b`)** with automated fallback to **Google Gemini Vision**. Analyzes base64-encoded user uploads and live webcam captures in $\sim$1.2s to generate objective dermatological observations without diagnostic hallucinations.
* **Voice Speech-to-Text (STT)**: Processes raw audio blobs captured through the browser's `MediaRecorder` API using **Groq Whisper Large v3 Turbo**, returning precise medical transcriptions in under 400ms.
* **Sub-50ms Speech Synthesis (TTS)**: Engineered a client-side audio pipeline utilizing the **Web Speech API (`window.speechSynthesis`)** paired with custom sentence chunking and regex preprocessors. Strips markdown syntax, emojis, and repeated dashes (`---`) to provide instant, natural doctor-like voice narration.

### 4. Full-Stack Engineering & Cloud Data Architecture
* **FastAPI Async Backend**: Built asynchronous REST endpoints in Python 3.12 adhering to strict **Pydantic v2** validation, handling JWT token generation (HMAC-SHA256), bcrypt password hashing, and streaming audio endpoints.
* **Serverless Postgres Persistence**: Integrated **Neon Lakebase PostgreSQL** utilizing **SQLModel** and **Psycopg 3**. Implemented connection pool recycling (`pool_pre_ping=True`, `pool_recycle=300`) to guarantee permanent user account, session, and bookmark retention across free-tier hosting spin-downs.
* **Modern React 19 Frontend**: Developed a reactive single-page application with **Vite 8** and **Tailwind CSS v4**, featuring zero-flicker Light/Dark mode, customized Markdown rendering with clinical spacing, and interactive triage preset cards.
* **Memory Optimization for 512MB RAM**: Prevented cloud container Out-of-Memory (OOM) crashes on Render by replacing runtime PyTorch model invocations during health diagnostics with direct, lightweight SQLite index queries ($< 5ms$, $0MB$ allocated RAM).

---

## Tech Stack Summary

| Layer | Tools & Technologies |
|---|---|
| **Agentic Frameworks** | LangGraph (StateGraph, Memory Checkpointer), LangChain Core |
| **LLMs & Inference** | Groq Cloud (`qwen/qwen3.8-27b`, `whisper-large-v3-turbo`), Google Gemini (`gemini-3.5-flash`) |
| **Vector DB & RAG** | ChromaDB, Sentence-Transformers (`all-MiniLM-L6-v2`), PyPDFLoader, Tavily Search API |
| **Backend & APIs** | Python 3.12, FastAPI, Uvicorn, SQLModel / SQLAlchemy, Pydantic v2, Psycopg 3 |
| **Database & Security** | Neon Lakebase Serverless Postgres, SQLite, JWT (HMAC-SHA256), Passlib (Bcrypt) |
| **Frontend & UI** | React 19, Vite 8, Tailwind CSS v4, Lucide React, Web Speech API, MediaDevices API |
| **Deployment & CI/CD** | Render (Web Service), Vercel (Edge Network), GitHub |

---

## Quantifiable Engineering Highlights

* **Multi-Node Agentic Routing**: Built a 4-node cyclical state graph in LangGraph that dynamically branches between local RAG and live web search based on document confidence thresholds ($< 0.60$).
* **3,688 Indexed Knowledge Chunks**: Ingested and embedded 637 pages of medical reference literature into ChromaDB with sub-100ms semantic similarity retrieval.
* **$\sim$85% Reduction in Voice Latency**: Cut TTS audio delay from $\sim$8,000ms (server-rendered MP3 stream) to $< 50ms$ by transitioning to client-side sentence-queued Web Speech synthesis.
* **Zero Container Memory Crashes**: Solved 512MB RAM cloud container OOM crashes by replacing PyTorch-dependent health checks with direct SQLite table count queries.
* **100% Free-Tier Architecture**: Achieved enterprise-grade full-stack capabilities ($0/month$ operating costs) by combining Groq, Google AI Studio, Neon Free Postgres, Tavily, Render, and Vercel.

---

## Resume Bullet Points (Copy-Ready)

* **Engineered MediLens**, a full-stack clinical education and symptom triage platform utilizing **React 19**, **FastAPI**, **LangGraph**, and **Neon PostgreSQL**.
* **Architected a multi-node cyclical LangGraph StateGraph** that evaluates vector similarity confidence to conditionally route queries between local **ChromaDB vector memory** and real-time **Tavily clinical web search**.
* **Constructed a hybrid RAG pipeline** indexing 3,688 semantic chunks from a 637-page medical volume using `all-MiniLM-L6-v2` embeddings, providing transparent citations with page-level confidence scores.
* **Built multimodal clinical capabilities** supporting live camera capture, **Groq Vision (`qwen3.8-27b`)** image analysis, and **Groq Whisper** voice transcription.
* **Integrated Neon Serverless PostgreSQL** with connection pooling (`pool_pre_ping`, `pool_recycle`), securing permanent persistence for user authentication, chat sessions, and clinical bookmarks across PaaS spin-downs.
* **Optimized memory consumption on 512MB RAM cloud containers**, decoupling vector diagnostic metrics from PyTorch runtimes to eliminate Out-Of-Memory exceptions on health checks.
