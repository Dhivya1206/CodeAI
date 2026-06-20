"""Session state and agent orchestration."""
from dataclasses import dataclass, field
from typing import Dict, Any

_sessions: Dict[str, "SessionState"] = {}

@dataclass
class SessionState:
    session_id: str
    files: Dict[str, str] = field(default_factory=dict)       # path -> content
    metadata: Dict[str, Any] = field(default_factory=dict)    # ingestion output
    analysis_cache: Dict[str, Any] = field(default_factory=dict)

def get_session(session_id: str) -> SessionState:
    if session_id not in _sessions:
        _sessions[session_id] = SessionState(session_id=session_id)
    return _sessions[session_id]

def set_files(session_id: str, files: Dict[str, str]):
    s = get_session(session_id)
    s.files = files

def get_files(session_id: str) -> Dict[str, str]:
    return get_session(session_id).files

def cache_result(session_id: str, key: str, value: Any):
    get_session(session_id).analysis_cache[key] = value

def get_cached(session_id: str, key: str) -> Any:
    return get_session(session_id).analysis_cache.get(key)
