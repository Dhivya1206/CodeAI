"""Code Ingestion Agent — parses uploads, detects languages, builds metadata."""
import zipfile, io, os, json
from pathlib import Path
from typing import Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from core.vector_store import store_chunks
from core.orchestrator import set_files, cache_result, get_session
from core.gemini_client import generate

SUPPORTED_EXTS = {
    ".py", ".java", ".cpp", ".cc", ".hpp", ".c", ".js", ".ts", ".go",
    ".rs", ".cs", ".ipynb", ".yaml", ".yml", ".json", ".csv", ".txt",
    ".md", ".toml", ".env", ".dockerfile", ".makefile", ".sh"
}

LANG_MAP = {
    ".py": "Python", ".java": "Java", ".cpp": "C++", ".cc": "C++",
    ".hpp": "C++", ".c": "C", ".js": "JavaScript", ".ts": "TypeScript",
    ".go": "Go", ".rs": "Rust", ".cs": "C#", ".ipynb": "Jupyter Notebook",
    ".yaml": "YAML", ".yml": "YAML", ".json": "JSON", ".sh": "Shell",
}

def _is_supported(path: str) -> bool:
    name = Path(path).name.lower()
    ext = Path(path).suffix.lower()
    return ext in SUPPORTED_EXTS or name in {"dockerfile", "makefile", "requirements.txt", ".env"}

def extract_files_from_zip(data: bytes) -> Dict[str, str]:
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for name in zf.namelist():
            if "__pycache__" in name or ".git/" in name:
                continue
            if _is_supported(name):
                try:
                    files[name] = zf.read(name).decode("utf-8", errors="replace")
                except Exception:
                    pass
    return files

def build_file_tree(files: Dict[str, str]) -> list:
    tree = {}
    for path in files:
        parts = Path(path).parts
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = None
    return _tree_to_list(tree, "")

def _tree_to_list(node: dict, prefix: str) -> list:
    result = []
    for k, v in sorted(node.items()):
        full = f"{prefix}/{k}".lstrip("/")
        if v is None:
            result.append({"name": k, "path": full, "type": "file"})
        else:
            result.append({"name": k, "path": full, "type": "folder", "children": _tree_to_list(v, full)})
    return result

def detect_languages(files: Dict[str, str]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for path in files:
        lang = LANG_MAP.get(Path(path).suffix.lower(), "Other")
        counts[lang] = counts.get(lang, 0) + 1
    return counts

async def ingest(session_id: str, files: Dict[str, str]) -> Dict[str, Any]:
    set_files(session_id, files)

    # Chunk and embed all files into vector store
    splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200)
    for path, content in files.items():
        chunks = splitter.split_text(content)
        if chunks:
            store_chunks(session_id, path, chunks)

    # Build summary metadata via Gemini
    file_list = "\n".join(f"- {p}" for p in list(files.keys())[:60])
    snippet = "\n\n".join(
        f"### {p}\n{c[:400]}" for p, c in list(files.items())[:10]
    )
    prompt = f"""Analyze this codebase and return JSON with keys:
"project_type", "primary_language", "frameworks", "entry_points", "description", "tech_stack".

Files:
{file_list}

Snippets:
{snippet}"""

    raw = await generate(prompt, json_mode=True)
    try:
        meta = json.loads(raw)
    except Exception:
        meta = {"description": raw}

    meta["file_tree"] = build_file_tree(files)
    meta["languages"] = detect_languages(files)
    meta["total_files"] = len(files)

    cache_result(session_id, "metadata", meta)
    return meta
