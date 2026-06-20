import { useState, useCallback } from "react";
import { Brain, Upload, Loader2, Sparkles } from "lucide-react";
import { uploadFiles } from "../lib/api";

interface Props {
  onSession: (id: string, meta: any) => void;
}

const MODES = ["Quick Explanation", "Architecture Analysis", "Deep Intelligence", "Explain Like Beginner", "Senior Engineer Review"];

export default function Dashboard({ onSession }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(0);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const { session_id, metadata } = await uploadFiles(Array.from(files));
      onSession(session_id, metadata);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }, [onSession]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center glow">
          <Brain className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ArchitectAI</h1>
          <p className="text-muted text-sm">Universal Code Intelligence Platform</p>
        </div>
      </div>

      <p className="text-muted text-center max-w-md mb-10 text-sm">
        Upload any codebase — files, folders, or ZIP archives. Powered by Gemini 2.5 Flash.
      </p>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${dragging ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 hover:bg-white/[0.02]"}`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-sm text-muted">Analyzing codebase with Gemini 2.5 Flash...</p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="font-medium mb-1">Drop files, folders, or ZIP here</p>
            <p className="text-muted text-sm">.py .js .ts .java .go .rs .cpp .ipynb and more</p>
          </>
        )}
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

      {/* Mode selector */}
      <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-xl">
        {MODES.map((m, i) => (
          <button
            key={m}
            onClick={() => setMode(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${mode === i ? "bg-accent text-white" : "glass text-muted hover:text-white"}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-3 gap-4 max-w-xl w-full">
        {[
          { icon: "🧠", label: "Multi-Agent AI", desc: "7 specialized agents" },
          { icon: "⚡", label: "Streaming", desc: "Real-time explanations" },
          { icon: "🔍", label: "RAG Memory", desc: "Context-aware answers" },
        ].map(f => (
          <div key={f.label} className="glass rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{f.icon}</div>
            <div className="text-sm font-medium">{f.label}</div>
            <div className="text-xs text-muted">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
