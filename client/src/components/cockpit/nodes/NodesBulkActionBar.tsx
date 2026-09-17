import React from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Power,
  PowerOff,
  Activity,
  Trash2,
  X,
  Loader2,
  CheckCheck,
} from 'lucide-react';

interface NodesBulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchActivate: () => void;
  onBatchPause: () => void;
  onBatchPingProxies: () => void;
  onBatchDelete: () => void;
  isLoading?: boolean;
}

export const NodesBulkActionBar: React.FC<NodesBulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBatchActivate,
  onBatchPause,
  onBatchPingProxies,
  onBatchDelete,
  isLoading = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-cyan-500/50 bg-obsidian-950/95 px-4 py-2.5 shadow-2xl shadow-cyan-950/80 backdrop-blur-md">
        {/* Selection Count Pill */}
        <div className="flex items-center gap-2 border-r border-slate-700 pr-3 font-mono text-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-obsidian-950 font-bold text-[11px]">
            {selectedCount}
          </span>
          <span className="font-semibold text-white">
            {selectedCount === 1 ? 'Node Selected' : 'Nodes Selected'}
          </span>
          {selectedCount < totalCount ? (
            <button
              onClick={onSelectAll}
              className="text-[10px] text-cyan-400 hover:text-cyan-200 underline"
            >
              Select all ({totalCount})
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 font-bold">All selected</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Button
            size="sm"
            variant="outline"
            onClick={onBatchActivate}
            disabled={isLoading}
            className="h-8 border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40"
          >
            <Power className="mr-1 h-3.5 w-3.5 text-emerald-400" />
            Activate
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onBatchPause}
            disabled={isLoading}
            className="h-8 border-slate-700 bg-obsidian-900 text-slate-300 hover:bg-slate-800"
          >
            <PowerOff className="mr-1 h-3.5 w-3.5 text-slate-400" />
            Pause
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onBatchPingProxies}
            disabled={isLoading}
            className="h-8 border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40"
          >
            <Activity className="mr-1 h-3.5 w-3.5 text-purple-400" />
            Ping Proxies
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={onBatchDelete}
            disabled={isLoading}
            className="h-8 border border-rose-500/50 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5 text-rose-400" />
            Delete
          </Button>
        </div>

        {/* Close / Deselect */}
        <button
          onClick={onClearSelection}
          className="ml-1 rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
