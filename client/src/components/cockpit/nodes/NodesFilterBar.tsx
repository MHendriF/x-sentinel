import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type NodeStatusFilter = 'ALL' | 'ONLINE' | 'PAUSED' | 'HEALTHY' | 'EXPIRED' | 'UNCHECKED';

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
    unchecked: number;
  };
}

export const NodesFilterBar: React.FC<NodesFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  counts,
}) => {
  // Two dimensions live side by side: session enablement (Aktif/Nonaktif) and
  // health-check results (Sehat/Kadaluarsa/Belum Dicek). Counts are computed
  // independently so they intentionally do not sum to the total.
  const FILTER_TABS = [
    { id: 'ALL', label: 'Semua', count: counts.all },
    { id: 'ONLINE', label: 'Aktif', count: counts.online },
    { id: 'PAUSED', label: 'Nonaktif', count: counts.paused },
    { id: 'HEALTHY', label: 'Sehat', count: counts.healthy },
    { id: 'EXPIRED', label: 'Kadaluarsa', count: counts.expired },
    { id: 'UNCHECKED', label: 'Belum Dicek', count: counts.unchecked },
  ] as const;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-obsidian-950 p-2.5 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <Input
          id="node-search"
          type="text"
          placeholder="Cari node (@username, label, proxy host)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 border-border/70 bg-obsidian-900 pl-9 pr-8 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-flame focus:ring-1 focus:ring-flame"
          aria-label="Cari node"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-white"
            title="Hapus pencarian"
            aria-label="Hapus pencarian"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Status Pills (right-edge fade hints horizontal scroll on mobile) */}
      <div className="relative">
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0"
          role="group"
          aria-label="Filter status node"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                aria-pressed={isActive}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 font-mono text-xs transition-colors duration-150 ${
                  isActive
                    ? 'border-flame/60 bg-flame/15 font-semibold text-flame'
                    : 'border-border/60 bg-obsidian-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1 font-mono text-[10px] leading-tight ${
                    isActive ? 'bg-flame/30 font-bold text-flame' : 'bg-obsidian-950 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-8 bg-gradient-to-l from-obsidian-950 to-transparent sm:block" />
      </div>
    </div>
  );
};
