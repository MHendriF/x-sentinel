import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type NodeStatusFilter = 'ALL' | 'ONLINE' | 'PAUSED' | 'HEALTHY' | 'EXPIRED';

interface NodesFilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: NodeStatusFilter;
  setStatusFilter: (status: NodeStatusFilter) => void;
  counts: {
    all: number;
    online: number;
    paused: number;
    healthy: number;
    expired: number;
  };
}

export const NodesFilterBar: React.FC<NodesFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  counts,
}) => {
  const FILTER_TABS = [
    { id: 'ALL', label: 'All Nodes', count: counts.all },
    { id: 'ONLINE', label: 'Online', count: counts.online },
    { id: 'PAUSED', label: 'Paused', count: counts.paused },
    { id: 'HEALTHY', label: 'Healthy', count: counts.healthy },
    { id: 'EXPIRED', label: 'Expired', count: counts.expired },
  ] as const;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-obsidian-950 p-2.5 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <Input
          type="text"
          placeholder="Cari node (@username, label, proxy host)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 border-border/70 bg-obsidian-900 pl-9 pr-8 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-flame focus:ring-1 focus:ring-flame"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-white"
            title="Hapus pencarian"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Status Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
        {FILTER_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 font-mono text-xs transition-colors duration-150 ${
                isActive
                  ? 'border-flame/60 bg-flame/15 font-semibold text-flame'
                  : 'border-border/60 bg-obsidian-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded px-1 font-mono text-[10px] leading-tight ${
                  isActive ? 'bg-flame/30 font-bold text-flame' : 'bg-obsidian-950 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
