import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Brain } from "lucide-react";
import { streamChat } from "../lib/api";
import ReactMarkdown from "react-markdown";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "What does this project do?",
  "Explain the main architecture",
  "Where is the entry point?",
  "What design patterns are used?",
  "How can I improve performance?",
];

export default function ChatPanel({ sessionId, metadata }: { sessionId: string; metadata: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (question: string) => {
    if (!question.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      for await (const chunk of streamChat(sessionId, question, messages)) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...assistantMsg, content: updated[updated.length - 1].content + chunk };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-panel flex items-center gap-3">
        <Brain className="w-5 h-5 text-accent" />
        <div>
          <h2 className="text-sm font-semibold">Architect Chat</h2>
          <p className="text-xs text-muted">{metadata?.description?.slice(0, 80) || "Ask anything about your codebase"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Brain className="w-12 h-12 text-accent/40" />
            <p className="text-muted text-sm">Ask anything about your uploaded code</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 glass rounded-lg text-xs text-muted hover:text-white transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain className="w-4 h-4 text-accent" />
              </div>
            )}
            <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm
              ${m.role === "user"
                ? "bg-accent/20 text-white rounded-tr-sm"
                : "glass rounded-tl-sm"}`}
            >
              {m.role === "assistant" ? (
                <div className={`prose prose-invert prose-sm max-w-none ${streaming && i === messages.length - 1 ? "streaming-cursor" : ""}`}>
                  <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-panel">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about your code..."
            rows={1}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm resize-none
              focus:outline-none focus:border-accent/50 transition-colors placeholder:text-muted"
          />
          <button
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center
              hover:bg-accent-dim transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
