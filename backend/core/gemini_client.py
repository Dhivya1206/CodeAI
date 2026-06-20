import google.generativeai as genai
import os, asyncio, time
from typing import AsyncGenerator

MODEL = "models/gemini-2.5-flash"

# Simple token bucket — free tier = 5 req/min
_last_calls: list[float] = []
_RPM_LIMIT = 4          # stay under 5 to be safe
_WINDOW = 60.0

def _wait_for_slot():
    """Block until we're under the rate limit."""
    now = time.monotonic()
    # drop calls older than 60s
    while _last_calls and now - _last_calls[0] > _WINDOW:
        _last_calls.pop(0)
    if len(_last_calls) >= _RPM_LIMIT:
        sleep_for = _WINDOW - (now - _last_calls[0]) + 0.5
        if sleep_for > 0:
            time.sleep(sleep_for)
        # re-clean after sleeping
        now = time.monotonic()
        while _last_calls and now - _last_calls[0] > _WINDOW:
            _last_calls.pop(0)
    _last_calls.append(time.monotonic())

def init_gemini():
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key or api_key == "your_gemini_api_key_here":
        raise RuntimeError(
            "\n\n❌ GEMINI_API_KEY not set!\n"
            "   1. Open architectai/backend/.env\n"
            "   2. Replace 'your_gemini_api_key_here' with your real key\n"
            "   3. Get a free key at: https://aistudio.google.com/app/apikey\n"
        )
    genai.configure(api_key=api_key)

def get_model() -> genai.GenerativeModel:
    return genai.GenerativeModel(MODEL)

async def stream_response(prompt: str, context: str = "") -> AsyncGenerator[str, None]:
    await asyncio.to_thread(_wait_for_slot)
    model = get_model()
    full_prompt = f"{context}\n\n{prompt}" if context else prompt
    response = await asyncio.to_thread(
        lambda: model.generate_content(full_prompt, stream=True)
    )
    for chunk in response:
        if chunk.text:
            yield chunk.text

async def generate(prompt: str, context: str = "", json_mode: bool = False) -> str:
    await asyncio.to_thread(_wait_for_slot)
    model = get_model()
    full_prompt = f"{context}\n\n{prompt}" if context else prompt
    if json_mode:
        full_prompt += "\n\nRespond ONLY with valid JSON, no markdown fences."
    response = await asyncio.to_thread(
        lambda: model.generate_content(full_prompt)
    )
    return response.text
