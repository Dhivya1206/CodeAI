import uuid, os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

from core.gemini_client import init_gemini
from agents.ingestion import ingest, extract_files_from_zip
from agents.code_intelligence import explain_file_stream, explain_file
from agents.architecture import analyze_architecture
from agents.documentation import generate_docs
from agents.chat import chat_stream
from agents.review import review_codebase, review_file

app = FastAPI(title="ArchitectAI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_gemini()

# ── Upload ──────────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    session_id = str(uuid.uuid4())
    all_files: Dict[str, str] = {}

    for upload in files:
        data = await upload.read()
        if upload.filename.endswith(".zip"):
            all_files.update(extract_files_from_zip(data))
        else:
            try:
                all_files[upload.filename] = data.decode("utf-8", errors="replace")
            except Exception:
                pass

    if not all_files:
        raise HTTPException(400, "No supported files found.")

    meta = await ingest(session_id, all_files)
    return {"session_id": session_id, "metadata": meta}

# ── File Explanation ────────────────────────────────────────────────────────

@app.get("/api/explain/{session_id}")
async def explain(session_id: str, file_path: str, level: str = "intermediate", stream: bool = True):
    if stream:
        return StreamingResponse(
            explain_file_stream(session_id, file_path, level),
            media_type="text/event-stream"
        )
    result = await explain_file(session_id, file_path, level)
    return {"explanation": result}

# ── Architecture ────────────────────────────────────────────────────────────

@app.get("/api/architecture/{session_id}")
async def architecture(session_id: str):
    return await analyze_architecture(session_id)

# ── Documentation ───────────────────────────────────────────────────────────

@app.get("/api/docs/{session_id}")
async def documentation(session_id: str, doc_type: str = "readme"):
    content = await generate_docs(session_id, doc_type)
    return {"content": content, "doc_type": doc_type}

# ── Chat ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[Dict[str, str]]] = []

@app.post("/api/chat/{session_id}")
async def chat(session_id: str, req: ChatRequest):
    return StreamingResponse(
        chat_stream(session_id, req.question, req.history or []),
        media_type="text/event-stream"
    )

# ── Review ──────────────────────────────────────────────────────────────────

@app.get("/api/review/{session_id}")
async def review(session_id: str):
    return await review_codebase(session_id)

@app.get("/api/review/{session_id}/file")
async def review_single(session_id: str, file_path: str):
    return await review_file(session_id, file_path)

# ── Health ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}
