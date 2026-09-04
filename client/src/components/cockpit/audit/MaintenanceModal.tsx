import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPruning: boolean;
  onPrune: (type: '30days' | '7days' | 'failed' | 'all') => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  isPruning,
  onPrune,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-rose-500/40 bg-obsidian-850 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Trash2 className="h-4 w-4 text-rose-400" />
            <span>Audit Ledger Maintenance &amp; Pruning</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Select a data pruning option to optimize database size and performance:
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onPrune('30days')}
            disabled={isPruning}
            className="flex items-center justify-between rounded-lg border border-border/80 bg-obsidian-900 p-3 text-left text-xs text-white transition-colors hover:bg-obsidian-800"
          >
            <div>
              <div className="font-semibold text-slate-200">Prune Logs &gt; 30 Days</div>
              <div className="text-[10px] text-slate-500">
                Remove audit records older than 30 days
              </div>
            </div>
            <span className="font-mono text-[11px] text-flame">&gt; 30 Days</span>
          </button>

          <button
            type="button"
            onClick={() => onPrune('7days')}
            disabled={isPruning}
            className="flex items-center justify-between rounded-lg border border-border/80 bg-obsidian-900 p-3 text-left text-xs text-white transition-colors hover:bg-obsidian-800"
          >
            <div>
              <div className="font-semibold text-slate-200">Prune Logs &gt; 7 Days</div>
              <div className="text-[10px] text-slate-500">
                Remove audit records older than 7 days
              </div>
            </div>
            <span className="font-mono text-[11px] text-amber-400">&gt; 7 Days</span>
          </button>

          <button
            type="button"
            onClick={() => onPrune('failed')}
            disabled={isPruning}
            className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-left text-xs text-rose-200 transition-colors hover:bg-rose-950/40"
          >
            <div>
              <div className="font-semibold text-rose-300">Prune Failed (FAILED) Logs Only</div>
              <div className="text-[10px] text-slate-400">
                Clear all failed interaction records
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold text-rose-400">FAILED ONLY</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to CLEAR ALL audit history? This action cannot be undone.'
                )
              ) {
                onPrune('all');
              }
            }}
            disabled={isPruning}
            className="flex items-center justify-between rounded-lg border border-rose-600/50 bg-rose-950/40 p-3 text-left text-xs text-rose-300 transition-colors hover:bg-rose-900/60"
          >
            <div>
              <div className="font-semibold text-rose-200">Clear Entire Audit Ledger (Reset)</div>
              <div className="text-[10px] text-rose-400/80">
                Purge 100% of audit history logs from the database
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold text-rose-300">CLEAR ALL</span>
          </button>
        </div>

        <div className="flex justify-end border-t border-border/60 pt-2">
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
