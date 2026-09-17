import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Heart,
  Repeat,
  MessageSquare,
  Send,
  Users,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditStatsHUDProps {
  totalCount: number;
  successCount: number;
  failedCount: number;
  alreadyDoneCount: number;
  likeCount: number;
  retweetCount: number;
  commentCount: number;
  postCount: number;
  activeAccountsCount: number;
  onSelectStatus?: (status: string) => void;
}

export const AuditStatsHUD: React.FC<AuditStatsHUDProps> = ({
  totalCount,
  successCount,
  failedCount,
  alreadyDoneCount: _alreadyDoneCount,
  likeCount,
  retweetCount,
  commentCount,
  postCount,
  activeAccountsCount,
  onSelectStatus,
}) => {
  const successRateNum = totalCount > 0 ? (successCount / totalCount) * 100 : 100;
  const successRateStr = totalCount > 0 ? successRateNum.toFixed(1) : '100.0';

  const rateColorClass =
    successRateNum >= 90
      ? 'text-emerald-400'
      : successRateNum >= 75
        ? 'text-amber-400'
        : 'text-rose-400';

  const rateBgClass =
    successRateNum >= 90
      ? 'bg-emerald-500'
      : successRateNum >= 75
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 bg-obsidian-950/80 p-3 sm:grid-cols-4">
      {/* 1. Success Rate KPI */}
      <div className="flex flex-col justify-between rounded-md border border-border/60 bg-obsidian-900/90 p-2.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span className="flex items-center gap-1 font-mono uppercase tracking-wider text-slate-400">
            <Percent className="h-3.5 w-3.5 text-flame" />
            Success Ratio
          </span>
          <span className={cn('font-mono font-bold', rateColorClass)}>
            {successRateStr}%
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between font-mono">
          <span className="text-sm font-semibold text-white">
            {successCount}
            <span className="text-xs text-slate-500">/{totalCount}</span>
          </span>
          <span className="text-[10px] text-slate-400">deliveries OK</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={cn('h-full transition-all duration-500', rateBgClass)}
            style={{ width: `${Math.min(100, Math.max(0, successRateNum))}%` }}
          />
        </div>
      </div>

      {/* 2. Action Vectors Breakdown */}
      <div className="flex flex-col justify-between rounded-md border border-border/60 bg-obsidian-900/90 p-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
          <span>Vectors Logged</span>
          <span className="text-[10px] text-slate-500">{totalCount} total</span>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1 font-mono text-xs">
          <div className="flex items-center gap-1 text-slate-300">
            <Heart className="h-3 w-3 text-rose-400" />
            <span className="text-[11px] font-bold text-white">{likeCount}</span>
            <span className="text-[10px] text-slate-500">likes</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Repeat className="h-3 w-3 text-emerald-400" />
            <span className="text-[11px] font-bold text-white">{retweetCount}</span>
            <span className="text-[10px] text-slate-500">reposts</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <MessageSquare className="h-3 w-3 text-sky-400" />
            <span className="text-[11px] font-bold text-white">{commentCount}</span>
            <span className="text-[10px] text-slate-500">replies</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Send className="h-3 w-3 text-amber-400" />
            <span className="text-[11px] font-bold text-white">{postCount}</span>
            <span className="text-[10px] text-slate-500">posts</span>
          </div>
        </div>
      </div>

      {/* 3. Engaged Nodes */}
      <div className="flex flex-col justify-between rounded-md border border-border/60 bg-obsidian-900/90 p-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-sky-400" />
            Nodes Involved
          </span>
          <span className="text-[10px] text-slate-500">fleet scope</span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 font-mono">
          <span className="text-xl font-bold text-white">{activeAccountsCount}</span>
          <span className="text-xs text-slate-400">active accounts</span>
        </div>
        <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-slate-400">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          <span>Distributed node telemetry</span>
        </div>
      </div>

      {/* 4. Anomaly / Diagnostic Radar */}
      <div
        className={cn(
          'flex flex-col justify-between rounded-md border p-2.5 transition-all',
          failedCount > 0
            ? 'cursor-pointer border-rose-500/50 bg-rose-950/20 hover:border-rose-400 hover:bg-rose-950/30'
            : 'border-border/60 bg-obsidian-900/90'
        )}
        onClick={() => {
          if (failedCount > 0 && onSelectStatus) {
            onSelectStatus('FAILED');
          }
        }}
        title={failedCount > 0 ? 'Click to filter FAILED logs immediately' : 'Fleet nominal'}
      >
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider">
          <span
            className={cn(
              'flex items-center gap-1 font-semibold',
              failedCount > 0 ? 'text-rose-400' : 'text-slate-400'
            )}
          >
            {failedCount > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse text-rose-400" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            )}
            Telemetry Integrity
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 font-mono">
          {failedCount > 0 ? (
            <>
              <span className="text-xl font-bold text-rose-400">{failedCount}</span>
              <span className="text-xs font-semibold text-rose-300">Failures Detected</span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-emerald-400">100% NOMINAL</span>
              <span className="text-xs text-slate-500">0 anomalies</span>
            </>
          )}
        </div>
        <div className="mt-1 font-mono text-[10px]">
          {failedCount > 0 ? (
            <span className="text-rose-300 underline underline-offset-2">
              ⚡ Click to isolate failed logs
            </span>
          ) : (
            <span className="text-slate-500">Zero rate-limits or auth drops</span>
          )}
        </div>
      </div>
    </div>
  );
};
