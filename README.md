# 🩺 MediLens — Clinical Education & Triage AI Platform

An evidence-informed medical consultation and triage platform powered by **LangGraph**, **Groq Fast Inference**, **ChromaDB RAG**, **Tavily Live Web Search**, and **Neon Lakebase Postgres**.

MediLens pairs rapid local vector retrieval against indexed clinical textbooks with live internet guidelines, multimodal sensory inspection (camera, image, and voice), a compassionate human-doctor persona, and permanent cloud database persistence—all on 100% free-tier developer primitives.

---

## 🏗️ System Architecture

```
MediLens - Medical Chatbot/
├── backend/                              # Python 3.12 (managed via uv / venv)
│   ├── .env                              # API Keys & Cloud DATABASE_URL
│   ├── render.yaml                       # Blueprint for 1-click cloud deployment
│   ├── data/
│   │   ├── Medical_book.pdf              # 637-page reference medical volume
│   │   ├── chroma_db/                    # 3,688 pre-indexed vector chunks (committed)
│   │   └── medical_memory.db             # LangGraph SQLite checkpoint storage
│   ├── ingest.py                         # PDF Ingestion script (PyPDF -> MiniLM-L6-v2)
│   └── app/
│       ├── main.py                       # FastAPI application & CORS configuration
│       ├── agent.py                      # LangGraph StateGraph (Retrieve -> Route -> Web -> Answer)
│       ├── core/
│       │   ├── config.py                 # Pydantic environment settings
│       │   └── security.py               # JWT tokens & bcrypt password hashing
│       ├── db/
│       │   ├── database.py               # Dynamic engine (Neon Cloud Postgres / SQLite fallback)
│       │   └── models.py                 # User, ChatSession, ChatMessage, Bookmark
│       ├── services/
│       │   ├── vision_service.py         # Groq Vision (qwen3.8-27b) + Gemini Vision fallback
│       │   ├── rag_service.py            # ChromaDB semantic similarity search
│       │   ├── llm_service.py            # Compassionate doctor persona & prompt templates
│       │   ├── audio_service.py          # Groq Whisper transcription & TTS playback
│       │   └── triage_service.py         # Red-flag emergency symptom detector
│       └── routers/
│           ├── auth.py                   # Register, Login (JWT), Profile
│           ├── chat.py                   # Chat sessions, RAG queries, Citations
│           ├── audio.py                  # Whisper transcription & TTS endpoints
│           └── dashboard.py              # User stats, bookmarks, triage presets
│
└── frontend/                             # Modern React 19 + Vite 8 + Tailwind CSS v4
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx                # Brand, tabs, Light/Dark toggle, auth profile
    │   │   ├── DashboardView.jsx         # System telemetry, metrics, triage presets, history
    │   │   ├── ChatView.jsx              # Consultation feed, Markdown gaps, voice, camera
    │   │   ├── LoginModal.jsx            # High-contrast auth & registration modal
    │   │   └── CitationDrawer.jsx        # Slide-out verified evidence & bookmarking drawer
    │   ├── api.js                        # Axios API client with bearer token interceptor
    │   ├── index.css                     # Tailwind v4 custom dark variant & sleek scrollbars
    │   └── App.jsx                       # Root view router & theme manager
```

---

## 🌟 Key Capabilities

### 1. 🧠 LangGraph Clinical Agent
- Orchestrates multi-step clinical reasoning through a compiled state graph:
  1. **Retrieve**: Searches local ChromaDB vector memory for relevant clinical literature.
  2. **Route**: Evaluates if the query requires live web verification (recent guidelines, WHO/FDA announcements, or low local confidence).
  3. **Web Search**: Queries **Tavily** in real-time to supplement historical book knowledge.
  4. **Answer**: Synthesizes a structured response via **Groq (`qwen/qwen3.8-27b`)** with **Gemini 3.5 Flash** as automated backup.
- **Natural Conversational Bypass**: Everyday greetings (*"Thanks, means a lot"*, *"Hello doctor"*) bypass dense medical RAG and respond warmly in 1–2 human sentences without rigid templates or disclaimers.

### 2. 👁️ Multimodal Sensory Input (Vision & Voice)
- **Groq Vision Primary**: Analyzes user-attached photos (rashes, skin lesions, swelling) using `qwen/qwen3.8-27b` in ~1.2s, extracting objective visual observations.
- **Live Camera Capture**: Integrated webcam/mobile camera modal allowing instant photo capture.
- **Groq Whisper Large v3 Turbo**: High-accuracy speech-to-text transcription for describing symptoms verbally.
- **Audio TTS**: Reads out consultation responses in audio playback for accessibility.

### 3. 📚 Dual Knowledge RAG with Verified Citations
- **ChromaDB Local Vector DB**: Contains 3,688 indexed chunks from a 637-page medical volume embedded with `all-MiniLM-L6-v2`.
- **Tavily Live Web Search**: Real-time supplementary web evidence.
- **Interactive Citation Drawer**: Clicking any citation pill opens a dedicated side drawer with full source text, match confidence percentage, book page number, and one-click bookmarking.

### 4. ☁️ Permanent Cloud Data with Neon Lakebase Postgres
- Cloud-persisted user authentication, encrypted passwords, consultation chat histories, and saved medical bookmarks stored in **Neon Serverless Postgres**.
- Uses pooled database connections with automatic pre-ping and recycle to survive free-tier hosting spin-downs without data loss.

### 5. 🎨 Clinical Light & Dark Design System
- Built with Tailwind CSS v4, supporting full Light Mode (crisp clinical slate & teal) and Dark Mode (deep navy & slate).
- **Spacious Markdown Formatting**: Headers, bullet points, and paragraphs are formatted with comfortable reading gaps for clarity.
- **Triage Presets & Starters**: Immediate access to common evaluations (*Acute Fever*, *Chest Discomfort*, *Tension Headache*, *Skin Check*).

---

## 🚀 Quickstart Guide

### 1. Clone & Configure Environment
Clone the repository:
```bash
git clone https://github.com/your-username/medilens-medical-chatbot.git
cd medilens-medical-chatbot
```

Create your `backend/.env` file:
```env
# Database: Neon Serverless Postgres (or leave unset for local SQLite fallback)
DATABASE_URL=postgresql://user:password@ep-your-branch.aws.neon.tech/neondb?sslmode=require

# Free Groq key (Primary Reasoning, Vision & Whisper): https://console.groq.com
GROQ_API_KEY=gsk_...
GROQ_MODEL=qwen/qwen3.8-27b

# Free Google Gemini key (Multimodal & LLM Backup): https://aistudio.google.com
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.5-flash

# Free Tavily key (Real-time Clinical Web Search): https://tavily.com
TAVILY_API_KEY=tvly-...

# Security & CORS
JWT_SECRET=your-secure-random-jwt-secret-key-32-chars
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 2. Set Up the Backend
Using Python 3.12:
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

*(Note: The ChromaDB vector database is pre-indexed in `backend/data/chroma_db/`, so you do not need to re-index unless adding new PDFs.)*

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation: **http://127.0.0.1:8000/docs**

### 3. Set Up the Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at **http://localhost:5173**

---

## 🌐 Production Deployment

### Backend (Render Web Service)
1. Link your GitHub repository to [Render](https://render.com).
2. Create a new **Web Service** with:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add the following **Environment Variables**:
   - `DATABASE_URL`: Your Neon pooled Postgres connection string
   - `GROQ_API_KEY`: Your Groq API key
   - `GEMINI_API_KEY`: Your Gemini API key
   - `TAVILY_API_KEY`: Your Tavily API key
   - `JWT_SECRET`: Random 32+ character string
   - `CORS_ORIGINS`: `*` (or your frontend domain)

### Frontend (Vercel)
1. Import your repository into [Vercel](https://vercel.com).
2. Set:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
3. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-service.onrender.com/api`
4. Click **Deploy**.

---

## ⚖️ Clinical Disclaimer
MediLens is designed strictly for **educational and informational triage purposes**. It does not provide definitive medical diagnoses, write prescription drug orders, or replace the clinical judgment of licensed healthcare professionals. In case of acute or life-threatening symptoms, immediately contact emergency services (911 / 112).

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
