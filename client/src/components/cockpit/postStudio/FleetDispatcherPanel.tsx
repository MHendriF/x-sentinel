import React from 'react';
import { Button } from '@/components/ui/button';
import { Account } from '@/services/apiClient';
import { cn } from '@/lib/utils';
import { Send, Calendar, Clock, RefreshCw, Shuffle, ShieldAlert } from 'lucide-react';

interface FleetDispatcherPanelProps {
  targetMode: 'single' | 'fleet';
  setTargetMode: (m: 'single' | 'fleet') => void;
  accounts: Account[];
  activeAccounts: Account[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  staggeredDelay: number;
  setStaggeredDelay: (d: number) => void;
  isRoundRobin: boolean;
  setIsRoundRobin: (b: boolean) => void;
  isPublishing: boolean;
  canPublish: boolean;
  onPublishNow: () => void;
  onOpenScheduleModal: () => void;
}

export const FleetDispatcherPanel: React.FC<FleetDispatcherPanelProps> = ({
  targetMode,
  setTargetMode,
  accounts,
  activeAccounts,
  selectedAccountId,
  setSelectedAccountId,
  staggeredDelay,
  setStaggeredDelay,
  isRoundRobin,
  setIsRoundRobin,
  isPublishing,
  canPublish,
  onPublishNow,
  onOpenScheduleModal,
}) => {
  // Estimated duration calculation
  const totalSeconds = targetMode === 'fleet' ? Math.max(0, (activeAccounts.length - 1) * staggeredDelay) : 0;
  const estMinutes = Math.floor(totalSeconds / 60);
  const estSecs = totalSeconds % 60;
  const timeString = estMinutes > 0 ? `${estMinutes}m ${estSecs}s` : `${estSecs}s`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-obsidian-900/80 p-4">
      {/* Target Mode Switcher */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-xs font-semibold text-slate-200">
          PUBLISHING DESTINATION:
        </span>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-obsidian-950 p-1">
          <button
            type="button"
            onClick={() => setTargetMode('single')}
            className={cn(
              'rounded px-3 py-1 font-mono text-[11px] font-semibold transition-all',
              targetMode === 'single'
                ? 'bg-flame text-obsidian-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
          >
            1 Node Account
          </button>
          <button
            type="button"
            onClick={() => setTargetMode('fleet')}
            className={cn(
              'rounded px-3 py-1 font-mono text-[11px] font-semibold transition-all',
              targetMode === 'fleet'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Broadcast Fleet ({activeAccounts.length})
          </button>
        </div>
      </div>

      {/* Mode Specific Controls */}
      {targetMode === 'single' ? (
        <div className="flex items-center gap-2 pt-1">
          <label className="font-mono text-[11px] text-slate-400">Node Account:</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="flex-1 rounded-md border border-slate-800 bg-obsidian-950 px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-flame focus:outline-none"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.label} (@{acc.username || 'user'}){' '}
                {acc.enabled === false ? '(PAUSED)' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-slate-800 bg-obsidian-950 p-3">
          {/* Delay setting */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <span className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-300">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Staggered Node Delay:
              </span>
              <p className="font-mono text-[10px] text-slate-500">
                Natural wait time between consecutive account publications.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={300}
                value={staggeredDelay}
                onChange={(e) => setStaggeredDelay(Math.max(5, Number(e.target.value)))}
                className="w-20 rounded border border-slate-700 bg-obsidian-900 px-2 py-1 text-center font-mono text-xs text-amber-300 focus:outline-none"
              />
              <span className="font-mono text-xs text-slate-400">seconds</span>
            </div>
          </div>

          {/* Round-robin variation toggle */}
          <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={isRoundRobin}
              onChange={(e) => setIsRoundRobin(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-obsidian-900 text-purple-600 focus:ring-0"
            />
            <div>
              <span className="flex items-center gap-1 font-medium text-slate-200">
                <Shuffle className="h-3 w-3 text-purple-400" />
                Round-Robin Draft Variation Distribution
              </span>
              <p className="font-mono text-[10px] text-slate-400">
                Distributes different variations among fleet nodes to prevent identical timeline spam.
              </p>
            </div>
          </label>

          {/* Telemetry info */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 font-mono text-[10px] text-slate-400">
            <span>Estimated fleet runtime:</span>
            <span className="font-bold text-amber-300">~{timeString} total</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenScheduleModal}
          disabled={isPublishing || !canPublish}
          className="gap-1.5 border-amber-500/40 font-heading text-xs font-bold text-amber-300 hover:bg-amber-500/10"
        >
          <Calendar className="h-4 w-4 text-amber-400" />
          <span>📅 Schedule Post</span>
        </Button>

        <Button
          type="button"
          onClick={onPublishNow}
          disabled={isPublishing || !canPublish}
          className={cn(
            'gap-2 font-heading text-xs font-bold shadow-lg transition-all',
            targetMode === 'single'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110'
              : 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:brightness-110'
          )}
        >
          {isPublishing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>
                {targetMode === 'single'
                  ? 'Publish Now (1 Account)'
                  : `Broadcast to Fleet (${activeAccounts.length} Nodes)`}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
