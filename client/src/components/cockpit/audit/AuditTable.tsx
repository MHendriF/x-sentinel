import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { HistoryItem } from '@/services/apiClient';

interface AuditTableProps {
  items: HistoryItem[];
}

export const AuditTable: React.FC<AuditTableProps> = ({ items }) => {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LIKE':
        return <Badge variant="destructive">LIKE</Badge>;
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

  const formatTimestamp = (ts?: string) => {
    if (!ts) return { date: '-', time: '-' };
    const dateObj = new Date(ts);
    if (isNaN(dateObj.getTime())) {
      return { date: ts.slice(0, 10), time: ts.slice(11, 19) || '-' };
    }
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    const timeStr = dateObj.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return { date: dateStr, time: timeStr };
  };

  return (
    <div className="overflow-x-auto rounded-md border border-border/80">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border/80 bg-obsidian-950/80 font-mono text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">DATE &amp; TIME</th>
            <th className="px-4 py-3">ACCOUNT NODE</th>
            <th className="px-4 py-3">VECTOR</th>
            <th className="px-4 py-3">TARGET TWEET / POST</th>
            <th className="px-4 py-3">STATUS</th>
            <th className="px-4 py-3">DETAILS / MESSAGE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono">
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-slate-500">
                Tidak ada riwayat interaksi yang sesuai dengan filter.
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const { date, time } = formatTimestamp(item.timestamp);
              return (
                <tr key={index} className="transition-colors hover:bg-obsidian-900/50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{date}</span>
                      <span className="text-[10px] text-slate-400">{time}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
                    {item.accountName || item.accountId || 'System'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{getActionBadge(item.action)}</td>
                  <td className="max-w-[200px] truncate px-4 py-3">
                    {item.tweetUrl && item.tweetUrl !== '-' ? (
                      <a
                        href={item.tweetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-slate-300 transition-colors hover:text-flame hover:underline"
                        title={item.tweetUrl}
                      >
                        <span className="truncate">{item.tweetUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td
                    className="max-w-[280px] truncate px-4 py-3 text-slate-400"
                    title={item.details || item.message || ''}
                  >
                    {item.details || item.message || '-'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
