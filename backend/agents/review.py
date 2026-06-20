"""Improvement & Review Agent — code quality scoring and refactor suggestions."""
import json
from core.gemini_client import generate
from core.orchestrator import get_files, get_cached, cache_result

async def review_codebase(session_id: str) -> dict:
    cached = get_cached(session_id, "review")
    if cached:
        return cached

    files = get_files(session_id)
    snapshot = "\n\n".join(
        f"### {p}\n{c[:600]}" for p, c in list(files.items())[:20]
    )

    prompt = f"""You are a Senior Code Reviewer. Analyze this codebase and return JSON:
{{
  "quality_score": 0-100,
  "maintainability_score": 0-100,
  "performance_risk": "low|medium|high",
  "security_risk": "low|medium|high",
  "technical_debt": "low|medium|high",
  "issues": [
    {{"severity": "critical|major|minor", "file": "...", "description": "...", "suggestion": "..."}}
  ],
  "refactor_suggestions": ["..."],
  "optimization_strategies": ["..."],
  "ml_issues": ["..."] or [],
  "summary": "2-3 sentence overall assessment"
}}

Code:
{snapshot}"""

    raw = await generate(prompt, json_mode=True)
    try:
        result = json.loads(raw)
    except Exception:
        result = {"summary": raw, "quality_score": 0, "issues": []}

    cache_result(session_id, "review", result)
    return result

async def review_file(session_id: str, file_path: str) -> dict:
    files = get_files(session_id)
    content = files.get(file_path, "")
    if not content:
        return {"error": "File not found"}

    prompt = f"""Review this file as a senior engineer. Return JSON:
{{
  "quality_score": 0-100,
  "issues": [{{"line_hint": "...", "severity": "...", "description": "...", "fix": "..."}}],
  "strengths": ["..."],
  "improvements": ["..."],
  "summary": "..."
}}

File: {file_path}
```
{content[:6000]}
```"""

    raw = await generate(prompt, json_mode=True)
    try:
        return json.loads(raw)
    except Exception:
        return {"summary": raw, "quality_score": 0, "issues": []}
