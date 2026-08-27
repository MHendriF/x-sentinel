import { useMemo } from 'react';
import { Account, HistoryItem, Stats } from '@/services/apiClient';

export interface AnalyticsData {
  totalLikes: number;
  totalRetweets: number;
  totalComments: number;
  totalPosts: number;
  totalActions: number;
  successRate: number;
  dailyTrendData: Array<{
    date: string;
    likes: number;
    retweets: number;
    comments: number;
    posts: number;
  }>;
  donutChartData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  fullNodeLeaderboard: Array<{
    id: string;
    name: string;
    username: string;
    count: number;
    avatar?: string;
  }>;
}

const NODE_PALETTE = [
  '#f59e0b',
  '#3b82f6',
  '#10b981',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#8b5cf6',
  '#e11d48',
  '#84cc16',
  '#eab308',
];

const OTHERS_COLOR = '#64748b';

export function useAnalyticsData(
  history: HistoryItem[],
  stats: Stats | null,
  accounts: Account[]
): AnalyticsData {
  const totalLikes = useMemo(() => {
    if (typeof stats?.totalLikes === 'number' && stats.totalLikes > 0) return stats.totalLikes;
    return history.filter((h) => h.action === 'LIKE' && h.status === 'SUCCESS').length;
  }, [stats, history]);

  const totalRetweets = useMemo(() => {
    if (typeof stats?.totalRetweets === 'number' && stats.totalRetweets > 0)
      return stats.totalRetweets;
    return history.filter((h) => h.action === 'RETWEET' && h.status === 'SUCCESS').length;
  }, [stats, history]);

  const totalComments = useMemo(() => {
    if (typeof stats?.totalComments === 'number' && stats.totalComments > 0)
      return stats.totalComments;
    return history.filter((h) => h.action === 'COMMENT' && h.status === 'SUCCESS').length;
  }, [stats, history]);

  const totalPosts = useMemo(() => {
    if (typeof stats?.totalPosts === 'number' && stats.totalPosts > 0) return stats.totalPosts;
    return history.filter((h) => h.action === 'POST' && h.status === 'SUCCESS').length;
  }, [stats, history]);

  const totalActions = totalLikes + totalRetweets + totalComments + totalPosts;

  const successRate = useMemo(() => {
    if (history.length === 0) return 100;
    const successCount = history.filter((h) => h.status === 'SUCCESS').length;
    return Math.round((successCount / history.length) * 100);
  }, [history]);

  const dailyTrendData = useMemo(() => {
    const map: Record<
      string,
      { date: string; likes: number; retweets: number; comments: number; posts: number }
    > = {};

    history.forEach((item) => {
      const dateStr = item.timestamp ? item.timestamp.slice(0, 10) : 'Today';
      if (!map[dateStr]) {
        map[dateStr] = { date: dateStr.slice(5), likes: 0, retweets: 0, comments: 0, posts: 0 };
      }
      if (item.action === 'LIKE' && item.status === 'SUCCESS') map[dateStr].likes += 1;
      if (item.action === 'RETWEET' && item.status === 'SUCCESS') map[dateStr].retweets += 1;
      if (item.action === 'COMMENT' && item.status === 'SUCCESS') map[dateStr].comments += 1;
      if (item.action === 'POST' && item.status === 'SUCCESS') map[dateStr].posts += 1;
    });

    const result = Object.values(map);
    if (result.length === 0) {
      return [
        {
          date: 'Today',
          likes: totalLikes,
          retweets: totalRetweets,
          comments: totalComments,
          posts: totalPosts,
        },
      ];
    }
    return result.slice(-14);
  }, [history, totalLikes, totalRetweets, totalComments, totalPosts]);

  const fullNodeLeaderboard = useMemo(() => {
    const counts: Record<
      string,
      { id: string; name: string; username: string; count: number; avatar?: string }
    > = {};

    accounts.forEach((acc) => {
      const handle = `@${acc.username || acc.label}`;
      const accStatsSum =
        (acc.stats?.likes || 0) +
        (acc.stats?.retweets || 0) +
        (acc.stats?.comments || 0) +
        (acc.stats?.posts || 0);
      counts[acc.id] = {
        id: acc.id,
        name: acc.label || acc.username || 'Node',
        username: handle,
        count: accStatsSum,
        avatar: acc.avatar,
      };
    });

    const historyCountsByAcc: Record<string, number> = {};
    history.forEach((item) => {
      if (item.status === 'SUCCESS') {
        const id = item.accountId || (item.accountName ? `@${item.accountName}` : 'unknown');
        historyCountsByAcc[id] = (historyCountsByAcc[id] || 0) + 1;
      }
    });

    Object.keys(historyCountsByAcc).forEach((idOrHandle) => {
      const matchedAccount = accounts.find(
        (a) =>
          a.id === idOrHandle || `@${a.username}` === idOrHandle || `@${a.label}` === idOrHandle
      );
      if (matchedAccount) {
        if (counts[matchedAccount.id]) {
          counts[matchedAccount.id].count = Math.max(
            counts[matchedAccount.id].count,
            historyCountsByAcc[idOrHandle]
          );
        }
      } else {
        counts[idOrHandle] = {
          id: idOrHandle,
          name: idOrHandle.replace('@', ''),
          username: idOrHandle.startsWith('@') ? idOrHandle : `@${idOrHandle}`,
          count: historyCountsByAcc[idOrHandle],
        };
      }
    });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [accounts, history]);

  const donutChartData = useMemo(() => {
    const activeNodes = fullNodeLeaderboard.filter((n) => n.count > 0);
    if (activeNodes.length === 0) {
      return [{ name: 'No Activity Yet', value: 1, color: '#334155' }];
    }

    if (activeNodes.length <= 5) {
      return activeNodes.map((n, i) => ({
        name: n.name,
        value: n.count,
        color: NODE_PALETTE[i % NODE_PALETTE.length],
      }));
    }

    const top4 = activeNodes.slice(0, 4);
    const remaining = activeNodes.slice(4);
    const othersCount = remaining.reduce((acc, curr) => acc + curr.count, 0);

    const result = top4.map((n, i) => ({
      name: n.name,
      value: n.count,
      color: NODE_PALETTE[i % NODE_PALETTE.length],
    }));

    if (othersCount > 0) {
      result.push({
        name: `Others (${remaining.length} nodes)`,
        value: othersCount,
        color: OTHERS_COLOR,
      });
    }

    return result;
  }, [fullNodeLeaderboard]);

  return {
    totalLikes,
    totalRetweets,
    totalComments,
    totalPosts,
    totalActions,
    successRate,
    dailyTrendData,
    donutChartData,
    fullNodeLeaderboard,
  };
}
