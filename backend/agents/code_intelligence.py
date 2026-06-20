"""Code Intelligence Agent — explains individual files at multiple levels."""
from core.gemini_client import stream_response, generate
from core.orchestrator import get_files
from typing import AsyncGenerator

LEVEL_PROMPTS = {
    "beginner": "Explain this code like I'm a beginner developer. Use simple language, analogies, and avoid jargon.",
    "intermediate": "Explain this code for an intermediate developer. Cover what it does, key patterns, and data flow.",
    "senior": "Review this code as a senior engineer. Cover architecture decisions, patterns, edge cases, and trade-offs.",
}

def _build_prompt(path: str, content: str, level: str) -> str:
    instruction = LEVEL_PROMPTS.get(level, LEVEL_PROMPTS["intermediate"])
    return f"""{instruction}

File: {path}

```
{content[:8000]}
```

Cover:
1. Purpose of this file
2. Main classes/functions and their roles
3. Data flow (input → processing → output)
4. Key algorithms or logic
5. Dependencies and what they're used for
6. Any ML/AI logic if present"""

async def explain_file_stream(session_id: str, file_path: str, level: str = "intermediate") -> AsyncGenerator[str, None]:
    files = get_files(session_id)
    content = files.get(file_path, "")
    if not content:
        yield "File not found in session."
        return
    prompt = _build_prompt(file_path, content, level)
    async for chunk in stream_response(prompt):
        yield chunk

async def explain_file(session_id: str, file_path: str, level: str = "intermediate") -> str:
    files = get_files(session_id)
    content = files.get(file_path, "")
    if not content:
        return "File not found."
    prompt = _build_prompt(file_path, content, level)
    return await generate(prompt)
