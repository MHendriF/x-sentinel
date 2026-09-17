import React from 'react';
import { AccountNode } from '@/services/apiClient';
import { ShieldCheck, AlertTriangle, PowerOff, HelpCircle, Activity } from 'lucide-react';

interface FleetReadinessRibbonProps {
  accounts: AccountNode[];
  onFilterExpired?: () => void;
  onFilterPaused?: () => void;
  onFilterHealthy?: () => void;
}

export const FleetReadinessRibbon: React.FC<FleetReadinessRibbonProps> = ({
  accounts,
  onFilterExpired,
  onFilterPaused,
  onFilterHealthy,
}) => {
  const total = accounts.length;
  if (total === 0) return null;

  const healthyCount = accounts.filter((a) => a.healthStatus === 'HEALTHY').length;
  const expiredCount = accounts.filter(
    (a) => a.healthStatus === 'EXPIRED' || a.healthStatus === 'PROXY_DEAD' || a.isValid === false
  ).length;
  const pausedCount = accounts.filter((a) => a.enabled === false).length;
  const uncheckedCount = accounts.filter((a) => !a.healthStatus && a.isValid !== false).length;

  const healthyPct = Math.round((healthyCount / total) * 100);
  const expiredPct = Math.round((expiredCount / total) * 100);
  const uncheckedPct = 100 - healthyPct - expiredPct;

  const isHighReadiness = healthyPct >= 80;
  const isModerateReadiness = healthyPct >= 50 && healthyPct < 80;

  return (
    <div className="rounded-xl border border-border/80 bg-obsidian-900/90 p-3.5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Readiness Score & Status */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-black shadow-inner ${
              isHighReadiness
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : isModerateReadiness
                  ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
            }`}
          >
            {healthyPct}%
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white tracking-wide">
                FLEET READINESS INDEX
              </span>
              <span
                className={`rounded border px-1.5 py-0.2 font-mono text-[9.5px] font-bold ${
                  isHighReadiness
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                    : isModerateReadiness
                      ? 'border-amber-500/40 bg-amber-950/40 text-amber-400'
                      : 'border-rose-500/40 bg-rose-950/40 text-rose-400'
                }`}
              >
                {isHighReadiness ? 'MISSION READY' : isModerateReadiness ? 'PARTIAL READINESS' : 'CRITICAL ATTENTION'}
              </span>
            </div>

            <div className="mt-0.5 text-[11px] text-slate-400">
              {healthyCount} of {total} nodes verified healthy and ready for autonomous mission dispatch.
            </div>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          {healthyCount > 0 && onFilterHealthy && (
            <button
              type="button"
              onClick={onFilterHealthy}
              className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/20 px-2 py-1 text-emerald-300 hover:bg-emerald-950/40 transition-colors"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>{healthyCount} Healthy</span>
            </button>
          )}

          {expiredCount > 0 && onFilterExpired && (
            <button
              type="button"
              onClick={onFilterExpired}
              className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-950/30 px-2 py-1 text-rose-300 hover:bg-rose-950/50 transition-colors"
            >
              <AlertTriangle className="h-3 w-3 text-rose-400" />
              <span>{expiredCount} Fix Expired</span>
            </button>
          )}

          {pausedCount > 0 && onFilterPaused && (
            <button
              type="button"
              onClick={onFilterPaused}
              className="flex items-center gap-1 rounded-md border border-border/70 bg-obsidian-950 px-2 py-1 text-slate-400 hover:text-white transition-colors"
            >
              <PowerOff className="h-3 w-3 text-slate-500" />
              <span>{pausedCount} Paused</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Multi-Color Readiness Bar */}
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
        {healthyPct > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${healthyPct}%` }}
            title={`Healthy: ${healthyCount} nodes (${healthyPct}%)`}
          />
        )}
        {expiredPct > 0 && (
          <div
            className="bg-rose-500 transition-all duration-500"
            style={{ width: `${expiredPct}%` }}
            title={`Expired/Dead: ${expiredCount} nodes (${expiredPct}%)`}
          />
        )}
        {uncheckedPct > 0 && (
          <div
            className="bg-slate-600 transition-all duration-500"
            style={{ width: `${uncheckedPct}%` }}
            title={`Unchecked: ${uncheckedCount} nodes`}
          />
        )}
      </div>
    </div>
  );
};
