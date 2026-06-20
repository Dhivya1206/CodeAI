"""Documentation Generator Agent — produces README, API docs, onboarding guide."""
from core.gemini_client import generate
from core.orchestrator import get_files, get_cached

async def generate_docs(session_id: str, doc_type: str = "readme") -> str:
    files = get_files(session_id)
    meta = get_cached(session_id, "metadata") or {}
    arch = get_cached(session_id, "architecture") or {}

    snapshot = "\n\n".join(
        f"### {p}\n{c[:500]}" for p, c in list(files.items())[:20]
    )

    prompts = {
        "readme": f"""Generate a professional README.md for this project.
Include: Project title, description, features, tech stack, installation, usage, architecture overview, contributing.
Make it look like an enterprise open-source project.

Metadata: {meta}
Architecture: {arch}
Code Snapshot:
{snapshot}""",

        "onboarding": f"""Write a developer onboarding guide for this codebase.
Include: Project overview, folder structure explanation, key files to understand first,
how to run locally, how to make changes, testing approach, common patterns used.

Metadata: {meta}
Files: {list(files.keys())}
Code Snapshot:
{snapshot}""",

        "api": f"""Generate API documentation for this codebase.
List all endpoints/functions/classes that form the public interface.
For each: name, purpose, parameters, return value, example usage.

Code Snapshot:
{snapshot}""",
    }

    prompt = prompts.get(doc_type, prompts["readme"])
    return await generate(prompt)
