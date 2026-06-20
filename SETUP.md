# Setup & Troubleshooting Guide

## Initial Setup

### 1. Backend Setup

```bash
cd architectai/backend

# Create .env file
cp .env.example .env

# Edit .env and add your Gemini API key:
# GEMINI_API_KEY=your_actual_key_here

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 2. Frontend Setup (in a new terminal)

```bash
cd architectai/frontend

# Create .env file
cp .env.example .env
# (default VITE_API_URL=http://localhost:8000 should work)

# Install dependencies
npm install

# Start dev server
npm run dev
```

You should see:
```
VITE ready in XXX ms
Local: http://localhost:3000/
```

## Troubleshooting "Failed to fetch"

### Check 1: Is the backend running?

Open http://localhost:8000/health in your browser.

You should see: `{"status":"ok"}`

If not:
- Backend isn't running → start it with `uvicorn main:app --reload`
- Port 8000 is taken → use a different port: `uvicorn main:app --reload --port 8001`
  (then update frontend `.env`: `VITE_API_URL=http://localhost:8001`)

### Check 2: GEMINI_API_KEY set?

```bash
cd backend
cat .env
```

Should show: `GEMINI_API_KEY=AIza...`

Get your key at: https://aistudio.google.com/app/apikey

### Check 3: CORS / Network

Open browser DevTools (F12) → Network tab → try uploading a file.

Look for the `/api/upload` request:
- Status 0 / Failed → backend not reachable
- Status 500 → check backend terminal for error logs
- Status 422 → file format issue

### Check 4: Python dependencies

```bash
cd backend
pip list | grep -E "fastapi|google-generativeai|chromadb"
```

Should show all three installed.

### Check 5: Frontend .env

```bash
cd frontend
cat .env
```

Should have: `VITE_API_URL=http://localhost:8000`

After changing `.env`, restart the frontend (`npm run dev`).

## Common Issues

### "No module named 'core'"

You're not in the `backend/` directory. Run:
```bash
cd architectai/backend
uvicorn main:app --reload
```

### "GEMINI_API_KEY not found"

Create `backend/.env`:
```
GEMINI_API_KEY=your_key_here
```

### Port already in use

Backend:
```bash
uvicorn main:app --reload --port 8001
```

Frontend: edit `vite.config.ts`:
```ts
server: { port: 3001 }
```

### Files not uploading

Check backend logs for errors. Common issues:
- File too large (default limit ~10MB)
- Unsupported file type (check `SUPPORTED_EXTS` in `agents/ingestion.py`)
- ZIP extraction failed

## Testing the API Directly

```bash
# Health check
curl http://localhost:8000/health

# Upload a test file
echo "print('hello')" > test.py
curl -X POST http://localhost:8000/api/upload \
  -F "files=@test.py"
```

Should return JSON with `session_id` and `metadata`.
