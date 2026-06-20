"""Architecture Intelligence Agent — infers system design from the codebase."""
import json
from core.gemini_client import generate
from core.orchestrator import get_files, get_cached, cache_result

async def analyze_architecture(session_id: str) -> dict:
    cached = get_cached(session_id, "architecture")
    if cached:
        return cached

    files = get_files(session_id)
    # Build a representative snapshot (paths + first 300 chars each)
    snapshot = "\n\n".join(
        f"### {p}\n{c[:300]}" for p, c in list(files.items())[:30]
    )
    file_list = "\n".join(f"- {p}" for p in files.keys())

    prompt = f"""You are a Staff Software Architect. Analyze this codebase and return JSON with:
{{
  "app_type": "...",
  "design_patterns": ["..."],
  "layers": [{{"name": "...", "description": "...", "files": ["..."]}}],
  "data_flow": "step-by-step description",
  "ml_pipeline": null or {{"stages": ["..."], "framework": "..."}},
  "api_surface": ["endpoint descriptions"],
  "dependencies": [{{"from": "...", "to": "...", "reason": "..."}}],
  "overview": "2-3 sentence system overview",
  "component_descriptions": [{{"name": "...", "role": "..."}}]
}}

Files:
{file_list}

Code Snapshot:
{snapshot}"""

    raw = await generate(prompt, json_mode=True)
    try:
        result = json.loads(raw)
    except Exception:
        result = {"overview": raw, "layers": [], "design_patterns": []}

    cache_result(session_id, "architecture", result)
    return result
