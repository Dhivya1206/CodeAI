import { useState } from "react";
import { getDocs } from "../lib/api";
import { BookOpen, Loader2, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

const DOC_TYPES = [
  { id: "readme", label: "README.md" },
  { id: "onboarding", label: "Onboarding Guide" },
  { id: "api", label: "API Docs" },
];

export default function DocumentationStudio({ sessionId }: { sessionId: string }) {
  const [docType, setDocType] = useState("readme");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async (type: string) => {
    setDocType(type);
    setContent("");
    setLoading(true);
    try {
      const res = await getDocs(sessionId, type);
      setContent(res.content);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${docType}.md`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-panel flex items-center gap-4">
        <BookOpen className="w-5 h-5 text-accent" />
        <h2 className="text-sm font-semibold flex-1">Documentation Studio</h2>
        <div className="flex gap-2">
          {DOC_TYPES.map(d => (
            <button
              key={d.id}
              onClick={() => generate(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${docType === d.id && content ? "bg-accent text-white" : "glass text-muted hover:text-white"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {content && (
          <button onClick={download} className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-lg text-xs text-muted hover:text-white transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {!content && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <BookOpen className="w-12 h-12 text-accent/30" />
            <p className="text-muted text-sm">Select a documentation type to generate</p>
            <div className="flex gap-2">
              {DOC_TYPES.map(d => (
                <button key={d.id} onClick={() => generate(d.id)}
                  className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30 transition-all">
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating documentation with Gemini 2.5 Flash...
          </div>
        )}
        {content && (
          <div className="prose prose-invert prose-sm max-w-3xl mx-auto">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
