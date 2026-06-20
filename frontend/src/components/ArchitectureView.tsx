import { useEffect, useState } from "react";
import { getArchitecture } from "../lib/api";
import { Loader2, GitBranch, Layers, ArrowRight } from "lucide-react";

export default function ArchitectureView({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArchitecture(sessionId).then(setData).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return (
    <div className="flex items-center justify-center h-full gap-2 text-muted">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Analyzing architecture with Gemini...</span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-accent" /> Architecture Analysis
        </h2>
        <p className="text-muted text-sm mt-1">{data?.overview}</p>
      </div>

      {/* App Type + Patterns */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted mb-1">Application Type</div>
          <div className="font-medium">{data?.app_type || "—"}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted mb-2">Design Patterns</div>
          <div className="flex flex-wrap gap-1">
            {(data?.design_patterns || []).map((p: string) => (
              <span key={p} className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Layers */}
      {data?.layers?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" /> System Layers
          </h3>
          <div className="space-y-2">
            {data.layers.map((layer: any, i: number) => (
              <div key={i} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm">{layer.name}</div>
                    <div className="text-muted text-xs mt-0.5">{layer.description}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {(layer.files || []).slice(0, 4).map((f: string) => (
                      <span key={f} className="px-1.5 py-0.5 bg-white/5 text-muted text-xs rounded font-mono">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Flow */}
      {data?.data_flow && (
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted mb-2">Data Flow</div>
          <p className="text-sm">{data.data_flow}</p>
        </div>
      )}

      {/* Dependencies */}
      {data?.dependencies?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Component Dependencies</h3>
          <div className="space-y-2">
            {data.dependencies.slice(0, 10).map((dep: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm glass rounded-lg px-4 py-2">
                <span className="text-accent font-mono text-xs">{dep.from}</span>
                <ArrowRight className="w-3 h-3 text-muted" />
                <span className="font-mono text-xs">{dep.to}</span>
                <span className="text-muted text-xs ml-auto">{dep.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ML Pipeline */}
      {data?.ml_pipeline && (
        <div className="glass rounded-xl p-4 border border-purple-500/20">
          <div className="text-xs text-purple-400 mb-2">ML Pipeline — {data.ml_pipeline.framework}</div>
          <div className="flex flex-wrap gap-2">
            {data.ml_pipeline.stages?.map((s: string, i: number) => (
              <div key={i} className="flex items-center gap-1">
                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">{s}</span>
                {i < data.ml_pipeline.stages.length - 1 && <ArrowRight className="w-3 h-3 text-muted" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
