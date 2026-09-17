import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, HistoryItem } from '@/services/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeckHeader } from './DeckHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  RefreshCw,
  Download,
  Trash2,
  FileSpreadsheet,
  FileJson,
  Radio,
  AlertOctagon,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { AuditFilters, StatusCounts } from './audit/AuditFilters';
import { AuditTable } from './audit/AuditTable';
import type { AuditSortKey, AuditSortDir } from './audit/AuditTable';
import { AuditPagination } from './audit/AuditPagination';
import { MaintenanceModal } from './audit/MaintenanceModal';
import { AuditStatsHUD } from './audit/AuditStatsHUD';
import { AuditDetailModal } from './audit/AuditDetailModal';
import { cn } from '@/lib/utils';

const AUDIT_LIMIT_STORAGE_KEY = 'x_sentinel_audit_limit';

export const AuditLedger: React.FC = () => {
  const { history, historyHydrated, loadHistory, accounts } = useStore();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Table Sorting & Pagination State
  const [sortKey, setSortKey] = useState<AuditSortKey>('timestamp');
  const [sortDir, setSortDir] = useState<AuditSortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Maintenance & Modal State
  const [isPruneModalOpen, setIsPruneModalOpen] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Live Auto-Stream Polling & Scope
  const [historyLimit, setHistoryLimit] = useState<number>(() => {
    try {
      const stored = Number(localStorage.getItem(AUDIT_LIMIT_STORAGE_KEY));
      if ([100, 250, 500, 1000].includes(stored)) return stored;
    } catch {
      // ignore
    }
    return 250;
  });
  const [pollInterval, setPollInterval] = useState<number>(0); // 0 = OFF, 5000 = 5s, 10000 = 10s, 30000 = 30s
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial and dynamic limit loader
  useEffect(() => {
    loadHistory(historyLimit);
  }, [loadHistory, historyLimit]);

  // Live Auto-Polling Stream Effect
  useEffect(() => {
    if (pollInterval <= 0) return;
    const interval = setInterval(() => {
      loadHistory(historyLimit);
    }, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval, historyLimit, loadHistory]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, statusFilter, accountFilter, startDate, endDate, pageSize]);

  const handleSetDatePreset = (preset: 'today' | '7days' | '30days') => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past7.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setActionFilter('ALL');
    setStatusFilter('ALL');
    setAccountFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
      actionFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      accountFilter !== 'ALL' ||
      startDate ||
      endDate
  );

  const handleLimitChange = (newLimit: number) => {
    setHistoryLimit(newLimit);
    try {
      localStorage.setItem(AUDIT_LIMIT_STORAGE_KEY, String(newLimit));
    } catch {
      // ignore
    }
    toast.info(`Audit scope set to fetch last ${newLimit} events.`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadHistory(historyLimit);
      toast.success('Audit history refreshed from node database.');
    } catch {
      toast.error('Failed to refresh history.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePruneLogs = async (type: '30days' | '7days' | 'failed' | 'all') => {
    setIsPruning(true);
    try {
      if (type === 'all') {
        const res = await apiClient.clearAllHistory();
        if (res.success) {
          toast.success(
            `🧹 Entire audit history cleared (${res.deletedCount} logs removed).`
          );
        }
      } else if (type === 'failed') {
        const res = await apiClient.pruneHistory({ status: 'FAILED' });
        if (res.success) {
          toast.success(`🧹 Successfully pruned ${res.deletedCount} FAILED status logs.`);
        }
      } else {
        const days = type === '30days' ? 30 : 7;
        const res = await apiClient.pruneHistory({ olderThanDays: days });
        if (res.success) {
          toast.success(
            `🧹 Successfully pruned ${res.deletedCount} logs older than ${days} days.`
          );
        }
      }
      setIsPruneModalOpen(false);
      await loadHistory(historyLimit);
    } catch (err: any) {
      toast.error(`Maintenance failed: ${err.message}`);
    } finally {
      setIsPruning(false);
    }
  };

  // Unique Account Options (from store accounts + existing history records)
  const accountOptions = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.name) set.add(a.name);
    });
    history.forEach((h) => {
      if (h.accountName) set.add(h.accountName);
    });
    return Array.from(set).sort();
  }, [accounts, history]);

  // Status Counts for current search, action, account, and date context
  const statusCounts: StatusCounts = useMemo(() => {
    let all = 0;
    let success = 0;
    let failed = 0;
    let alreadyDone = 0;

    history.forEach((item) => {
      // Check search match
      const matchesSearch =
        !searchTerm ||
        (item.tweetUrl && item.tweetUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.accountName && item.accountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.message && item.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.details && item.details.toLowerCase().includes(searchTerm.toLowerCase()));

      // Check action match
      const matchesAction = actionFilter === 'ALL' || item.action === actionFilter;

      // Check account match
      const matchesAccount =
        accountFilter === 'ALL' ||
        item.accountName === accountFilter ||
        item.accountId === accountFilter;

      // Check date match
      let matchesDate = true;
      if (startDate || endDate) {
        if (!item.timestamp) {
          matchesDate = false;
        } else {
          const itemDateStr = item.timestamp.slice(0, 10);
          if (startDate && itemDateStr < startDate) matchesDate = false;
          if (endDate && itemDateStr > endDate) matchesDate = false;
        }
      }

      if (matchesSearch && matchesAction && matchesAccount && matchesDate) {
        all += 1;
        if (item.status === 'SUCCESS') success += 1;
        else if (item.status === 'FAILED') failed += 1;
        else if (item.status === 'ALREADY_DONE') alreadyDone += 1;
      }
    });

    return { ALL: all, SUCCESS: success, FAILED: failed, ALREADY_DONE: alreadyDone };
  }, [history, searchTerm, actionFilter, accountFilter, startDate, endDate]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        (item.tweetUrl && item.tweetUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.accountName && item.accountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.message && item.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.details && item.details.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction = actionFilter === 'ALL' || item.action === actionFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesAccount =
        accountFilter === 'ALL' ||
        item.accountName === accountFilter ||
        item.accountId === accountFilter;

      let matchesDate = true;
      if (startDate || endDate) {
        if (!item.timestamp) {
          matchesDate = false;
        } else {
          const itemDateStr = item.timestamp.slice(0, 10);
          if (startDate && itemDateStr < startDate) matchesDate = false;
          if (endDate && itemDateStr > endDate) matchesDate = false;
        }
      }

      return matchesSearch && matchesAction && matchesStatus && matchesAccount && matchesDate;
    });
  }, [history, searchTerm, actionFilter, statusFilter, accountFilter, startDate, endDate]);

  // Statistics for HUD computed from filtered items
  const hudMetrics = useMemo(() => {
    let success = 0;
    let failed = 0;
    let alreadyDone = 0;
    let like = 0;
    let retweet = 0;
    let comment = 0;
    let post = 0;
    const uniqueAccounts = new Set<string>();

    filteredHistory.forEach((h) => {
      if (h.status === 'SUCCESS') success += 1;
      else if (h.status === 'FAILED') failed += 1;
      else if (h.status === 'ALREADY_DONE') alreadyDone += 1;

      if (h.action === 'LIKE') like += 1;
      else if (h.action === 'RETWEET') retweet += 1;
      else if (h.action === 'COMMENT') comment += 1;
      else if (h.action === 'POST') post += 1;

      if (h.accountName) uniqueAccounts.add(h.accountName);
      else if (h.accountId) uniqueAccounts.add(h.accountId);
    });

    return {
      totalCount: filteredHistory.length,
      successCount: success,
      failedCount: failed,
      alreadyDoneCount: alreadyDone,
      likeCount: like,
      retweetCount: retweet,
      commentCount: comment,
      postCount: post,
      activeAccountsCount: uniqueAccounts.size,
    };
  }, [filteredHistory]);

  const handleSort = (key: AuditSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'timestamp' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const sortedHistory = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredHistory].sort((a, b) => {
      if (sortKey === 'timestamp') {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return (ta - tb) * dir;
      }
      const va = String(a[sortKey] ?? '').toLowerCase();
      const vb = String(b[sortKey] ?? '').toLowerCase();
      return va.localeCompare(vb) * dir;
    });
  }, [filteredHistory, sortKey, sortDir]);

  const totalItems = sortedHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedHistory = sortedHistory.slice(startIndex, endIndex);

  // Robust RFC-4180 Blob Downloader
  const downloadBlobFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = (onlyFailed = false) => {
    const targetData = onlyFailed
      ? filteredHistory.filter((i) => i.status === 'FAILED')
      : filteredHistory.length > 0
        ? filteredHistory
        : history;

    if (targetData.length === 0) {
      toast.error(onlyFailed ? 'No failed audit records to export.' : 'No audit records available for export.');
      return;
    }

    const headers = ['ID', 'Timestamp', 'Account', 'Action', 'Target Tweet URL', 'Status', 'Payload Details'];
    const rows = targetData.map((h) => [
      `"${h.id || ''}"`,
      `"${h.timestamp || ''}"`,
      `"${(h.accountName || h.accountId || '').replace(/"/g, '""')}"`,
      `"${h.action || ''}"`,
      `"${(h.tweetUrl || '').replace(/"/g, '""')}"`,
      `"${h.status || ''}"`,
      `"${(h.details || h.message || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = onlyFailed
      ? `x_sentinel_failed_audit_${dateStr}.csv`
      : `x_sentinel_audit_ledger_${dateStr}.csv`;

    downloadBlobFile(csvContent, filename, 'text/csv;charset=utf-8;');
    toast.success(`Exported ${targetData.length} records to ${filename}.`);
  };

  const handleExportJSON = () => {
    const targetData = filteredHistory.length > 0 ? filteredHistory : history;
    if (targetData.length === 0) {
      toast.error('No audit records available for JSON export.');
      return;
    }

    const jsonContent = JSON.stringify(targetData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `x_sentinel_audit_telemetry_${dateStr}.json`;

    downloadBlobFile(jsonContent, filename, 'application/json;charset=utf-8;');
    toast.success(`Exported ${targetData.length} telemetry records to ${filename}.`);
  };

  return (
    <div className="space-y-4">
      {/* Deck Header */}
      <DeckHeader
        tag="IMMUTABLE EVENT LOG"
        tagColor="flame"
        icon={<FileSpreadsheet className="h-5 w-5 text-flame" />}
        isActive={isPruning || isRefreshing}
        title="Audit Ledger & Telemetry History"
        titleBadges={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-700/80 bg-obsidian-950 px-2.5 py-0.5 font-mono text-xs font-bold text-white shadow-inner">
              {totalItems} {totalItems === 1 ? 'Record' : 'Records'}
            </span>
            {hasActiveFilters && totalItems !== history.length && (
              <span className="rounded-md border border-flame/30 bg-flame/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-flame">
                Filtered from {history.length}
              </span>
            )}
            {pollInterval > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                LIVE ({pollInterval / 1000}s)
              </span>
            )}
          </div>
        }
        description="Comprehensive node interaction log, forensic delivery statuses, and telemetry execution timestamps."
        actions={
          <div className="flex shrink-0 items-center gap-2">
            {/* 1. Telemetry Stream & Scope Capsule */}
            <div className="inline-flex h-8 items-center divide-x divide-slate-800 rounded-md border border-slate-700/80 bg-obsidian-950 p-0.5 shadow-inner">
              {/* Stream Polling Control */}
              <div className="flex items-center gap-1.5 px-2 font-mono text-xs">
                <Radio
                  className={cn(
                    'h-3 w-3',
                    pollInterval > 0
                      ? 'text-emerald-400 animate-pulse'
                      : 'text-slate-500'
                  )}
                />
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Stream:</span>
                <select
                  value={pollInterval}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPollInterval(val);
                    if (val > 0) toast.success(`Live stream polling active (${val / 1000}s).`);
                    else toast.info('Live stream polling disabled.');
                  }}
                  className="bg-transparent font-mono text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer hover:text-white"
                  title="Auto-refresh audit logs interval"
                >
                  <option value={0} className="bg-obsidian-900 text-slate-300">
                    OFF
                  </option>
                  <option value={5000} className="bg-obsidian-900 text-slate-300">
                    5s
                  </option>
                  <option value={10000} className="bg-obsidian-900 text-slate-300">
                    10s
                  </option>
                  <option value={30000} className="bg-obsidian-900 text-slate-300">
                    30s
                  </option>
                </select>
              </div>

              {/* History Scope Limit */}
              <div className="flex items-center gap-1.5 px-2 font-mono text-xs">
                <SlidersHorizontal className="h-3 w-3 text-flame" />
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Scope:</span>
                <select
                  value={historyLimit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="bg-transparent font-mono text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer hover:text-white"
                  title="Number of historical events to fetch from database"
                >
                  <option value={100} className="bg-obsidian-900 text-slate-300">
                    100
                  </option>
                  <option value={250} className="bg-obsidian-900 text-slate-300">
                    250
                  </option>
                  <option value={500} className="bg-obsidian-900 text-slate-300">
                    500
                  </option>
                  <option value={1000} className="bg-obsidian-900 text-slate-300">
                    1000
                  </option>
                </select>
              </div>
            </div>

            {/* 2. Export & Refresh Segmented Toolbar */}
            <div className="inline-flex h-8 items-center divide-x divide-slate-800 rounded-md border border-slate-700/80 bg-obsidian-950 p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => handleExportCSV(false)}
                className="inline-flex h-7 items-center gap-1.5 px-2.5 font-mono text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-emerald-300 focus:outline-none"
                title="Export filtered records to spreadsheet (CSV)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex h-7 items-center gap-1.5 px-2.5 font-mono text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-sky-300 focus:outline-none"
                title="Export complete telemetry payload as JSON"
              >
                <FileJson className="h-3.5 w-3.5 text-sky-400" />
                <span>JSON</span>
              </button>

              {hudMetrics.failedCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleExportCSV(true)}
                  className="inline-flex h-7 items-center gap-1.5 bg-rose-950/40 px-2.5 font-mono text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-900/60 hover:text-rose-100 focus:outline-none"
                  title={`Export ${hudMetrics.failedCount} failed records for incident report`}
                >
                  <AlertOctagon className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                  <span>Failures ({hudMetrics.failedCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-200 focus:outline-none disabled:opacity-50"
                title="Refresh audit ledger data from database"
                aria-label="Refresh audit data"
              >
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    isRefreshing && 'animate-spin text-flame'
                  )}
                />
              </button>
            </div>

            {/* 3. Maintenance Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPruneModalOpen(true)}
              className="h-8 shrink-0 gap-1.5 border-rose-500/30 bg-rose-950/20 px-2.5 font-mono text-xs font-semibold text-rose-300 transition-colors hover:border-rose-500/60 hover:bg-rose-900/30 hover:text-rose-200 shadow-sm"
              title="Prune legacy or failed audit logs"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden sm:inline">Maintenance</span>
            </Button>
          </div>
        }
      />

      {/* Forensic Telemetry Metrics HUD */}
      <AuditStatsHUD
        totalCount={hudMetrics.totalCount}
        successCount={hudMetrics.successCount}
        failedCount={hudMetrics.failedCount}
        alreadyDoneCount={hudMetrics.alreadyDoneCount}
        likeCount={hudMetrics.likeCount}
        retweetCount={hudMetrics.retweetCount}
        commentCount={hudMetrics.commentCount}
        postCount={hudMetrics.postCount}
        activeAccountsCount={hudMetrics.activeAccountsCount}
        onSelectStatus={(status) => setStatusFilter(status)}
      />

      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardContent className="space-y-4 pt-6">
          {/* Deep Filter Suite */}
          <AuditFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            actionFilter={actionFilter}
            setActionFilter={setActionFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusCounts={statusCounts}
            accountFilter={accountFilter}
            setAccountFilter={setAccountFilter}
            accountOptions={accountOptions}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onSetPreset={handleSetDatePreset}
            onClearDate={handleClearDateFilter}
            onResetAll={handleResetAllFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Ledger Table (skeleton while hydrating) */}
          {!historyHydrated ? (
            <div className="space-y-2 rounded-md border border-border/80 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <AuditTable
              items={paginatedHistory}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onSelectItem={(item) => setSelectedItem(item)}
              onFilterAccount={(acc) => setAccountFilter(acc)}
              onFilterStatus={(st) => setStatusFilter(st)}
            />
          )}

          {/* Pagination */}
          <AuditPagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            setPageSize={setPageSize}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />

          {/* Maintenance & Prune Modal */}
          <MaintenanceModal
            isOpen={isPruneModalOpen}
            onClose={() => setIsPruneModalOpen(false)}
            isPruning={isPruning}
            onPrune={handlePruneLogs}
          />

          {/* Forensic Event Detail Inspector Modal */}
          <AuditDetailModal
            item={selectedItem}
            isOpen={Boolean(selectedItem)}
            onClose={() => setSelectedItem(null)}
            onFilterAccount={(acc) => {
              setAccountFilter(acc);
              setSelectedItem(null);
            }}
            onFilterTweet={(url) => {
              setSearchTerm(url);
              setSelectedItem(null);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
