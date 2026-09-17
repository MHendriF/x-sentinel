import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Clock,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  X,
  UserCheck,
} from 'lucide-react';
import { TimeframeOption, AnalyticsData } from './useAnalyticsData';
import { Account } from '@/services/apiClient';

interface AnalyticsToolbarProps {
  timeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  selectedNodeId: string;
  onSelectedNodeChange: (nodeId: string) => void;
  accounts: Account[];
  analytics: AnalyticsData;
  isLoading?: boolean;
  onRefresh: () => void;
}

export const AnalyticsToolbar: React.FC<AnalyticsToolbarProps> = ({
  timeframe,
  onTimeframeChange,
  selectedNodeId,
  onSelectedNodeChange,
  accounts,
  analytics,
  isLoading = false,
  onRefresh,
}) => {
  const selectedAccount =
    selectedNodeId !== 'all' ? accounts.find((a) => a.id === selectedNodeId) : null;

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const headers = [
      'Metric / Dimension',
      'Value',
      'Likes',
      'Reposts',
      'Replies',
      'Posts',
      'Success Rate',
    ];

    const rows: string[][] = [
      ['=== FLEET TOTALS ===', '', '', '', '', '', ''],
      [
        'Aggregated Metrics',
        String(analytics.totalActions),
        String(analytics.totalLikes),
        String(analytics.totalRetweets),
        String(analytics.totalComments),
        String(analytics.totalPosts),
        `${analytics.successRate}%`,
      ],
      [
        'Today Velocity',
        String(analytics.todayStats.todayTotal),
        String(analytics.todayStats.todayLikes),
        String(analytics.todayStats.todayRetweets),
        String(analytics.todayStats.todayComments),
        String(analytics.todayStats.todayPosts),
        '-',
      ],
      ['', '', '', '', '', '', ''],
      ['=== NODE PERFORMANCE LEADERBOARD ===', '', '', '', '', '', ''],
      ...analytics.fullNodeLeaderboard.map((n) => [
        `"${n.name} (${n.username})"`,
        String(n.count),
        String(n.likes),
        String(n.retweets),
        String(n.comments),
        String(n.posts),
        `${n.successRate}%`,
      ]),
      ['', '', '', '', '', '', ''],
      ['=== 24-HOUR ACTIVITY DENSITY ===', '', '', '', '', '', ''],
      ...analytics.hourlyActivityData.map((h) => [
        `Hour ${h.hour}`,
        String(h.total),
        String(h.likes),
        String(h.retweets),
        String(h.comments),
        String(h.posts),
        h.failures > 0 ? `Failures: ${h.failures}` : 'Nominal',
      ]),
      ['', '', '', '', '', '', ''],
      ['=== FAILURE & ANOMALY DIAGNOSTICS ===', '', '', '', '', '', ''],
      ...analytics.failureDiagnostics.categories.map((c) => [
        `"${c.label}"`,
        String(c.count),
        `${c.percentage}%`,
        '',
        '',
        '',
        '',
      ]),
    ];

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `x-sentinel-analytics-${timeframe}-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const payload = {
      generatedAt: new Date().toISOString(),
      timeframe,
      selectedNode: selectedAccount
        ? { id: selectedAccount.id, username: selectedAccount.username, label: selectedAccount.label }
        : 'all',
      fleetTotals: {
        totalActions: analytics.totalActions,
        totalLikes: analytics.totalLikes,
        totalRetweets: analytics.totalRetweets,
        totalComments: analytics.totalComments,
        totalPosts: analytics.totalPosts,
        successRate: analytics.successRate,
      },
      todayVelocity: analytics.todayStats,
      hourlyPeakHour: analytics.peakHour,
      failureDiagnostics: analytics.failureDiagnostics,
      nodeLeaderboard: analytics.fullNodeLeaderboard,
      dailyTrend: analytics.dailyTrendData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `x-sentinel-analytics-snapshot-${timeframe}-${timestamp}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-obsidian-900/80 p-3 shadow-inner backdrop-blur-sm">
      {/* Left: Timeframe Scope Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-400">
          <Clock className="h-3 w-3 text-flame" /> Scope:
        </span>
        <button
          onClick={() => onTimeframeChange('24h')}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs transition-all ${
            timeframe === '24h'
              ? 'bg-flame font-bold text-white shadow-sm shadow-flame/30'
              : 'border border-border/60 bg-obsidian-850 text-slate-400 hover:border-slate-600 hover:text-white'
          }`}
        >
          24H (Today)
        </button>
        <button
          onClick={() => onTimeframeChange('7d')}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs transition-all ${
            timeframe === '7d'
              ? 'bg-flame font-bold text-white shadow-sm shadow-flame/30'
              : 'border border-border/60 bg-obsidian-850 text-slate-400 hover:border-slate-600 hover:text-white'
          }`}
        >
          7 Days
        </button>
        <button
          onClick={() => onTimeframeChange('30d')}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs transition-all ${
            timeframe === '30d'
              ? 'bg-flame font-bold text-white shadow-sm shadow-flame/30'
              : 'border border-border/60 bg-obsidian-850 text-slate-400 hover:border-slate-600 hover:text-white'
          }`}
        >
          30 Days
        </button>
        <button
          onClick={() => onTimeframeChange('all')}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs transition-all ${
            timeframe === 'all'
              ? 'bg-flame font-bold text-white shadow-sm shadow-flame/30'
              : 'border border-border/60 bg-obsidian-850 text-slate-400 hover:border-slate-600 hover:text-white'
          }`}
        >
          All Time
        </button>

        {/* Selected Node Drilldown Filter Badge */}
        {selectedAccount && (
          <div className="ml-2 flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-0.5 font-mono text-xs text-cyan-300">
            <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Node:</span>
            <span className="font-bold text-white">@{selectedAccount.username || selectedAccount.label}</span>
            <button
              onClick={() => onSelectedNodeChange('all')}
              className="ml-1 rounded p-0.5 text-slate-400 hover:bg-cyan-900/50 hover:text-white"
              title="Clear node filter"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Actions (Refresh & Export Buttons) */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 border-border/80 bg-obsidian-850 font-mono text-xs text-slate-300 hover:bg-obsidian-800 hover:text-white"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 text-slate-400 ${isLoading ? 'animate-spin text-flame' : ''}`} />
          Refresh
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="h-8 border-emerald-500/30 bg-emerald-950/20 font-mono text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40"
          title="Export CSV Summary"
        >
          <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
          CSV
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJSON}
          className="h-8 border-blue-500/30 bg-blue-950/20 font-mono text-xs font-semibold text-blue-400 hover:bg-blue-950/40"
          title="Export JSON Snapshot"
        >
          <FileJson className="mr-1.5 h-3.5 w-3.5" />
          JSON
        </Button>
      </div>
    </div>
  );
};
