const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function uploadFiles(files: File[]): Promise<{ session_id: string; metadata: any }> {
  const form = new FormData();
  files.forEach(f => form.append("files", f));
  
  try {
    const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    if (err.message === "Failed to fetch") {
      throw new Error(`Cannot connect to backend at ${BASE}. Is the server running?`);
    }
    throw err;
  }
}

export async function* streamExplain(
  sessionId: string, filePath: string, level: string
): AsyncGenerator<string> {
  const url = `${BASE}/api/explain/${sessionId}?file_path=${encodeURIComponent(filePath)}&level=${level}&stream=true`;
  const res = await fetch(url);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield dec.decode(value);
  }
}

export async function getArchitecture(sessionId: string): Promise<any> {
  const res = await fetch(`${BASE}/api/architecture/${sessionId}`);
  return res.json();
}

export async function getDocs(sessionId: string, docType: string): Promise<{ content: string }> {
  const res = await fetch(`${BASE}/api/docs/${sessionId}?doc_type=${docType}`);
  return res.json();
}

export async function* streamChat(
  sessionId: string, question: string, history: any[]
): AsyncGenerator<string> {
  const res = await fetch(`${BASE}/api/chat/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield dec.decode(value);
  }
}

export async function getReview(sessionId: string): Promise<any> {
  const res = await fetch(`${BASE}/api/review/${sessionId}`);
  return res.json();
}

export async function getFileReview(sessionId: string, filePath: string): Promise<any> {
  const res = await fetch(`${BASE}/api/review/${sessionId}/file?file_path=${encodeURIComponent(filePath)}`);
  return res.json();
}
