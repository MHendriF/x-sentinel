import React from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HistoryItem } from '@/services/apiClient';
import { timeAgo } from './AuditTable';
import { toast } from 'sonner';

interface AuditDetailModalProps {
  item: HistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onFilterAccount?: (accountName: string) => void;
  onFilterTweet?: (tweetUrl: string) => void;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onFilterAccount,
  onFilterTweet,
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard.`);
    setTimeout(() => {
      setCopiedField((cur) => (cur === fieldName ? null : cur));
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
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            SUCCESS
          </span>
        );
      case 'ALREADY_DONE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
            ALREADY DONE
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-950/40 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-rose-300">
            <AlertTriangle className="h-3 w-3 text-rose-400" />
            FAILED
          </span>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDiagnosticRemedy = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes('429') || lower.includes('rate limit')) {
      return {
        title: 'Rate Limit Throttling (HTTP 429)',
        remedy:
          'X is temporarily throttling actions for this node. Increase interaction delays in Defense Protocol and allow the account to cool down.',
      };
    }
    if (
      lower.includes('auth') ||
      lower.includes('cookie') ||
      lower.includes('session') ||
      lower.includes('login')
    ) {
      return {
        title: 'Session Authentication Drop',
        remedy:
          'The auth_token or ct0 session cookie has expired or was revoked. Refresh the account credentials in Nodes Grid.',
      };
    }
    if (lower.includes('timeout') || lower.includes('proxy') || lower.includes('network')) {
      return {
        title: 'Proxy or Network Latency Timeout',
        remedy:
          'The proxy server did not respond within the target threshold. Run Fleet Proxy Radar in Nodes Grid to verify proxy uptime.',
      };
    }
    if (lower.includes('not found') || lower.includes('selector') || lower.includes('element')) {
      return {
        title: 'DOM Element / Target Unavailable',
        remedy:
          'The target tweet may have been deleted, protected, or X layout modified. Verify the tweet URL manually in a browser.',
      };
    }
    return {
      title: 'Execution Error',
      remedy:
        'Review the detailed message above and verify node operational state and browser engine health.',
    };
  };

  const rawDetails = item.details || item.message || '';
  const isFailed = item.status === 'FAILED';
  const diagnostic = isFailed ? getDiagnosticRemedy(rawDetails) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border/80 bg-obsidian-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-obsidian-950 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-flame/30 bg-flame/10 text-flame">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white">Event Telemetry Inspector</span>
                {getActionBadge(item.action)}
                {getStatusBadge(item.status)}
              </div>
              <span className="font-mono text-[10px] text-slate-500">
                ID: {item.id || 'N/A'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-obsidian-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-obsidian-950 p-3.5 sm:grid-cols-2">
            {/* Timestamp */}
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                <Calendar className="h-3 w-3 text-flame" />
                Timestamp &amp; Age
              </span>
              <div className="text-slate-200 font-semibold">
                {item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : '-'}
              </div>
              <div className="text-[10px] text-slate-500">
                {item.timestamp ? `${timeAgo(item.timestamp)} (${item.timestamp})` : '-'}
              </div>
            </div>

            {/* Account Node */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                  <User className="h-3 w-3 text-sky-400" />
                  Account Node
                </span>
                {item.accountName && (
                  <button
                    type="button"
                    onClick={() => handleCopy(item.accountName || '', 'Account')}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedField === 'Account' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>Copy</span>
                  </button>
                )}
              </div>
              <div className="text-white font-bold text-sm">
                {item.accountName || item.accountId || 'System'}
              </div>
              {item.accountId && (
                <div className="text-[10px] text-slate-500">Node ID: {item.accountId}</div>
              )}
            </div>
          </div>

          {/* Target Tweet URL */}
          <div className="rounded-lg border border-border/60 bg-obsidian-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                <Activity className="h-3 w-3 text-emerald-400" />
                Target Tweet / Post URL
              </span>
              {item.tweetUrl && item.tweetUrl !== '-' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.tweetUrl, 'Tweet URL')}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedField === 'Tweet URL' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>Copy URL</span>
                  </button>
                  <a
                    href={item.tweetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-flame hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Open in X</span>
                  </a>
                </div>
              )}
            </div>
            <div className="break-all rounded bg-obsidian-900 p-2 font-mono text-xs text-slate-300 border border-border/40">
              {item.tweetUrl && item.tweetUrl !== '-' ? item.tweetUrl : 'N/A (System / Standalone Task)'}
            </div>
          </div>

          {/* Message / Payload Content */}
          <div className="rounded-lg border border-border/60 bg-obsidian-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Execution Payload &amp; Message Details
              </span>
              {rawDetails && (
                <button
                  type="button"
                  onClick={() => handleCopy(rawDetails, 'Payload')}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedField === 'Payload' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>Copy Payload</span>
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-obsidian-900 p-3 font-mono text-xs text-slate-300 border border-border/40 select-all">
              {rawDetails || '(No additional details logged)'}
            </div>
          </div>

          {/* Diagnostic Box for Failures */}
          {diagnostic && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-rose-300 text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>Forensic Diagnosis: {diagnostic.title}</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                {diagnostic.remedy}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-obsidian-950 px-5 py-3">
          <div className="flex items-center gap-2">
            {item.accountName && onFilterAccount && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onFilterAccount(item.accountName!);
                  onClose();
                }}
                className="h-7 text-xs font-mono gap-1 border-slate-700 bg-obsidian-900 hover:bg-obsidian-800"
              >
                <Filter className="h-3 w-3 text-sky-400" />
                <span>Filter this Node</span>
              </Button>
            )}
            {item.tweetUrl && item.tweetUrl !== '-' && onFilterTweet && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onFilterTweet(item.tweetUrl);
                  onClose();
                }}
                className="h-7 text-xs font-mono gap-1 border-slate-700 bg-obsidian-900 hover:bg-obsidian-800"
              >
                <Filter className="h-3 w-3 text-flame" />
                <span>Filter this Tweet</span>
              </Button>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={onClose} className="h-7 text-xs font-mono px-4">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
