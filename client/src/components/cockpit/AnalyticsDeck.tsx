import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useAnalyticsData } from './analytics/useAnalyticsData';
import { CumulativeBadges } from './analytics/CumulativeBadges';
import { VelocityChart } from './analytics/VelocityChart';
import { NodeShareChart } from './analytics/NodeShareChart';

export const AnalyticsDeck: React.FC = () => {
  const { history, stats, accounts, loadHistory, loadAccounts } = useStore();

  useEffect(() => {
    loadHistory();
    loadAccounts();
  }, [loadHistory, loadAccounts]);

  const {
    totalLikes,
    totalRetweets,
    totalComments,
    totalPosts,
    totalActions,
    successRate,
    dailyTrendData,
    donutChartData,
    fullNodeLeaderboard,
  } = useAnalyticsData(history, stats, accounts);

  return (
    <div className="animate-in fade-in space-y-6">
      {/* 1. Cumulative Vector Badges */}
      <CumulativeBadges
        totalLikes={totalLikes}
        totalRetweets={totalRetweets}
        totalComments={totalComments}
        totalPosts={totalPosts}
        totalActions={totalActions}
        successRate={successRate}
      />

      {/* 2. Interaction Velocity AreaChart */}
      <VelocityChart data={dailyTrendData} />

      {/* 3. Node Workload Share & Leaderboard */}
      <NodeShareChart donutChartData={donutChartData} fullNodeLeaderboard={fullNodeLeaderboard} />
    </div>
  );
};
