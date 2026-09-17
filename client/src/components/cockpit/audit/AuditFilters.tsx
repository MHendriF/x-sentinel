import React from 'react';
import { Search, Calendar, X, Filter, RotateCcw, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StatusCounts {
  ALL: number;
  SUCCESS: number;
  FAILED: number;
  ALREADY_DONE: number;
}

interface AuditFiltersProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  actionFilter: string;
  setActionFilter: (a: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  statusCounts: StatusCounts;
  accountFilter: string;
  setAccountFilter: (a: string) => void;
  accountOptions: string[];
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onSetPreset: (preset: 'today' | '7days' | '30days') => void;
  onClearDate: () => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  actionFilter,
  setActionFilter,
  statusFilter,
  setStatusFilter,
  statusCounts,
  accountFilter,
  setAccountFilter,
  accountOptions,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSetPreset,
  onClearDate,
  onResetAll,
  hasActiveFilters,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-obsidian-950 p-3.5">
      {/* 1. Top Filter Row: Search Bar & Action Vector Selector */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder="Search tweet URL, account, payload message, or error reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 border-border/80 bg-obsidian-900 pl-9 pr-8 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-flame focus:ring-1 focus:ring-flame"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-white"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Vector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'LIKE', 'RETWEET', 'COMMENT', 'POST'].map((act) => (
            <Button
              key={act}
              size="sm"
              variant={actionFilter === act ? 'default' : 'outline'}
              onClick={() => setActionFilter(act)}
              className={cn(
                'h-8 px-2.5 font-mono text-xs',
                actionFilter === act
                  ? 'bg-flame text-white hover:bg-flame/90'
                  : 'border-border/80 bg-obsidian-900 text-slate-300 hover:bg-obsidian-800 hover:text-white'
              )}
            >
              {act}
            </Button>
          ))}
        </div>
      </div>

      {/* 2. Middle Row: Status Pills & Account Node Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-2.5">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400 mr-1">
            <Filter className="h-3 w-3 text-flame" />
            Status:
          </span>

          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all',
              statusFilter === 'ALL'
                ? 'border-slate-500 bg-slate-800 text-white font-bold'
                : 'border-border/80 bg-obsidian-900 text-slate-400 hover:text-slate-200'
            )}
          >
            <span>ALL</span>
            <span className="rounded-full bg-obsidian-950 px-1.5 py-0.2 text-[9px] text-slate-400">
              {statusCounts.ALL}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('SUCCESS')}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all',
              statusFilter === 'SUCCESS'
                ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold'
                : 'border-border/80 bg-obsidian-900 text-slate-400 hover:text-emerald-300'
            )}
          >
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              SUCCESS
            </span>
            <span className="rounded-full bg-obsidian-950 px-1.5 py-0.2 text-[9px] text-emerald-400">
              {statusCounts.SUCCESS}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('FAILED')}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all',
              statusFilter === 'FAILED'
                ? 'border-rose-500 bg-rose-950/60 text-rose-200 font-bold'
                : statusCounts.FAILED > 0
                  ? 'border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40'
                  : 'border-border/80 bg-obsidian-900 text-slate-400 hover:text-rose-300'
            )}
          >
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full bg-rose-500',
                  statusCounts.FAILED > 0 && 'animate-ping'
                )}
              />
              FAILED
            </span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 text-[9px] font-bold',
                statusCounts.FAILED > 0 ? 'bg-rose-900/60 text-rose-300' : 'bg-obsidian-950 text-slate-400'
              )}
            >
              {statusCounts.FAILED}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ALREADY_DONE')}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all',
              statusFilter === 'ALREADY_DONE'
                ? 'border-amber-500 bg-amber-950/60 text-amber-300 font-bold'
                : 'border-border/80 bg-obsidian-900 text-slate-400 hover:text-amber-300'
            )}
          >
            <span>ALREADY DONE</span>
            <span className="rounded-full bg-obsidian-950 px-1.5 py-0.2 text-[9px] text-amber-400">
              {statusCounts.ALREADY_DONE}
            </span>
          </button>
        </div>

        {/* Account Node Filter & Reset All */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-sky-400" />
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="h-7 rounded border border-border/80 bg-obsidian-900 px-2 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-flame"
              title="Filter by Account Node"
            >
              <option value="ALL">All Account Nodes ({accountOptions.length})</option>
              {accountOptions.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="flex items-center gap-1 rounded border border-rose-500/40 bg-rose-950/20 px-2 py-1 font-mono text-[10px] font-semibold text-rose-300 transition-colors hover:bg-rose-950/40 hover:text-rose-200"
              title="Reset all active search, action, status, account, and date filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Bottom Row: Date Range Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/60 pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-flame" />
            <span>Date Range:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-7 rounded-md border border-border/80 bg-obsidian-900 px-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-flame"
              title="Start Date"
            />
            <span className="font-mono text-xs text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-7 rounded-md border border-border/80 bg-obsidian-900 px-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-flame"
              title="End Date"
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={onClearDate}
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              title="Clear Date Filter"
            >
              <X className="h-3 w-3" />
              <span>Clear Dates</span>
            </button>
          )}
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetPreset('today')}
            className={cn(
              'rounded border px-2.5 py-1 font-mono text-[11px] transition-colors',
              startDate && endDate && startDate === endDate
                ? 'border-flame/60 bg-flame/15 text-flame font-bold'
                : 'border-border/80 bg-obsidian-900 text-slate-300 hover:border-slate-600 hover:text-white'
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onSetPreset('7days')}
            className="rounded border border-border/80 bg-obsidian-900 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => onSetPreset('30days')}
            className="rounded border border-border/80 bg-obsidian-900 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            30 Days
          </button>
        </div>
      </div>
    </div>
  );
};
