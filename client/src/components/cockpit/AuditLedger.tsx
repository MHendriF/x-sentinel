import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeckHeader } from './DeckHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RefreshCw, Download, Trash2, FileSpreadsheet } from 'lucide-react';
import { AuditFilters } from './audit/AuditFilters';
import { AuditTable } from './audit/AuditTable';
import type { AuditSortKey, AuditSortDir } from './audit/AuditTable';
import { AuditPagination } from './audit/AuditPagination';
import { MaintenanceModal } from './audit/MaintenanceModal';

export const AuditLedger: React.FC = () => {
  const { history, historyHydrated, loadHistory } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortKey, setSortKey] = useState<AuditSortKey>('timestamp');
  const [sortDir, setSortDir] = useState<AuditSortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPruneModalOpen, setIsPruneModalOpen] = useState(false);
  const [isPruning, setIsPruning] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, startDate, endDate, pageSize]);

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
      await loadHistory();
    } catch (err: any) {
      toast.error(`Maintenance failed: ${err.message}`);
    } finally {
      setIsPruning(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        (item.tweetUrl && item.tweetUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.accountName && item.accountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.message && item.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.details && item.details.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction = actionFilter === 'ALL' || item.action === actionFilter;

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

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [history, searchTerm, actionFilter, startDate, endDate]);

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

  const handleExportCSV = () => {
    const dataToExport = filteredHistory.length > 0 ? filteredHistory : history;
    if (dataToExport.length === 0) {
      toast.error('No audit records available for export.');
      return;
    }

    const headers = ['Timestamp', 'Account', 'Action', 'Tweet URL', 'Status', 'Details'];
    const rows = dataToExport.map((h) => [
      `"${h.timestamp || ''}"`,
      `"${h.accountName || ''}"`,
      `"${h.action || ''}"`,
      `"${h.tweetUrl || ''}"`,
      `"${h.status || ''}"`,
      `"${(h.details || h.message || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `x_automation_audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Successfully exported ${dataToExport.length} audit entries to CSV.`);
  };

  return (
    <div className="space-y-4">
      <DeckHeader
        tag="IMMUTABLE EVENT LOG"
        tagColor="flame"
        icon={<FileSpreadsheet className="h-5 w-5 text-flame" />}
        isActive={isPruning}
        title="Audit Ledger & Telemetry History"
        titleBadges={
          <span className="rounded-md border border-slate-700/80 bg-obsidian-950 px-2.5 py-0.5 font-bold text-white shadow-inner">
            {totalItems} {totalItems === 1 ? 'Record' : 'Records'}
          </span>
        }
        description="Comprehensive node interaction log, delivery statuses, and execution timestamps."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPruneModalOpen(true)}
              className="h-8 gap-1.5 border-rose-500/30 bg-rose-950/20 px-2.5 font-mono text-xs font-semibold text-rose-300 transition-colors hover:border-rose-500/60 hover:bg-rose-900/30 hover:text-rose-200"
              title="Prune legacy or failed audit logs"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span>Maintenance</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadHistory()}
              className="h-8 gap-1.5 border-slate-800 bg-obsidian-950 px-2.5 font-mono text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 gap-1.5 px-3 font-mono text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </>
        }
      />

      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardContent className="space-y-4 pt-6">
        {/* Filters */}
        <AuditFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          actionFilter={actionFilter}
          setActionFilter={setActionFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onSetPreset={handleSetDatePreset}
          onClearDate={handleClearDateFilter}
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
      </CardContent>
    </Card>
    </div>
  );
};
