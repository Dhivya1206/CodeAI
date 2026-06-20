"""AI Architect Chat Agent — RAG-powered conversational assistant."""
from core.gemini_client import stream_response
from core.vector_store import query
from core.orchestrator import get_files, get_cached
from typing import AsyncGenerator, List, Dict

async def chat_stream(
    session_id: str,
    question: str,
    history: List[Dict[str, str]]
) -> AsyncGenerator[str, None]:
    # Retrieve relevant chunks from vector store
    chunks = query(session_id, question, n=8)
    context_text = "\n\n---\n\n".join(chunks) if chunks else ""

    # Build conversation history string
    history_str = ""
    for turn in history[-6:]:  # last 6 turns
        role = turn.get("role", "user")
        history_str += f"\n{role.upper()}: {turn.get('content', '')}"

    meta = get_cached(session_id, "metadata") or {}
    arch = get_cached(session_id, "architecture") or {}

    system = f"""You are ArchitectAI, an expert AI coding assistant with deep knowledge of this codebase.
Project: {meta.get('description', 'Unknown project')}
Type: {meta.get('project_type', '')} | Stack: {meta.get('tech_stack', '')}
Architecture: {arch.get('overview', '')}

Answer questions based on the actual code. Be precise, cite file names when relevant.
If asked to explain, be thorough. If asked to improve, give concrete suggestions."""

    context_block = f"\n\nRELEVANT CODE CONTEXT:\n{context_text}" if context_text else ""
    history_block = f"\n\nCONVERSATION HISTORY:{history_str}" if history_str else ""

    prompt = f"{system}{context_block}{history_block}\n\nUSER: {question}\n\nASSISTANT:"

    async for chunk in stream_response(prompt):
        yield chunk
