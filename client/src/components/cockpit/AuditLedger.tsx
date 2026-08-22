import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RefreshCw, Download, Search, ExternalLink, Filter } from 'lucide-react';
import { toast } from 'sonner';

export const AuditLedger: React.FC = () => {
  const { history, loadHistory } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      (item.accountName && item.accountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.tweetUrl && item.tweetUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.details && item.details.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = actionFilter === 'ALL' || item.action === actionFilter;

    return matchesSearch && matchesAction;
  });

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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LIKE':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/30">LIKE</Badge>;
      case 'RETWEET':
        return <Badge variant="success">REPOST</Badge>;
      case 'COMMENT':
        return <Badge variant="blue">COMMENT</Badge>;
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
            Riwayat lengkap interaksi per node akun, status keberhasilan, dan waktu eksekusi.
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
            {['ALL', 'LIKE', 'RETWEET', 'COMMENT'].map((act) => (
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
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">NODE</th>
                <th className="py-2.5 px-3">VECTOR</th>
                <th className="py-2.5 px-3">TARGET TWEET</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">DETAILS / MESSAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-obsidian-850/50">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 italic font-body text-xs">
                    Tidak ada rekaman interaksi yang sesuai kriteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const shortUrl = item.tweetUrl
                    ? item.tweetUrl.replace('https://x.com/', '').replace('https://twitter.com/', '')
                    : '-';

                  return (
                    <tr key={item.id} className="hover:bg-obsidian-800/60 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                        {item.timeFormatted || item.timestamp?.slice(11, 19) || '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-white">
                        {item.accountName ? `@${item.accountName}` : 'NODE'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getActionBadge(item.action)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <a
                          href={item.tweetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-flame hover:underline flex items-center gap-1 inline-flex max-w-[180px] truncate"
                        >
                          <span className="truncate">{shortUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
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
      </CardContent>
    </Card>
  );
};
