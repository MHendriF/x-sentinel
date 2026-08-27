import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  RefreshCw,
  Download,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  X,
  Filter,
  Trash2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const AuditLedger: React.FC = () => {
  const { history, loadHistory } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Date Range state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pruning & Maintenance state
  const [isPruneModalOpen, setIsPruneModalOpen] = useState(false);
  const [isPruning, setIsPruning] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, startDate, endDate, pageSize]);

  const handlePruneLogs = async (type: '30days' | '7days' | 'failed' | 'all') => {
    setIsPruning(true);
    try {
      if (type === 'all') {
        const res = await apiClient.clearAllHistory();
        if (res.success) {
          toast.success(
            `🧹 Seluruh riwayat audit berhasil dibersihkan (${res.deletedCount} log dihapus).`
          );
        }
      } else if (type === 'failed') {
        const res = await apiClient.pruneHistory({ status: 'FAILED' });
        if (res.success) {
          toast.success(`🧹 Berhasil menghapus ${res.deletedCount} log berstatus FAILED.`);
        }
      } else {
        const days = type === '30days' ? 30 : 7;
        const res = await apiClient.pruneHistory({ olderThanDays: days });
        if (res.success) {
          toast.success(
            `🧹 Berhasil menghapus ${res.deletedCount} log lebih lama dari ${days} hari.`
          );
        }
      }
      setIsPruneModalOpen(false);
      await loadHistory();
    } catch (err: any) {
      toast.error(`Gagal melakukan maintenance: ${err.message}`);
    } finally {
      setIsPruning(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        (item.accountName && item.accountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.tweetUrl && item.tweetUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.details && item.details.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction = actionFilter === 'ALL' || item.action === actionFilter;

      // Date Range filter
      let matchesDate = true;
      if (startDate || endDate) {
        if (!item.timestamp) {
          matchesDate = false;
        } else {
          const itemDateStr = item.timestamp.slice(0, 10); // 'YYYY-MM-DD'
          if (startDate && itemDateStr < startDate) {
            matchesDate = false;
          }
          if (endDate && itemDateStr > endDate) {
            matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [history, searchTerm, actionFilter, startDate, endDate]);

  // Pagination calculations
  const totalItems = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const handleExportCSV = () => {
    const dataToExport = filteredHistory.length > 0 ? filteredHistory : history;
    if (dataToExport.length === 0) {
      toast.error('Tidak ada data audit untuk diekspor.');
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

    toast.success(`Berhasil mengekspor ${dataToExport.length} entri audit ke file CSV.`);
  };

  const renderTimestamp = (item: { timestamp?: string; timeFormatted?: string }) => {
    if (!item.timestamp) {
      return <span className="font-mono text-xs text-slate-400">{item.timeFormatted || '-'}</span>;
    }

    try {
      const d = new Date(item.timestamp);
      if (isNaN(d.getTime())) {
        return (
          <span className="font-mono text-xs text-slate-400">
            {item.timeFormatted || item.timestamp}
          </span>
        );
      }

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');

      return (
        <div className="flex flex-col font-mono leading-tight">
          <span className="whitespace-nowrap text-xs font-medium text-slate-200">
            {day}/{month}/{year}
          </span>
          <span className="text-[10px] text-slate-400">
            {hours}:{minutes}:{seconds}
          </span>
        </div>
      );
    } catch {
      return <span className="font-mono text-xs text-slate-400">{item.timeFormatted || '-'}</span>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LIKE':
        return (
          <Badge variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-400">
            LIKE
          </Badge>
        );
      case 'RETWEET':
        return <Badge variant="success">REPOST</Badge>;
      case 'COMMENT':
        return <Badge variant="blue">COMMENT</Badge>;
      case 'POST':
        return (
          <Badge variant="default" className="border-amber-500/30 bg-amber-500/15 text-amber-300">
            POST
          </Badge>
        );
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success">SUCCESS</Badge>;
      case 'ALREADY_DONE':
        return (
          <Badge variant="default" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
            ALREADY DONE
          </Badge>
        );
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
            IMMUTABLE EVENT LOG
          </div>
          <CardTitle>Interaction Audit Ledger</CardTitle>
          <CardDescription>
            Riwayat lengkap interaksi per node akun, status keberhasilan, dan waktu eksekusi (
            {totalItems} rekaman).
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPruneModalOpen(true)}
            className="gap-1 border-rose-500/40 font-mono text-xs text-rose-300 hover:bg-rose-500/10"
            title="Bersihkan log riwayat lama atau gagal"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            Maintenance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadHistory()}
            className="gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1 font-mono text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters Bar */}
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

          {/* Bottom Filter Row: Date Range Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-flame" />
                <span>FILTER TANGGAL:</span>
              </div>

              <div className="flex items-center gap-1.5 rounded border border-border/80 bg-obsidian-900 px-2.5 py-1">
                <span className="text-[10px] text-slate-500">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="scheme-dark cursor-pointer bg-transparent text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded border border-border/80 bg-obsidian-900 px-2.5 py-1">
                <span className="text-[10px] text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="scheme-dark cursor-pointer bg-transparent text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="h-7 gap-1 px-2 text-[11px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                  Reset Tanggal
                </Button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setStartDate(today);
                  setEndDate(today);
                }}
                className="h-7 bg-obsidian-900 px-2.5 font-mono text-[11px] hover:bg-obsidian-850"
              >
                Hari Ini
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const past = new Date();
                  past.setDate(now.getDate() - 7);
                  setStartDate(past.toISOString().slice(0, 10));
                  setEndDate(now.toISOString().slice(0, 10));
                }}
                className="h-7 bg-obsidian-900 px-2.5 font-mono text-[11px] hover:bg-obsidian-850"
              >
                7 Hari
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const past = new Date();
                  past.setDate(now.getDate() - 30);
                  setStartDate(past.toISOString().slice(0, 10));
                  setEndDate(now.toISOString().slice(0, 10));
                }}
                className="h-7 bg-obsidian-900 px-2.5 font-mono text-[11px] hover:bg-obsidian-850"
              >
                30 Hari
              </Button>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-md border border-border/80">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-border/80 bg-obsidian-900 text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">DATE &amp; TIME</th>
                <th className="px-3 py-2.5">NODE</th>
                <th className="px-3 py-2.5">VECTOR</th>
                <th className="px-3 py-2.5">TARGET TWEET</th>
                <th className="px-3 py-2.5">STATUS</th>
                <th className="px-3 py-2.5">DETAILS / MESSAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-obsidian-850/50">
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center font-body text-xs italic text-slate-500"
                  >
                    Tidak ada rekaman interaksi yang sesuai kriteria.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => {
                  const shortUrl = item.tweetUrl
                    ? item.tweetUrl
                        .replace('https://x.com/', '')
                        .replace('https://twitter.com/', '')
                    : '-';

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-obsidian-800/60">
                      <td className="whitespace-nowrap px-3 py-2.5">{renderTimestamp(item)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-bold text-white">
                        {item.accountName ? `@${item.accountName}` : 'NODE'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {getActionBadge(item.action)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {item.tweetUrl && item.tweetUrl !== '-' ? (
                          <a
                            href={item.tweetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex inline-flex max-w-[180px] items-center gap-1 truncate text-flame hover:underline"
                          >
                            <span className="truncate">{shortUrl}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-2.5 text-slate-300">
                        {item.details || item.message || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col items-center justify-between gap-3 pt-2 font-mono text-xs text-slate-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan{' '}
              <strong className="text-white">
                {totalItems > 0 ? startIndex + 1 : 0} - {endIndex}
              </strong>{' '}
              dari <strong className="text-white">{totalItems}</strong> entri
            </span>

            <div className="ml-3 flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded border border-border/80 bg-obsidian-950 px-2 py-1 text-xs text-white focus:border-flame focus:outline-none"
              >
                {[10, 25, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
              className="h-8 w-8 p-0"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage <= 1}
              className="h-8 w-8 p-0"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="rounded border border-border/80 bg-obsidian-950 px-3 py-1 font-mono text-xs text-slate-200">
              Halaman <strong className="text-flame">{safeCurrentPage}</strong> / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="h-8 w-8 p-0"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              className="h-8 w-8 p-0"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Maintenance & Prune Modal */}
        {isPruneModalOpen && (
          <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-rose-500/40 bg-obsidian-850 p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Trash2 className="h-4 w-4 text-rose-400" />
                  <span>Audit Ledger Maintenance &amp; Pruning</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPruneModalOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Pilih opsi pembersihan data riwayat untuk menjaga performa dan ukuran database:
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePruneLogs('30days')}
                  disabled={isPruning}
                  className="flex items-center justify-between rounded-lg border border-border/80 bg-obsidian-900 p-3 text-left text-xs text-white transition-colors hover:bg-obsidian-800"
                >
                  <div>
                    <div className="font-semibold text-slate-200">Hapus Log &gt; 30 Hari</div>
                    <div className="text-[10px] text-slate-500">
                      Hapus entri riwayat yang dibuat lebih dari 1 bulan lalu
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-flame">&gt; 30 Hari</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePruneLogs('7days')}
                  disabled={isPruning}
                  className="flex items-center justify-between rounded-lg border border-border/80 bg-obsidian-900 p-3 text-left text-xs text-white transition-colors hover:bg-obsidian-800"
                >
                  <div>
                    <div className="font-semibold text-slate-200">Hapus Log &gt; 7 Hari</div>
                    <div className="text-[10px] text-slate-500">
                      Hapus entri riwayat yang dibuat lebih dari 1 minggu lalu
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-amber-400">&gt; 7 Hari</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePruneLogs('failed')}
                  disabled={isPruning}
                  className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-left text-xs text-rose-200 transition-colors hover:bg-rose-950/40"
                >
                  <div>
                    <div className="font-semibold text-rose-300">Hapus Log Gagal (FAILED) Saja</div>
                    <div className="text-[10px] text-slate-400">
                      Bersihkan semua riwayat interaksi yang gagal
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-rose-400">FAILED ONLY</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Apakah Anda yakin ingin MENGHAPUS SEMUA riwayat audit? Tindakan ini tidak dapat dibatalkan.'
                      )
                    ) {
                      handlePruneLogs('all');
                    }
                  }}
                  disabled={isPruning}
                  className="flex items-center justify-between rounded-lg border border-rose-600/50 bg-rose-950/40 p-3 text-left text-xs text-rose-300 transition-colors hover:bg-rose-900/60"
                >
                  <div>
                    <div className="font-semibold text-rose-200">
                      Bersihkan Seluruh Riwayat (Reset)
                    </div>
                    <div className="text-[10px] text-rose-400/80">
                      Hapus 100% data log riwayat di database
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-rose-300">CLEAR ALL</span>
                </button>
              </div>

              <div className="flex justify-end border-t border-border/60 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPruneModalOpen(false)}
                  className="text-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
