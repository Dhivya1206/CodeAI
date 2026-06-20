# ArchitectAI — Complete Codebase Explanation

> Every file, every function, every data flow — explained from start to end.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Folder Structure](#2-folder-structure)
3. [Complete Data Flow](#3-complete-data-flow)
4. [Backend — Core Layer](#4-backend--core-layer)
5. [Backend — Agent Layer](#5-backend--agent-layer)
6. [Backend — API Layer (main.py)](#6-backend--api-layer-mainpy)
7. [Frontend — Entry Point](#7-frontend--entry-point)
8. [Frontend — API Client](#8-frontend--api-client)
9. [Frontend — Components](#9-frontend--components)
10. [How All Pieces Connect](#10-how-all-pieces-connect)
11. [Rate Limiting Explained](#11-rate-limiting-explained)

---

## 1. System Overview

ArchitectAI is a full-stack AI developer platform. You upload any codebase (files, folders, ZIP), and the system:

- Parses and indexes every file
- Stores code chunks in a vector database for semantic search
- Uses **Gemini 2.5 Flash** to explain, analyze, document, and review the code
- Streams all AI responses in real-time to the browser

The system is split into two independent processes:

| Process | Tech | Port |
|---------|------|------|
| Backend API | Python + FastAPI | 8000 |
| Frontend UI | React + Vite | 3000 |

---

## 2. Folder Structure

```
architectai/
├── backend/
│   ├── main.py                  ← FastAPI app, all HTTP routes
│   ├── .env                     ← GEMINI_API_KEY lives here
│   ├── requirements.txt         ← Python dependencies
│   ├── core/
│   │   ├── gemini_client.py     ← Gemini API wrapper + rate limiter
│   │   ├── vector_store.py      ← ChromaDB vector database
│   │   └── orchestrator.py      ← In-memory session state
│   └── agents/
│       ├── ingestion.py         ← File parsing, chunking, metadata
│       ├── code_intelligence.py ← Per-file AI explanation
│       ├── architecture.py      ← System design analysis
│       ├── documentation.py     ← README/API docs generator
│       ├── chat.py              ← RAG-powered chat assistant
│       └── review.py            ← Code quality scoring
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx             ← React entry point
        ├── App.tsx              ← Root component, tab routing
        ├── index.css            ← Global styles + glass effects
        ├── vite-env.d.ts        ← TypeScript env type declarations
        ├── lib/
        │   └── api.ts           ← All fetch calls to backend
        └── components/
            ├── Dashboard.tsx        ← Upload screen
            ├── FileExplorer.tsx     ← File tree + AI explanation
            ├── ArchitectureView.tsx ← Architecture analysis UI
            ├── DocumentationStudio.tsx ← Doc generator UI
            ├── ChatPanel.tsx        ← Streaming chat UI
            └── ImprovementCenter.tsx ← Code review UI
```

---

## 3. Complete Data Flow

This is the full journey from "user drops a file" to "AI explanation appears on screen":

```
USER drops file(s) on Dashboard
        │
        ▼
[Frontend] Dashboard.tsx
  handleFiles() → calls uploadFiles() in api.ts
        │
        ▼
[HTTP] POST /api/upload  (multipart/form-data)
        │
        ▼
[Backend] main.py → upload_files()
  - Reads each uploaded file as bytes
  - If .zip → extract_files_from_zip() unpacks it
  - Decodes bytes to UTF-8 strings
  - Calls ingest(session_id, all_files)
        │
        ▼
[Agent] ingestion.py → ingest()
  Step 1: set_files() → saves files to orchestrator session memory
  Step 2: RecursiveCharacterTextSplitter chunks each file (1500 chars, 200 overlap)
  Step 3: store_chunks() → saves chunks to ChromaDB vector store
  Step 4: Calls Gemini with file list + snippets → gets JSON metadata
  Step 5: build_file_tree() → builds nested folder structure
  Step 6: detect_languages() → counts files per language
  Step 7: cache_result() → saves metadata to session cache
        │
        ▼
[HTTP Response] { session_id, metadata }
        │
        ▼
[Frontend] App.tsx
  setSessionId(id) → hides Dashboard, shows main workspace
  setMetadata(meta) → passes file tree + project info to components
        │
        ▼
USER clicks a file in FileExplorer
        │
        ▼
[Frontend] FileExplorer.tsx → handleSelect()
  Calls streamExplain(sessionId, filePath, level)
        │
        ▼
[HTTP] GET /api/explain/{session_id}?file_path=...&level=...&stream=true
        │
        ▼
[Backend] main.py → explain()
  Returns StreamingResponse wrapping explain_file_stream()
        │
        ▼
[Agent] code_intelligence.py → explain_file_stream()
  - Gets file content from orchestrator memory
  - Builds prompt based on level (beginner/intermediate/senior)
  - Calls stream_response() in gemini_client.py
  - Yields text chunks as they arrive from Gemini
        │
        ▼
[HTTP] text/event-stream (Server-Sent Events)
        │
        ▼
[Frontend] FileExplorer.tsx
  ReadableStream reader receives chunks
  setExplanation(prev => prev + chunk) → text appears word by word
```

---

## 4. Backend — Core Layer

### `core/gemini_client.py`

The central AI engine. Every agent goes through this file to talk to Gemini.

**Key constants:**
```python
MODEL = "models/gemini-2.5-flash"   # locked to this model everywhere
_RPM_LIMIT = 4                       # max 4 requests per 60 seconds
_WINDOW = 60.0                       # sliding window in seconds
```

**`_wait_for_slot()`** — Rate limiter (token bucket algorithm):
- Keeps a list `_last_calls` of timestamps of recent API calls
- Before every Gemini call, it checks: "have we made 4+ calls in the last 60 seconds?"
- If yes → calculates how long to sleep → calls `time.sleep()`
- This prevents the free tier quota error (5 req/min limit)

**`init_gemini()`** — Called once at server startup:
- Reads `GEMINI_API_KEY` from environment
- Validates it's not the placeholder value
- Calls `genai.configure()` to authenticate

**`stream_response(prompt)`** — For streaming endpoints:
- Waits for a rate limit slot
- Calls `model.generate_content(prompt, stream=True)`
- `asyncio.to_thread()` runs the blocking SDK call in a thread pool so FastAPI stays async
- `yield chunk.text` sends each piece of text as it arrives

**`generate(prompt)`** — For non-streaming endpoints:
- Same rate limiting
- Returns the complete response text at once
- `json_mode=True` appends "Respond ONLY with valid JSON" to the prompt

---

### `core/vector_store.py`

Semantic memory for the chat agent. Uses ChromaDB (an in-memory vector database).

**How it works:**
- ChromaDB converts text chunks into numerical vectors (embeddings)
- Similar text has similar vectors — so "what does the login function do?" finds chunks about authentication even if the word "login" isn't in the chunk

**`store_chunks(session_id, file_path, chunks)`:**
- Creates a ChromaDB collection named `session_{id}` (one per upload session)
- Each chunk gets an MD5 hash as its ID (prevents duplicates on re-upload)
- Stores chunk text + metadata (which file it came from, chunk index)

**`query(session_id, question, n=8)`:**
- Converts the question to a vector
- Finds the 8 most semantically similar chunks across all stored files
- Returns those chunks as strings — used as context for the chat agent

**`clear_session(session_id)`:**
- Deletes the collection when done (cleanup)

---

### `core/orchestrator.py`

In-memory session state. Think of it as a dictionary that holds everything about an active upload session.

**`SessionState` dataclass:**
```python
session_id: str
files: Dict[str, str]          # "path/to/file.py" → "file content..."
metadata: Dict[str, Any]       # ingestion output (file tree, languages, etc.)
analysis_cache: Dict[str, Any] # cached Gemini results (architecture, review, etc.)
```

**Why cache?** Gemini calls are slow and rate-limited. If you click "Architecture" twice, the second time returns instantly from cache instead of calling Gemini again.

**Key functions:**
- `get_session(id)` — creates session if it doesn't exist, returns it
- `set_files(id, files)` — stores the uploaded file contents
- `get_files(id)` — retrieves file contents for agents to read
- `cache_result(id, key, value)` — saves a Gemini result
- `get_cached(id, key)` — retrieves a cached result (returns None if not cached)

---

## 5. Backend — Agent Layer

### `agents/ingestion.py`

The first agent that runs after every upload. It prepares everything for the other agents.

**`SUPPORTED_EXTS`** — Set of file extensions the system accepts. Files with other extensions are silently ignored.

**`LANG_MAP`** — Maps file extensions to human-readable language names for the UI.

**`extract_files_from_zip(data: bytes)`:**
- Opens the ZIP from memory (no disk write)
- Skips `__pycache__` and `.git/` directories (noise)
- Decodes each file to UTF-8 string
- Returns `{filename: content}` dict

**`build_file_tree(files)`:**
- Takes flat dict of paths like `{"src/utils/helper.py": "..."}`
- Builds nested dict structure representing folder hierarchy
- Converts to list of `{name, path, type, children?}` objects
- This is what the frontend FileExplorer renders as the clickable tree

**`ingest(session_id, files)`** — Main function, runs 7 steps:
1. Save files to orchestrator memory
2. Split each file into 1500-char chunks with 200-char overlap (overlap preserves context at boundaries)
3. Store chunks in ChromaDB for later RAG queries
4. Send file list + first 400 chars of each file to Gemini → get JSON with project_type, frameworks, description, etc.
5. Build the file tree
6. Count languages
7. Cache everything and return metadata to the API

---

### `agents/code_intelligence.py`

Explains individual files. Called every time a user clicks a file in the explorer.

**`LEVEL_PROMPTS`** — Three different instruction sets:
- `beginner`: "Use simple language, analogies, avoid jargon"
- `intermediate`: "Cover patterns and data flow"
- `senior`: "Cover architecture decisions, edge cases, trade-offs"

**`_build_prompt(path, content, level)`:**
- Combines the level instruction with the file content (truncated to 8000 chars)
- Asks Gemini to cover: purpose, classes/functions, data flow, algorithms, dependencies, ML logic

**`explain_file_stream()`** — Streaming version, used by the main endpoint. Yields text chunks for real-time display.

**`explain_file()`** — Non-streaming version, returns complete text. Used when `stream=false`.

---

### `agents/architecture.py`

Analyzes the entire codebase structure in one Gemini call.

**What it does:**
- Takes first 300 chars of up to 30 files as a "snapshot"
- Sends to Gemini with a structured JSON prompt
- Gemini identifies: app type, design patterns, system layers, data flow, ML pipeline, API surface, component dependencies

**Caching:** Result is cached after first call. Switching to the Architecture tab a second time is instant.

**Output JSON shape:**
```json
{
  "app_type": "REST API + React SPA",
  "design_patterns": ["Repository Pattern", "Agent Pattern"],
  "layers": [{"name": "API Layer", "description": "...", "files": ["main.py"]}],
  "data_flow": "User uploads → ingestion → vector store → Gemini → response",
  "ml_pipeline": null,
  "dependencies": [{"from": "chat.py", "to": "vector_store.py", "reason": "RAG queries"}],
  "overview": "..."
}
```

---

### `agents/documentation.py`

Generates three types of documentation on demand.

**`generate_docs(session_id, doc_type)`:**
- Pulls cached metadata and architecture analysis
- Takes first 500 chars of up to 20 files as context
- Builds a different prompt for each doc type:
  - `readme` → enterprise-style README with installation, usage, architecture
  - `onboarding` → developer guide explaining folder structure and how to contribute
  - `api` → lists all public endpoints/functions with parameters and examples
- Returns raw Markdown string

---

### `agents/chat.py`

The RAG-powered conversational assistant. Most complex agent.

**RAG = Retrieval Augmented Generation:**
Instead of sending the entire codebase to Gemini (too large), it:
1. Converts the user's question to a vector
2. Finds the 8 most relevant code chunks from ChromaDB
3. Injects those chunks into the Gemini prompt as context
4. Gemini answers based on actual code, not hallucination

**`chat_stream(session_id, question, history)`:**
- `query(session_id, question, n=8)` → retrieves relevant chunks
- Last 6 conversation turns are included for multi-turn context
- System prompt includes project description and architecture overview
- Full prompt structure:
  ```
  [System: You are ArchitectAI, expert on this codebase...]
  [Relevant Code Context: chunk1, chunk2, ...]
  [Conversation History: USER: ..., ASSISTANT: ...]
  USER: {question}
  ASSISTANT:
  ```
- Streams response chunks back to frontend

---

### `agents/review.py`

Behaves like a senior code reviewer. Two modes: whole codebase or single file.

**`review_codebase(session_id)`:**
- Takes first 600 chars of up to 20 files
- Asks Gemini to return structured JSON with scores and issues
- Output includes: quality_score (0-100), maintainability_score, performance_risk, security_risk, technical_debt, list of issues with severity + suggestions, refactor suggestions, optimization strategies

**`review_file(session_id, file_path)`:**
- Sends up to 6000 chars of a single file
- Returns per-file scores, specific issues with line hints, strengths, and improvements

**Caching:** Whole-codebase review is cached. Per-file reviews are not (they're fast and specific).

---

## 6. Backend — API Layer (`main.py`)

The FastAPI application. Defines all HTTP endpoints and wires agents together.

**Startup sequence:**
```python
load_dotenv()          # loads .env file into os.environ
init_gemini()          # validates API key, configures SDK
```

**CORS middleware** — Allows the React frontend (port 3000) to call the API (port 8000). `allow_origins=["*"]` means any origin is accepted (fine for local dev).

**Endpoints summary:**

| Method | Path | Agent Called | Response Type |
|--------|------|-------------|---------------|
| POST | `/api/upload` | ingestion.ingest() | JSON |
| GET | `/api/explain/{id}` | code_intelligence.explain_file_stream() | SSE Stream |
| GET | `/api/architecture/{id}` | architecture.analyze_architecture() | JSON |
| GET | `/api/docs/{id}` | documentation.generate_docs() | JSON |
| POST | `/api/chat/{id}` | chat.chat_stream() | SSE Stream |
| GET | `/api/review/{id}` | review.review_codebase() | JSON |
| GET | `/api/review/{id}/file` | review.review_file() | JSON |
| GET | `/health` | — | JSON |

**StreamingResponse** — Used for explain and chat endpoints. FastAPI wraps the async generator and sends chunks as `text/event-stream` (Server-Sent Events). The browser reads these chunks one by one as they arrive.

---

## 7. Frontend — Entry Point

### `src/main.tsx`
Bootstraps React. Mounts `<App />` into the `#root` div in `index.html`. Wraps in `StrictMode` for development warnings.

### `src/App.tsx`
Root component. Controls two states:
- `sessionId` — null until a file is uploaded. When null, shows Dashboard. When set, shows the workspace.
- `activeTab` — which of the 5 views is currently visible

**Tab routing** — No React Router. Just conditional rendering:
```tsx
{activeTab === "explorer" && <FileExplorer ... />}
{activeTab === "architecture" && <ArchitectureView ... />}
// etc.
```

**Sidebar** — 16px-wide icon bar on the left. Each icon button sets `activeTab`. Active tab gets `bg-accent/20 text-accent` highlight.

### `src/index.css`
Global styles built on Tailwind:
- `.glass` — glassmorphism card effect (semi-transparent background + blur + subtle border)
- `.glow` — purple box shadow for the logo
- `.streaming-cursor` — adds a blinking `▋` cursor after text while AI is still generating
- Custom scrollbar styling (thin, dark)

---

## 8. Frontend — API Client (`src/lib/api.ts`)

All HTTP communication lives here. Components never call `fetch` directly.

**`uploadFiles(files)`** — POST with FormData. Wraps the "Failed to fetch" error with a human-readable message pointing to the backend URL.

**`streamExplain(sessionId, filePath, level)`** — Async generator:
```typescript
const res = await fetch(url);
const reader = res.body!.getReader();  // ReadableStream reader
while (true) {
  const { done, value } = await reader.read();  // read next chunk
  if (done) break;
  yield dec.decode(value);  // decode bytes → string, yield to caller
}
```
The `for await` loop in FileExplorer receives each yielded string and appends it to state.

**`streamChat()`** — Same streaming pattern but uses POST with JSON body.

**`getArchitecture()`, `getDocs()`, `getReview()`** — Simple fetch + `.json()`. No streaming needed since these are one-shot responses.

---

## 9. Frontend — Components

### `Dashboard.tsx`
The landing/upload screen. Shown when `sessionId` is null.

- **Drag and drop** — `onDragOver` sets `dragging=true` (changes border color), `onDrop` calls `handleFiles()`
- **Click to browse** — clicking the zone triggers `document.getElementById("file-input").click()` on the hidden `<input type="file">`
- **`handleFiles()`** — converts FileList to Array, calls `uploadFiles()`, on success calls `onSession(id, meta)` which triggers App.tsx to switch views
- **Mode selector** — visual only (buttons change `mode` state but it's not wired to the API yet — designed for future use)

---

### `FileExplorer.tsx`
Two-panel layout: file tree on left, AI explanation on right.

**`TreeItem` component** — Recursive. Renders either:
- A folder button (toggles `open` state to show/hide children)
- A file button (calls `onSelect(path)` when clicked)

**`handleSelect(path)`:**
1. Sets `selected` to highlight the file
2. Clears previous explanation
3. Calls `streamExplain()` in a `for await` loop
4. Each chunk: `setExplanation(prev => prev + chunk)` — text grows in real-time

**Level buttons** — beginner/intermediate/senior. Changing level and clicking "Re-explain" re-runs `handleSelect` with the new level.

**`streaming-cursor` class** — Applied to the explanation div while `loading=true`. Adds the blinking cursor to show AI is still typing.

---

### `ChatPanel.tsx`
Full conversational interface with message history.

**Message state:**
```typescript
interface Message { role: "user" | "assistant"; content: string; }
const [messages, setMessages] = useState<Message[]>([]);
```

**`send(question)`:**
1. Adds user message to state immediately
2. Adds empty assistant message as placeholder
3. Streams response: each chunk updates the last message's content
4. `setMessages(prev => { updated[updated.length-1].content += chunk; return updated; })`

**Auto-scroll** — `useEffect` watches `messages` and calls `bottomRef.current.scrollIntoView()` after every update.

**Suggestion chips** — Pre-written questions shown when chat is empty. Clicking one calls `send()` directly.

**Enter to send** — `onKeyDown` checks `e.key === "Enter" && !e.shiftKey`. Shift+Enter adds a newline instead.

---

### `ArchitectureView.tsx`
Loads architecture data on mount via `useEffect`. Displays:
- Overview text
- App type + design pattern badges
- System layers (name, description, associated files)
- Data flow description
- Component dependency arrows (`from → to: reason`)
- ML pipeline stages (only shown if `ml_pipeline` is not null)

All data comes from the single `GET /api/architecture/{id}` call which is cached on the backend.

---

### `DocumentationStudio.tsx`
On-demand documentation generator. Nothing loads automatically — user must click a doc type button.

**`generate(type)`:**
- Sets loading state
- Calls `getDocs(sessionId, type)`
- Sets content when response arrives
- ReactMarkdown renders the markdown string as formatted HTML

**Export button** — Creates a Blob from the markdown string, creates a temporary `<a>` element, triggers download. No server needed.

---

### `ImprovementCenter.tsx`
Loads review data automatically on mount (like ArchitectureView).

**`ScoreRing` component** — SVG circle with `strokeDasharray` trick:
- Full circle circumference = `2 * π * 26 ≈ 163`
- `strokeDasharray={score/100 * 163}` draws only the filled portion
- `-rotate-90` starts the arc from the top instead of the right
- Color: green ≥75, yellow ≥50, red <50

**Issue cards** — Color-coded by severity using `SEV_COLOR` map:
- critical → red background
- major → yellow background
- minor → blue background

---

## 10. How All Pieces Connect

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│                                                          │
│  Dashboard → FileExplorer → ChatPanel                    │
│           ↘ ArchitectureView                             │
│           ↘ DocumentationStudio                          │
│           ↘ ImprovementCenter                            │
│                    │                                     │
│              api.ts (fetch layer)                        │
└────────────────────┼────────────────────────────────────┘
                     │ HTTP / SSE
┌────────────────────┼────────────────────────────────────┐
│                BACKEND (FastAPI)                         │
│                                                          │
│                  main.py (routes)                        │
│                     │                                    │
│        ┌────────────┼────────────┐                       │
│        ▼            ▼            ▼                       │
│   ingestion    code_intel    architecture                 │
│   chat         documentation  review                     │
│        │            │            │                       │
│        ▼            ▼            ▼                       │
│   orchestrator  vector_store  gemini_client              │
│  (session mem)  (ChromaDB)   (Gemini 2.5 Flash)          │
└─────────────────────────────────────────────────────────┘
```

**Session lifecycle:**
1. User uploads → `session_id` (UUID) created
2. All agents share this ID to read/write session state
3. Files stored in `orchestrator._sessions[id].files`
4. Chunks stored in ChromaDB collection `session_{id}`
5. Gemini results cached in `orchestrator._sessions[id].analysis_cache`
6. Session lives in memory until server restarts (no database persistence)

---

## 11. Rate Limiting Explained

The free Gemini tier allows **5 requests per minute**. The system makes multiple calls during a session (ingestion + architecture + review = 3 calls minimum). Without rate limiting, you'd hit quota errors immediately.

**How `_wait_for_slot()` works:**

```
Timeline: ─────────────────────────────────────────────────▶
Calls:     [1]  [2]  [3]  [4]        [5]  [6]
                                ↑
                         4th call at t=10s
                         _last_calls = [t=0, t=2, t=4, t=10]
                         len == 4 == _RPM_LIMIT
                         oldest call was at t=0
                         must wait until t=60 before 5th call
                         sleep_for = 60 - (10 - 0) + 0.5 = 50.5s
```

`asyncio.to_thread(_wait_for_slot)` runs the blocking `time.sleep()` in a thread pool so it doesn't freeze the entire FastAPI event loop while waiting.

**Practical impact:** If you upload a large project and immediately click Architecture + Review, the second request will wait ~60 seconds. This is expected behavior on the free tier. Upgrading to a paid Gemini API key removes this constraint.
