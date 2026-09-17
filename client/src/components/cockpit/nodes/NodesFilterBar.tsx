import React from 'react';
import { Search, X, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type NodeStatusFilter = 'ALL' | 'ONLINE' | 'PAUSED' | 'HEALTHY' | 'EXPIRED' | 'UNCHECKED';
export type NodeSortOption = 'default' | 'health' | 'activity' | 'name' | 'proxy';

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
  sortOption?: NodeSortOption;
  setSortOption?: (sort: NodeSortOption) => void;
  viewMode?: 'grid' | 'table';
  setViewMode?: (mode: 'grid' | 'table') => void;
}

export const NodesFilterBar: React.FC<NodesFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  counts,
  sortOption = 'default',
  setSortOption,
  viewMode = 'grid',
  setViewMode,
}) => {
  const FILTER_TABS = [
    { id: 'ALL', label: 'All', count: counts.all },
    { id: 'ONLINE', label: 'Active', count: counts.online },
    { id: 'PAUSED', label: 'Paused', count: counts.paused },
    { id: 'HEALTHY', label: 'Healthy', count: counts.healthy },
    { id: 'EXPIRED', label: 'Expired', count: counts.expired },
    { id: 'UNCHECKED', label: 'Unchecked', count: counts.unchecked },
  ] as const;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-obsidian-950 p-2.5">
      {/* Top Controls Row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            id="node-search"
            type="text"
            placeholder="Search nodes (@username, label, proxy host)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 border-border/70 bg-obsidian-900 pl-9 pr-8 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-flame focus:ring-1 focus:ring-flame"
            aria-label="Search nodes"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-white"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort & View Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          {setSortOption && (
            <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-obsidian-900 px-2 py-1 font-mono text-xs text-slate-300">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as NodeSortOption)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="default" className="bg-obsidian-900 text-slate-200">Default Order</option>
                <option value="health" className="bg-obsidian-900 text-slate-200">Fix Expired First</option>
                <option value="activity" className="bg-obsidian-900 text-slate-200">Most Active</option>
                <option value="name" className="bg-obsidian-900 text-slate-200">Handle (A-Z)</option>
                <option value="proxy" className="bg-obsidian-900 text-slate-200">Proxied Nodes First</option>
              </select>
            </div>
          )}

          {/* View Mode Toggle: Grid vs Table */}
          {setViewMode && (
            <div className="flex items-center rounded-md border border-border/70 bg-obsidian-900 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-flame text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Card Grid View"
                aria-label="Card Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-flame text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Dense Table View"
                aria-label="Dense Table View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Status Pills */}
      <div className="relative border-t border-border/50 pt-2">
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0"
          role="group"
          aria-label="Node status filters"
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
