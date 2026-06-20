import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, Loader2 } from "lucide-react";
import { streamExplain } from "../lib/api";
import ReactMarkdown from "react-markdown";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

interface Props {
  sessionId: string;
  metadata: any;
}

const LEVELS = ["beginner", "intermediate", "senior"] as const;

function TreeItem({ node, onSelect, selected }: { node: TreeNode; onSelect: (p: string) => void; selected: string }) {
  const [open, setOpen] = useState(false);
  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded hover:bg-white/5 text-sm text-muted hover:text-white transition-colors"
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <Folder className="w-3.5 h-3.5 text-yellow-500/70" />
          <span>{node.name}</span>
        </button>
        {open && (
          <div className="ml-4 border-l border-border pl-2">
            {node.children?.map(c => <TreeItem key={c.path} node={c} onSelect={onSelect} selected={selected} />)}
          </div>
        )}
      </div>
    );
  }
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-sm transition-colors
        ${selected === node.path ? "bg-accent/20 text-accent" : "text-muted hover:text-white hover:bg-white/5"}`}
    >
      <File className="w-3.5 h-3.5" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function FileExplorer({ sessionId, metadata }: Props) {
  const [selected, setSelected] = useState("");
  const [level, setLevel] = useState<typeof LEVELS[number]>("intermediate");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelect = async (path: string) => {
    setSelected(path);
    setExplanation("");
    setLoading(true);
    try {
      for await (const chunk of streamExplain(sessionId, path, level)) {
        setExplanation(prev => prev + chunk);
      }
    } finally {
      setLoading(false);
    }
  };

  const tree: TreeNode[] = metadata?.file_tree || [];

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-64 border-r border-border bg-panel flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-white">Files</h2>
          <p className="text-xs text-muted mt-0.5">{metadata?.total_files || 0} files</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {tree.map(n => <TreeItem key={n.path} node={n} onSelect={handleSelect} selected={selected} />)}
        </div>
      </div>

      {/* Explanation Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-panel">
          <span className="text-sm text-muted flex-1 font-mono truncate">{selected || "Select a file"}</span>
          <div className="flex gap-1">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all
                  ${level === l ? "bg-accent text-white" : "glass text-muted hover:text-white"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {selected && (
            <button
              onClick={() => handleSelect(selected)}
              className="px-3 py-1 rounded text-xs bg-accent/20 text-accent hover:bg-accent/30 transition-all"
            >
              Re-explain
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-muted text-sm">Click any file to get an AI explanation</p>
            </div>
          )}
          {loading && !explanation && (
            <div className="flex items-center gap-2 text-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing with Gemini 2.5 Flash...
            </div>
          )}
          {explanation && (
            <div className={`prose prose-invert prose-sm max-w-none ${loading ? "streaming-cursor" : ""}`}>
              <ReactMarkdown>{explanation}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
