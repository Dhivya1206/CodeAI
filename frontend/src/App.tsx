import { useState } from "react";
import Dashboard from "./components/Dashboard";
import FileExplorer from "./components/FileExplorer";
import ChatPanel from "./components/ChatPanel";
import ArchitectureView from "./components/ArchitectureView";
import DocumentationStudio from "./components/DocumentationStudio";
import ImprovementCenter from "./components/ImprovementCenter";
import { Brain, FolderOpen, MessageSquare, GitBranch, BookOpen, Zap } from "lucide-react";

type Tab = "explorer" | "architecture" | "docs" | "chat" | "review";

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("explorer");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "explorer", label: "Explorer", icon: FolderOpen },
    { id: "architecture", label: "Architecture", icon: GitBranch },
    { id: "docs", label: "Docs", icon: BookOpen },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "review", label: "Review", icon: Zap },
  ];

  if (!sessionId) {
    return <Dashboard onSession={(id, meta) => { setSessionId(id); setMetadata(meta); }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-6 gap-2 border-r border-border bg-panel">
        <div className="mb-4">
          <Brain className="w-7 h-7 text-accent" />
        </div>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            title={t.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
              ${activeTab === t.id
                ? "bg-accent/20 text-accent"
                : "text-muted hover:text-white hover:bg-white/5"}`}
          >
            <t.icon className="w-5 h-5" />
          </button>
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "explorer" && <FileExplorer sessionId={sessionId} metadata={metadata} />}
        {activeTab === "architecture" && <ArchitectureView sessionId={sessionId} />}
        {activeTab === "docs" && <DocumentationStudio sessionId={sessionId} />}
        {activeTab === "chat" && <ChatPanel sessionId={sessionId} metadata={metadata} />}
        {activeTab === "review" && <ImprovementCenter sessionId={sessionId} />}
      </main>
    </div>
  );
}
