import React from 'react';
import { Search, Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AuditFiltersProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  actionFilter: string;
  setActionFilter: (a: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onSetPreset: (preset: 'today' | '7days' | '30days') => void;
  onClearDate: () => void;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  actionFilter,
  setActionFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSetPreset,
  onClearDate,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border/80 bg-obsidian-950 p-3">
      {/* Top Filter Row: Search & Vector */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Cari URL tweet, akun, atau pesan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-border/80 bg-obsidian-900 pl-9 font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'LIKE', 'RETWEET', 'COMMENT', 'POST'].map((act) => (
            <Button
              key={act}
              size="sm"
              variant={actionFilter === act ? 'default' : 'outline'}
              onClick={() => setActionFilter(act)}
              className="h-8 px-3 font-mono text-xs"
            >
              {act}
            </Button>
          ))}
        </div>
      </div>

      {/* Date Range Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/60 pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-flame" />
            <span>Range Tanggal:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 rounded-md border border-border/80 bg-obsidian-900 px-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-flame"
              title="Tanggal Mulai"
            />
            <span className="font-mono text-xs text-slate-500">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 rounded-md border border-border/80 bg-obsidian-900 px-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-flame"
              title="Tanggal Selesai"
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={onClearDate}
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              title="Hapus Filter Tanggal"
            >
              <X className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetPreset('today')}
            className="rounded border border-border/80 bg-obsidian-900 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => onSetPreset('7days')}
            className="rounded border border-border/80 bg-obsidian-900 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => onSetPreset('30days')}
            className="rounded border border-border/80 bg-obsidian-900 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            30 Hari
          </button>
        </div>
      </div>
    </div>
  );
};
