import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useAnalyticsData, TimeframeOption } from './analytics/useAnalyticsData';
import { AnalyticsToolbar } from './analytics/AnalyticsToolbar';
import { CumulativeBadges } from './analytics/CumulativeBadges';
import { VelocityChart } from './analytics/VelocityChart';
import { HourlyActivityChart } from './analytics/HourlyActivityChart';
import { NodeShareChart } from './analytics/NodeShareChart';
import { FailureDiagnosticsCard } from './analytics/FailureDiagnosticsCard';

export const AnalyticsDeck: React.FC = () => {
  const { history, stats, accounts, loadHistory, loadAccounts } = useStore();
  const [timeframe, setTimeframe] = useState<TimeframeOption>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadHistory(500), loadAccounts()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadHistory, loadAccounts]);

  useEffect(() => {
    // Load larger sample of history for high-fidelity analytics
    loadHistory(500);
    loadAccounts();
  }, [loadHistory, loadAccounts]);

  const analytics = useAnalyticsData(history, stats, accounts, timeframe, selectedNodeId);

  const selectedAccount =
    selectedNodeId !== 'all' ? accounts.find((a) => a.id === selectedNodeId) : null;
  const selectedNodeLabel = selectedAccount
    ? `@${selectedAccount.username || selectedAccount.label}`
    : null;

  return (
    <div className="animate-in fade-in space-y-6">
      {/* 1. Timeframe Scope, Drilldown Filter, & Export Toolbar */}
      <AnalyticsToolbar
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        selectedNodeId={selectedNodeId}
        onSelectedNodeChange={setSelectedNodeId}
        accounts={accounts}
        analytics={analytics}
        isLoading={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* 2. Cumulative Vector Badges with Today Deltas */}
      <CumulativeBadges
        totalLikes={analytics.totalLikes}
        totalRetweets={analytics.totalRetweets}
        totalComments={analytics.totalComments}
        totalPosts={analytics.totalPosts}
        totalActions={analytics.totalActions}
        successRate={analytics.successRate}
        todayStats={analytics.todayStats}
        selectedNodeLabel={selectedNodeLabel}
        onClearNodeFilter={() => setSelectedNodeId('all')}
      />

      {/* 3. Dual Activity Horizons: Velocity Area Chart & 24-Hour Density Bar Chart */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <VelocityChart data={analytics.dailyTrendData} />
        <HourlyActivityChart
          data={analytics.hourlyActivityData}
          peakHour={analytics.peakHour}
        />
      </div>

      {/* 4. Node Workload Share & Interactive Leaderboard */}
      <NodeShareChart
        donutChartData={analytics.donutChartData}
        fullNodeLeaderboard={analytics.fullNodeLeaderboard}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
      />

      {/* 5. Health, Failure & Anomaly Intelligence */}
      <FailureDiagnosticsCard
        diagnostics={analytics.failureDiagnostics}
        onSelectNode={setSelectedNodeId}
      />
    </div>
  );
};
