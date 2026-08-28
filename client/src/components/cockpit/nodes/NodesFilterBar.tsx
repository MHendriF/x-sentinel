import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type NodeStatusFilter = 'ALL' | 'ONLINE' | 'PAUSED' | 'HEALTHY' | 'EXPIRED';

interface NodesFilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: NodeStatusFilter;
  setStatusFilter: (status: NodeStatusFilter) => void;
  totalCount: number;
  filteredCount: number;
}

export const NodesFilterBar: React.FC<NodesFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-obsidian-950 p-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
        <Input
          type="text"
          placeholder="Cari node akun (@username, label, proxy host)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8.5 border-border/80 bg-obsidian-900 pl-9 pr-8 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-flame focus:ring-1 focus:ring-flame"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            title="Hapus pencarian"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Status Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        {(
          [
            { id: 'ALL', label: 'All Nodes' },
            { id: 'ONLINE', label: 'Online' },
            { id: 'PAUSED', label: 'Paused' },
            { id: 'HEALTHY', label: 'Healthy' },
            { id: 'EXPIRED', label: 'Expired' },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={statusFilter === tab.id ? 'default' : 'outline'}
            onClick={() => setStatusFilter(tab.id)}
            className={`h-7.5 px-2.5 font-mono text-[11px] transition-all ${
              statusFilter === tab.id
                ? 'bg-flame font-bold text-obsidian-950 shadow-sm'
                : 'border-border/60 bg-obsidian-900/80 text-slate-400 hover:border-slate-600 hover:text-white'
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
