import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import { FailureDiagnostics } from './useAnalyticsData';

interface FailureDiagnosticsCardProps {
  diagnostics: FailureDiagnostics;
  onSelectNode?: (nodeId: string) => void;
}

export const FailureDiagnosticsCard: React.FC<FailureDiagnosticsCardProps> = ({
  diagnostics,
  onSelectNode,
}) => {
  const { failureCount, totalAttempts, reliabilityIndex, categories, affectedNodes } = diagnostics;

  const isHealthy = failureCount === 0 || reliabilityIndex >= 95;

  return (
    <Card className="border-border/80 bg-obsidian-850">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-rose-400">
            {isHealthy ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            )}
            HEALTH & FAILURE INTELLIGENCE
          </div>

          {/* Reliability Score Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs font-bold ${
                reliabilityIndex >= 95
                  ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                  : reliabilityIndex >= 80
                    ? 'border-amber-500/30 bg-amber-950/30 text-amber-300'
                    : 'border-rose-500/30 bg-rose-950/30 text-rose-300'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Reliability Index:</span>
              <span className="text-white">{reliabilityIndex}%</span>
            </div>
          </div>
        </div>

        <CardTitle className="text-lg">Diagnostik Anomali & Integritas Armada</CardTitle>
        <CardDescription>
          Analisis otomatis terhadap insiden kegagalan eksekusi, rate limits, status autentikasi, dan stabilitas proxy.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {failureCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-6 text-center">
            <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-400" />
            <div className="font-mono text-sm font-bold text-emerald-300">
              Zero Operational Failures Detected
            </div>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Seluruh target dan aksi interaksi dalam rentang waktu ini berjalan mulus tanpa adanya error rate limit, proxy timeout, atau cookie kadaluarsa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left: Error Categories Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs font-semibold text-slate-300">
                <span>Distribusi Penyebab Kegagalan</span>
                <span className="text-rose-400 font-bold">{failureCount} insiden ({totalAttempts} total)</span>
              </div>

              <div className="space-y-2.5">
                {categories.map((cat) => (
                  <div
                    key={cat.category}
                    className="rounded-lg border border-border/70 bg-obsidian-900/60 p-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{cat.label}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {cat.count}x ({cat.percentage}%)
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Affected Nodes & Mitigation Advice */}
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs font-semibold text-slate-300">
                <span>Node Terdampak</span>
                <span className="text-slate-400">{affectedNodes.length} akun</span>
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {affectedNodes.map((node) => (
                  <div
                    key={node.accountId}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-obsidian-900/60 p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                      <span className="font-mono font-medium text-slate-200">
                        {node.accountName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-rose-500/30 bg-rose-950/30 font-mono text-[10px] text-rose-300"
                      >
                        {node.failedCount} fails
                      </Badge>
                      {onSelectNode && (
                        <button
                          onClick={() => onSelectNode(node.accountId)}
                          className="rounded px-1.5 py-0.5 font-mono text-[10px] text-cyan-400 hover:bg-cyan-950 hover:text-cyan-200"
                        >
                          Inspect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mitigation Tip */}
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-950/20 p-2.5 text-xs text-amber-300/90">
                <span className="font-bold">💡 Saran Mitigasi:</span> Jika error didominasi oleh Rate Limit, tingkatkan jeda <code>minDelay</code> dan <code>accountSwitchDelay</code> di Defense Protocol. Jika auth error, lakukan verifikasi ulang cookie di Fleet Nodes.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
