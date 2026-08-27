import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
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
} from 'lucide-react';
import { toast } from 'sonner';

export const AuditLedger: React.FC = () => {
  const { history, loadHistory } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, pageSize]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        (item.accountName && item.accountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.tweetUrl && item.tweetUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.details && item.details.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction = actionFilter === 'ALL' || item.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [history, searchTerm, actionFilter]);

  // Pagination calculations
  const totalItems = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const handleExportCSV = () => {
    if (history.length === 0) {
      toast.error('Tidak ada data audit untuk diekspor.');
      return;
    }

    const headers = ['Timestamp', 'Account', 'Action', 'Tweet URL', 'Status', 'Details'];
    const rows = history.map((h) => [
      `"${h.timestamp || ''}"`,
      `"${h.accountName || ''}"`,
      `"${h.action || ''}"`,
      `"${h.tweetUrl || ''}"`,
      `"${h.status || ''}"`,
      `"${(h.details || h.message || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `x_automation_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('File CSV berhasil diunduh.');
  };

  const renderTimestamp = (item: { timestamp?: string; timeFormatted?: string }) => {
    if (!item.timestamp) {
      return <span className="text-slate-400 font-mono text-xs">{item.timeFormatted || '-'}</span>;
    }

    try {
      const d = new Date(item.timestamp);
      if (isNaN(d.getTime())) {
        return <span className="text-slate-400 font-mono text-xs">{item.timeFormatted || item.timestamp}</span>;
      }

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');

      return (
        <div className="flex flex-col leading-tight">
          <span className="text-slate-200 font-medium text-xs">{year}-{month}-{day}</span>
          <span className="text-[10px] text-slate-400 font-mono">{hours}:{minutes}:{seconds}</span>
        </div>
      );
    } catch {
      return <span className="text-slate-400 font-mono text-xs">{item.timeFormatted || '-'}</span>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LIKE':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/30">LIKE</Badge>;
      case 'RETWEET':
        return <Badge variant="success">REPOST</Badge>;
      case 'COMMENT':
        return <Badge variant="blue">COMMENT</Badge>;
      case 'POST':
        return <Badge variant="default" className="bg-amber-500/15 text-amber-300 border-amber-500/30">POST</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success">SUCCESS</Badge>;
      case 'ALREADY_DONE':
        return <Badge variant="default" className="bg-amber-500/10 text-amber-400 border-amber-500/30">ALREADY DONE</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 space-y-0">
        <div>
          <div className="font-mono text-[10px] font-bold text-flame tracking-wider">
            IMMUTABLE EVENT LOG
          </div>
          <CardTitle>Interaction Audit Ledger</CardTitle>
          <CardDescription>
            Riwayat lengkap interaksi per node akun, status keberhasilan, dan waktu eksekusi ({totalItems} rekaman).
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadHistory()} className="gap-1 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportCSV} className="gap-1 text-xs font-mono">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-obsidian-950 p-3 rounded-md border border-border/80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Cari URL tweet, akun, atau pesan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'LIKE', 'RETWEET', 'COMMENT', 'POST'].map((act) => (
              <Button
                key={act}
                size="sm"
                variant={actionFilter === act ? 'default' : 'outline'}
                onClick={() => setActionFilter(act)}
                className="h-8 text-xs font-mono px-3"
              >
                {act}
              </Button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-md border border-border/80 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-obsidian-900 border-b border-border/80 text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3">DATE &amp; TIME</th>
                <th className="py-2.5 px-3">NODE</th>
                <th className="py-2.5 px-3">VECTOR</th>
                <th className="py-2.5 px-3">TARGET TWEET</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">DETAILS / MESSAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-obsidian-850/50">
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 italic font-body text-xs">
                    Tidak ada rekaman interaksi yang sesuai kriteria.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => {
                  const shortUrl = item.tweetUrl
                    ? item.tweetUrl.replace('https://x.com/', '').replace('https://twitter.com/', '')
                    : '-';

                  return (
                    <tr key={item.id} className="hover:bg-obsidian-800/60 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderTimestamp(item)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-white">
                        {item.accountName ? `@${item.accountName}` : 'NODE'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getActionBadge(item.action)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.tweetUrl && item.tweetUrl !== '-' ? (
                          <a
                            href={item.tweetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-flame hover:underline flex items-center gap-1 inline-flex max-w-[180px] truncate"
                          >
                            <span className="truncate">{shortUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-2.5 px-3 max-w-[280px] truncate text-slate-300">
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan{' '}
              <strong className="text-white">
                {totalItems > 0 ? startIndex + 1 : 0} - {endIndex}
              </strong>{' '}
              dari <strong className="text-white">{totalItems}</strong> entri
            </span>

            <div className="flex items-center gap-1.5 ml-3">
              <span className="text-[11px] text-slate-500">Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-obsidian-950 border border-border/80 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-flame"
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
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage <= 1}
              className="h-8 w-8 p-0"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-3 py-1 font-mono text-xs text-slate-200 bg-obsidian-950 border border-border/80 rounded">
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
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              className="h-8 w-8 p-0"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
