import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { HistoryItem } from '@/services/apiClient';

export type AuditSortKey = 'timestamp' | 'accountName' | 'action' | 'status';
export type AuditSortDir = 'asc' | 'desc';

interface AuditTableProps {
  items: HistoryItem[];
  sortKey: AuditSortKey;
  sortDir: AuditSortDir;
  onSort: (key: AuditSortKey) => void;
}

/** Compact relative timestamp for fast scanning ("2h ago") */
export const timeAgo = (ts?: string): string => {
  if (!ts) return '';
  const t = new Date(ts).getTime();
  if (isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(t).toLocaleDateString('en-US');
};

const SORTABLE_COLUMNS: Array<{ key: AuditSortKey; label: string }> = [
  { key: 'timestamp', label: 'Date & Time' },
  { key: 'accountName', label: 'Account Node' },
  { key: 'action', label: 'Vector' },
  { key: 'status', label: 'Status' },
];

export const AuditTable: React.FC<AuditTableProps> = ({ items, sortKey, sortDir, onSort }) => {
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
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return { date: dateStr, time: timeStr };
  };

  const SortHeader: React.FC<{ column: AuditSortKey; label: string }> = ({ column, label }) => {
    const isSorted = sortKey === column;
    const Arrow = !isSorted ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown;
    return (
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
        className={`flex items-center gap-1 uppercase transition-colors hover:text-slate-200 ${
          isSorted ? 'text-flame' : ''
        }`}
      >
        {label}
        <Arrow className="h-3 w-3" />
      </button>
    );
  };

  const sortableMap = Object.fromEntries(SORTABLE_COLUMNS.map((c) => [c.key, c.label]));

  return (
    <div className="overflow-x-auto rounded-md border border-border/80">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border/80 bg-obsidian-950/80 font-mono text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">
              <SortHeader column="timestamp" label={sortableMap.timestamp} />
            </th>
            <th className="px-4 py-3">
              <SortHeader column="accountName" label={sortableMap.accountName} />
            </th>
            <th className="px-4 py-3">
              <SortHeader column="action" label={sortableMap.action} />
            </th>
            <th className="px-4 py-3">Target Tweet / Post</th>
            <th className="px-4 py-3">
              <SortHeader column="status" label={sortableMap.status} />
            </th>
            <th className="px-4 py-3">Details / Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono">
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-slate-500">
                No interaction history matching current filters.
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
                      <span className="text-[10px] text-slate-400">
                        {time}
                        {timeAgo(item.timestamp) && ` · ${timeAgo(item.timestamp)}`}
                      </span>
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
