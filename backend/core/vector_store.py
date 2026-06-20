import chromadb
from chromadb.utils import embedding_functions
import hashlib
from typing import List

_client = chromadb.Client()
_ef = embedding_functions.DefaultEmbeddingFunction()

def _collection(session_id: str):
    return _client.get_or_create_collection(
        name=f"session_{session_id}",
        embedding_function=_ef
    )

def store_chunks(session_id: str, file_path: str, chunks: List[str]):
    col = _collection(session_id)
    ids = [hashlib.md5(f"{file_path}:{i}:{c[:50]}".encode()).hexdigest() for i, c in enumerate(chunks)]
    col.upsert(
        ids=ids,
        documents=chunks,
        metadatas=[{"file": file_path, "chunk": i} for i in range(len(chunks))]
    )

def query(session_id: str, question: str, n: int = 8) -> List[str]:
    col = _collection(session_id)
    if col.count() == 0:
        return []
    results = col.query(query_texts=[question], n_results=min(n, col.count()))
    return results["documents"][0] if results["documents"] else []

def clear_session(session_id: str):
    try:
        _client.delete_collection(f"session_{session_id}")
    except Exception:
        pass
