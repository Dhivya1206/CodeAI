# ArchitectAI — Universal Code Intelligence Platform

Powered by **Gemini 2.5 Flash** across all 7 AI agents.

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env          # add your GEMINI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # opens at http://localhost:3000
```

## Architecture

```
Upload (ZIP/files)
    ↓
Ingestion Agent  →  Language detection, file tree, chunking
    ↓
Vector Store (ChromaDB)  ←→  Gemini 2.5 Flash
    ↓
┌─────────────────────────────────────────┐
│  Code Intelligence  │  Architecture     │
│  Documentation      │  Chat (RAG)       │
│  Review & Scoring   │                   │
└─────────────────────────────────────────┘
    ↓
React Frontend (streaming UI)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload files/ZIP, returns session_id |
| GET | `/api/explain/{session_id}` | Stream file explanation |
| GET | `/api/architecture/{session_id}` | Architecture analysis |
| GET | `/api/docs/{session_id}` | Generate documentation |
| POST | `/api/chat/{session_id}` | Stream chat response |
| GET | `/api/review/{session_id}` | Code quality review |

## Supported File Types

`.py` `.js` `.ts` `.java` `.go` `.rs` `.cpp` `.c` `.cs` `.ipynb` `.yaml` `.json` `.csv` `.md` `Dockerfile` `requirements.txt` and more.
