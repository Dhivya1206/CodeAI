import { useEffect, useState } from "react";
import { getReview } from "../lib/api";
import { Zap, Loader2, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#1e1e24" strokeWidth="6" />
          <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${(score / 100) * 163} 163`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{score}</span>
      </div>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

const RISK_COLOR: Record<string, string> = {
  low: "text-green-400", medium: "text-yellow-400", high: "text-red-400"
};
const SEV_COLOR: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  major: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  minor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function ImprovementCenter({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReview(sessionId).then(setData).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return (
    <div className="flex items-center justify-center h-full gap-2 text-muted">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Running code review with Gemini...</span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold">Improvement Center</h2>
      </div>

      {/* Scores */}
      <div className="glass rounded-xl p-6 flex items-center justify-around">
        <ScoreRing score={data?.quality_score || 0} label="Quality" />
        <ScoreRing score={data?.maintainability_score || 0} label="Maintainability" />
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-muted">Performance Risk</div>
          <span className={`font-semibold capitalize ${RISK_COLOR[data?.performance_risk] || "text-muted"}`}>
            {data?.performance_risk || "—"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-muted">Security Risk</div>
          <span className={`font-semibold capitalize ${RISK_COLOR[data?.security_risk] || "text-muted"}`}>
            {data?.security_risk || "—"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-muted">Technical Debt</div>
          <span className={`font-semibold capitalize ${RISK_COLOR[data?.technical_debt] || "text-muted"}`}>
            {data?.technical_debt || "—"}
          </span>
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="glass rounded-xl p-4 text-sm text-muted">{data.summary}</div>
      )}

      {/* Issues */}
      {data?.issues?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> Issues Found
          </h3>
          <div className="space-y-2">
            {data.issues.map((issue: any, i: number) => (
              <div key={i} className={`rounded-xl p-4 border ${SEV_COLOR[issue.severity] || "glass"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide">{issue.severity}</span>
                    {issue.file && <span className="text-xs text-muted ml-2 font-mono">{issue.file}</span>}
                    <p className="text-sm mt-1">{issue.description}</p>
                  </div>
                </div>
                {issue.suggestion && (
                  <p className="text-xs mt-2 opacity-70">💡 {issue.suggestion}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refactor Suggestions */}
      {data?.refactor_suggestions?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" /> Refactor Suggestions
          </h3>
          <div className="space-y-2">
            {data.refactor_suggestions.map((s: string, i: number) => (
              <div key={i} className="glass rounded-lg px-4 py-2.5 text-sm flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization */}
      {data?.optimization_strategies?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Optimization Strategies</h3>
          <div className="space-y-2">
            {data.optimization_strategies.map((s: string, i: number) => (
              <div key={i} className="glass rounded-lg px-4 py-2.5 text-sm flex items-start gap-2">
                <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
