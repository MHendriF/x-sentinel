import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Check,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { HistoryItem } from '@/services/apiClient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type AuditSortKey = 'timestamp' | 'accountName' | 'action' | 'status';
export type AuditSortDir = 'asc' | 'desc';

interface AuditTableProps {
  items: HistoryItem[];
  sortKey: AuditSortKey;
  sortDir: AuditSortDir;
  onSort: (key: AuditSortKey) => void;
  onSelectItem?: (item: HistoryItem) => void;
  onFilterAccount?: (accountName: string) => void;
  onFilterStatus?: (status: string) => void;
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

export const AuditTable: React.FC<AuditTableProps> = ({
  items,
  sortKey,
  sortDir,
  onSort,
  onSelectItem,
  onFilterAccount,
  onFilterStatus,
}) => {
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);

  const handleCopyUrl = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('Tweet URL copied to clipboard.');
    setTimeout(() => {
      setCopiedUrl((cur) => (cur === url ? null : cur));
    }, 2000);
  };

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
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onFilterStatus?.('SUCCESS');
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-900/50"
            title="Click to filter SUCCESS logs"
          >
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
            SUCCESS
          </span>
        );
      case 'ALREADY_DONE':
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onFilterStatus?.('ALREADY_DONE');
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-amber-500/30 bg-amber-950/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-400 transition-colors hover:bg-amber-900/40"
            title="Click to filter ALREADY DONE logs"
          >
            ALREADY DONE
          </span>
        );
      case 'FAILED':
        return (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onFilterStatus?.('FAILED');
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-500/50 bg-rose-950/50 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 transition-colors hover:bg-rose-900/60"
            title="Click to filter FAILED logs"
          >
            <AlertTriangle className="h-2.5 w-2.5 text-rose-400 animate-pulse" />
            FAILED
          </span>
        );
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
          isSorted ? 'text-flame font-bold' : ''
        }`}
      >
        {label}
        <Arrow className="h-3 w-3" />
      </button>
    );
  };

  const sortableMap = Object.fromEntries(SORTABLE_COLUMNS.map((c) => [c.key, c.label]));

  return (
    <div className="overflow-x-auto rounded-lg border border-border/80 bg-obsidian-950/40">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border/80 bg-obsidian-950 font-mono text-[10px] uppercase text-muted-foreground">
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
            <th className="px-4 py-3">Payload / Message Details</th>
            <th className="px-3 py-3 text-right">Inspect</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono">
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="font-mono text-sm text-slate-400">No interaction records found</span>
                  <span className="text-[11px] text-slate-500">
                    Try loosening your search terms, date range, or status filters.
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const { date, time } = formatTimestamp(item.timestamp);
              const isFailed = item.status === 'FAILED';
              const isAlreadyDone = item.status === 'ALREADY_DONE';

              return (
                <tr
                  key={item.id || index}
                  onClick={() => onSelectItem?.(item)}
                  className={cn(
                    'group cursor-pointer transition-colors',
                    isFailed
                      ? 'border-l-2 border-l-rose-500 bg-rose-950/15 hover:bg-rose-950/25'
                      : isAlreadyDone
                        ? 'border-l-2 border-l-amber-500/50 bg-amber-950/10 hover:bg-amber-950/20'
                        : 'hover:bg-obsidian-900/60'
                  )}
                >
                  {/* Timestamp */}
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{date}</span>
                      <span className="text-[10px] text-slate-400">
                        {time}
                        {timeAgo(item.timestamp) && ` · ${timeAgo(item.timestamp)}`}
                      </span>
                    </div>
                  </td>

                  {/* Account Node */}
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
                    <span
                      onClick={(e) => {
                        if (item.accountName && onFilterAccount) {
                          e.stopPropagation();
                          onFilterAccount(item.accountName);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:text-sky-400 hover:underline"
                      title="Click to filter logs by this account"
                    >
                      {item.accountName || item.accountId || 'System'}
                    </span>
                  </td>

                  {/* Vector Action */}
                  <td className="whitespace-nowrap px-4 py-3">{getActionBadge(item.action)}</td>

                  {/* Target Tweet URL */}
                  <td className="max-w-[200px] px-4 py-3">
                    {item.tweetUrl && item.tweetUrl !== '-' ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={item.tweetUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="truncate text-slate-300 transition-colors hover:text-flame hover:underline"
                          title={item.tweetUrl}
                        >
                          <span className="truncate">{item.tweetUrl}</span>
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleCopyUrl(e, item.tweetUrl)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white transition-opacity"
                          title="Copy Tweet URL"
                        >
                          {copiedUrl === item.tweetUrl ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <a
                          href={item.tweetUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-0.5 text-slate-400 hover:text-flame"
                          title="Open in X"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(item.status)}</td>

                  {/* Details / Message */}
                  <td
                    className="max-w-[260px] truncate px-4 py-3 text-slate-400"
                    title={item.details || item.message || ''}
                  >
                    <span className={cn(isFailed && 'text-rose-300 font-medium')}>
                      {item.details || item.message || '-'}
                    </span>
                  </td>

                  {/* Inspect Button */}
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem?.(item);
                      }}
                      className="rounded p-1 text-slate-400 opacity-70 transition-all hover:bg-obsidian-800 hover:text-white hover:opacity-100"
                      title="Inspect full event telemetry"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
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
