import { useMemo } from 'react';
import { Account, HistoryItem, Stats } from '@/services/apiClient';

export type TimeframeOption = '24h' | '7d' | '30d' | 'all';

export interface EnrichedNodeLeaderboard {
  id: string;
  name: string;
  username: string;
  count: number;
  likes: number;
  retweets: number;
  comments: number;
  posts: number;
  successRate: number;
  healthStatus?: 'HEALTHY' | 'EXPIRED' | 'PROXY_DEAD' | 'UNKNOWN_ERROR';
  proxy?: string;
  avatar?: string;
}

export interface HourlyActivityPoint {
  hour: string;
  hourNumber: number;
  total: number;
  likes: number;
  retweets: number;
  comments: number;
  posts: number;
  failures: number;
}

export interface FailureCategory {
  category: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FailureDiagnostics {
  failureCount: number;
  totalAttempts: number;
  reliabilityIndex: number;
  categories: FailureCategory[];
  affectedNodes: Array<{ accountId: string; accountName: string; failedCount: number }>;
}

export interface AnalyticsData {
  totalLikes: number;
  totalRetweets: number;
  totalComments: number;
  totalPosts: number;
  totalActions: number;
  successRate: number;
  todayStats: {
    todayLikes: number;
    todayRetweets: number;
    todayComments: number;
    todayPosts: number;
    todayTotal: number;
  };
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
  fullNodeLeaderboard: EnrichedNodeLeaderboard[];
  hourlyActivityData: HourlyActivityPoint[];
  peakHour: { hour: string; count: number };
  failureDiagnostics: FailureDiagnostics;
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
  accounts: Account[],
  timeframe: TimeframeOption = 'all',
  selectedNodeId: string = 'all'
): AnalyticsData {
  // 1. Filter history by timeframe & selected node
  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const timeframeThreshold = (() => {
      switch (timeframe) {
        case '24h':
          return now - 24 * 60 * 60 * 1000;
        case '7d':
          return now - 7 * 24 * 60 * 60 * 1000;
        case '30d':
          return now - 30 * 24 * 60 * 60 * 1000;
        case 'all':
        default:
          return 0;
      }
    })();

    const targetAccount =
      selectedNodeId !== 'all' ? accounts.find((a) => a.id === selectedNodeId) : null;

    return history.filter((item) => {
      // Timeframe check
      if (timeframeThreshold > 0 && item.timestamp) {
        const itemTime = new Date(item.timestamp).getTime();
        if (isNaN(itemTime) || itemTime < timeframeThreshold) return false;
      }

      // Node check
      if (selectedNodeId !== 'all') {
        const matchId = item.accountId === selectedNodeId;
        const matchHandle =
          targetAccount &&
          item.accountName &&
          (item.accountName === targetAccount.username ||
            item.accountName === targetAccount.label ||
            `@${item.accountName}` === targetAccount.username);
        if (!matchId && !matchHandle) return false;
      }

      return true;
    });
  }, [history, timeframe, selectedNodeId, accounts]);

  // 2. Cumulative Action Counts
  const isGlobalScope = timeframe === 'all' && selectedNodeId === 'all';

  const totalLikes = useMemo(() => {
    const historyLikes = filteredHistory.filter(
      (h) => h.action === 'LIKE' && h.status === 'SUCCESS'
    ).length;
    if (isGlobalScope && typeof stats?.totalLikes === 'number' && stats.totalLikes > historyLikes) {
      return stats.totalLikes;
    }
    return historyLikes;
  }, [filteredHistory, isGlobalScope, stats]);

  const totalRetweets = useMemo(() => {
    const historyRts = filteredHistory.filter(
      (h) => h.action === 'RETWEET' && h.status === 'SUCCESS'
    ).length;
    if (
      isGlobalScope &&
      typeof stats?.totalRetweets === 'number' &&
      stats.totalRetweets > historyRts
    ) {
      return stats.totalRetweets;
    }
    return historyRts;
  }, [filteredHistory, isGlobalScope, stats]);

  const totalComments = useMemo(() => {
    const historyComments = filteredHistory.filter(
      (h) => h.action === 'COMMENT' && h.status === 'SUCCESS'
    ).length;
    if (
      isGlobalScope &&
      typeof stats?.totalComments === 'number' &&
      stats.totalComments > historyComments
    ) {
      return stats.totalComments;
    }
    return historyComments;
  }, [filteredHistory, isGlobalScope, stats]);

  const totalPosts = useMemo(() => {
    const historyPosts = filteredHistory.filter(
      (h) => (h.action === 'POST' || (h.action as string) === 'TWEET') && h.status === 'SUCCESS'
    ).length;
    if (isGlobalScope && typeof stats?.totalPosts === 'number' && stats.totalPosts > historyPosts) {
      return stats.totalPosts;
    }
    return historyPosts;
  }, [filteredHistory, isGlobalScope, stats]);

  const totalActions = totalLikes + totalRetweets + totalComments + totalPosts;

  // 3. Today Stats & Deltas
  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayItems = filteredHistory.filter(
      (h) => h.status === 'SUCCESS' && h.timestamp && h.timestamp.startsWith(todayStr)
    );

    const calcLikes = todayItems.filter((h) => h.action === 'LIKE').length;
    const calcRts = todayItems.filter((h) => h.action === 'RETWEET').length;
    const calcComments = todayItems.filter((h) => h.action === 'COMMENT').length;
    const calcPosts = todayItems.filter(
      (h) => h.action === 'POST' || (h.action as string) === 'TWEET'
    ).length;

    const todayLikes =
      isGlobalScope && stats?.todayLikes ? Math.max(stats.todayLikes, calcLikes) : calcLikes;
    const todayRetweets =
      isGlobalScope && stats?.todayRetweets ? Math.max(stats.todayRetweets, calcRts) : calcRts;
    const todayComments =
      isGlobalScope && stats?.todayComments ? Math.max(stats.todayComments, calcComments) : calcComments;
    const todayPosts =
      isGlobalScope && stats?.todayPosts ? Math.max(stats.todayPosts, calcPosts) : calcPosts;
    const todayTotal = todayLikes + todayRetweets + todayComments + todayPosts;

    return {
      todayLikes,
      todayRetweets,
      todayComments,
      todayPosts,
      todayTotal,
    };
  }, [filteredHistory, isGlobalScope, stats]);

  // 4. Success Rate
  const successRate = useMemo(() => {
    if (filteredHistory.length === 0) return 100;
    const successCount = filteredHistory.filter(
      (h) => h.status === 'SUCCESS' || h.status === 'ALREADY_DONE'
    ).length;
    return Math.round((successCount / filteredHistory.length) * 100);
  }, [filteredHistory]);

  // 5. Daily & Hourly Trend Data
  const dailyTrendData = useMemo(() => {
    const empty = { likes: 0, retweets: 0, comments: 0, posts: 0 };
    const successItems = filteredHistory.filter(
      (h) => (h.status === 'SUCCESS' || h.status === 'ALREADY_DONE') && h.timestamp
    );

    if (successItems.length === 0) {
      if (totalActions === 0) return [];
      return [
        {
          date: 'Hari ini',
          ...empty,
          likes: totalLikes,
          retweets: totalRetweets,
          comments: totalComments,
          posts: totalPosts,
        },
      ];
    }

    const bump = (
      map: Record<
        string,
        { date: string; likes: number; retweets: number; comments: number; posts: number }
      >,
      key: string,
      action: string
    ) => {
      if (!map[key]) map[key] = { date: key, ...empty };
      if (action === 'LIKE') map[key].likes += 1;
      if (action === 'RETWEET') map[key].retweets += 1;
      if (action === 'COMMENT') map[key].comments += 1;
      if (action === 'POST' || (action as string) === 'TWEET') map[key].posts += 1;
    };

    const distinctDays = new Set(successItems.map((i) => i.timestamp.slice(0, 10)));

    if (distinctDays.size <= 2 || timeframe === '24h') {
      const hourly: Record<
        string,
        { date: string; likes: number; retweets: number; comments: number; posts: number }
      > = {};
      successItems.forEach((item) => {
        const hour = new Date(item.timestamp).getHours();
        const key = `${item.timestamp.slice(5, 10)} ${String(hour).padStart(2, '0')}:00`;
        bump(hourly, key, item.action);
      });
      return Object.values(hourly).sort((a, b) => a.date.localeCompare(b.date));
    }

    const daily: Record<
      string,
      { date: string; likes: number; retweets: number; comments: number; posts: number }
    > = {};
    successItems.forEach((item) => {
      bump(daily, item.timestamp.slice(0, 10), item.action);
    });
    return Object.values(daily)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((d) => ({ ...d, date: d.date.slice(5) }));
  }, [filteredHistory, totalLikes, totalRetweets, totalComments, totalPosts, totalActions, timeframe]);

  // 6. Enriched Node Leaderboard
  const fullNodeLeaderboard = useMemo<EnrichedNodeLeaderboard[]>(() => {
    const counts: Record<string, EnrichedNodeLeaderboard> = {};

    accounts.forEach((acc) => {
      const handle = `@${acc.username || acc.label}`;
      const accLikes = acc.stats?.likes || 0;
      const accRts = acc.stats?.retweets || 0;
      const accComments = acc.stats?.comments || 0;
      const accPosts = acc.stats?.posts || 0;
      const totalAccStats = accLikes + accRts + accComments + accPosts;

      counts[acc.id] = {
        id: acc.id,
        name: acc.label || acc.username || 'Node',
        username: handle,
        count: totalAccStats,
        likes: accLikes,
        retweets: accRts,
        comments: accComments,
        posts: accPosts,
        successRate: 100,
        healthStatus: acc.healthStatus,
        proxy: acc.proxy,
        avatar: acc.avatar,
      };
    });

    const historyCountsByAcc: Record<
      string,
      { likes: number; retweets: number; comments: number; posts: number; successes: number; fails: number }
    > = {};

    filteredHistory.forEach((item) => {
      const id = item.accountId || (item.accountName ? `@${item.accountName}` : 'unknown');
      if (!historyCountsByAcc[id]) {
        historyCountsByAcc[id] = { likes: 0, retweets: 0, comments: 0, posts: 0, successes: 0, fails: 0 };
      }
      if (item.status === 'SUCCESS' || item.status === 'ALREADY_DONE') {
        historyCountsByAcc[id].successes += 1;
        if (item.action === 'LIKE') historyCountsByAcc[id].likes += 1;
        if (item.action === 'RETWEET') historyCountsByAcc[id].retweets += 1;
        if (item.action === 'COMMENT') historyCountsByAcc[id].comments += 1;
        if (item.action === 'POST' || (item.action as string) === 'TWEET') historyCountsByAcc[id].posts += 1;
      } else {
        historyCountsByAcc[id].fails += 1;
      }
    });

    Object.keys(historyCountsByAcc).forEach((idOrHandle) => {
      const matchedAccount = accounts.find(
        (a) =>
          a.id === idOrHandle || `@${a.username}` === idOrHandle || `@${a.label}` === idOrHandle
      );
      const hData = historyCountsByAcc[idOrHandle];
      const hTotalSuccess = hData.likes + hData.retweets + hData.comments + hData.posts;
      const totalAttempts = hTotalSuccess + hData.fails;
      const nodeSuccessRate = totalAttempts > 0 ? Math.round((hTotalSuccess / totalAttempts) * 100) : 100;

      if (matchedAccount) {
        if (counts[matchedAccount.id]) {
          // If timeframe is scoped, use the scoped counts
          if (!isGlobalScope) {
            counts[matchedAccount.id].count = hTotalSuccess;
            counts[matchedAccount.id].likes = hData.likes;
            counts[matchedAccount.id].retweets = hData.retweets;
            counts[matchedAccount.id].comments = hData.comments;
            counts[matchedAccount.id].posts = hData.posts;
          } else {
            counts[matchedAccount.id].count = Math.max(counts[matchedAccount.id].count, hTotalSuccess);
            counts[matchedAccount.id].likes = Math.max(counts[matchedAccount.id].likes, hData.likes);
            counts[matchedAccount.id].retweets = Math.max(counts[matchedAccount.id].retweets, hData.retweets);
            counts[matchedAccount.id].comments = Math.max(counts[matchedAccount.id].comments, hData.comments);
            counts[matchedAccount.id].posts = Math.max(counts[matchedAccount.id].posts, hData.posts);
          }
          counts[matchedAccount.id].successRate = nodeSuccessRate;
        }
      } else {
        counts[idOrHandle] = {
          id: idOrHandle,
          name: idOrHandle.replace('@', ''),
          username: idOrHandle.startsWith('@') ? idOrHandle : `@${idOrHandle}`,
          count: hTotalSuccess,
          likes: hData.likes,
          retweets: hData.retweets,
          comments: hData.comments,
          posts: hData.posts,
          successRate: nodeSuccessRate,
        };
      }
    });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [accounts, filteredHistory, isGlobalScope]);

  // 7. Donut Chart Data
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

  // 8. 24-Hour Peak Activity Distribution (Hourly Histogram)
  const { hourlyActivityData, peakHour } = useMemo(() => {
    const hours: HourlyActivityPoint[] = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      hourNumber: i,
      total: 0,
      likes: 0,
      retweets: 0,
      comments: 0,
      posts: 0,
      failures: 0,
    }));

    filteredHistory.forEach((item) => {
      if (!item.timestamp) return;
      const h = new Date(item.timestamp).getHours();
      if (h >= 0 && h < 24) {
        hours[h].total += 1;
        if (item.status === 'SUCCESS' || item.status === 'ALREADY_DONE') {
          if (item.action === 'LIKE') hours[h].likes += 1;
          if (item.action === 'RETWEET') hours[h].retweets += 1;
          if (item.action === 'COMMENT') hours[h].comments += 1;
          if (item.action === 'POST' || (item.action as string) === 'TWEET') hours[h].posts += 1;
        } else {
          hours[h].failures += 1;
        }
      }
    });

    let maxHour = { hour: '12:00', count: 0 };
    hours.forEach((pt) => {
      if (pt.total > maxHour.count) {
        maxHour = { hour: pt.hour, count: pt.total };
      }
    });

    return { hourlyActivityData: hours, peakHour: maxHour };
  }, [filteredHistory]);

  // 9. Failure & Anomaly Diagnostics
  const failureDiagnostics = useMemo<FailureDiagnostics>(() => {
    const failedItems = filteredHistory.filter(
      (h) => h.status !== 'SUCCESS' && h.status !== 'ALREADY_DONE'
    );
    const failureCount = failedItems.length;
    const totalAttempts = filteredHistory.length;
    const reliabilityIndex =
      totalAttempts > 0 ? Math.round(((totalAttempts - failureCount) / totalAttempts) * 1000) / 10 : 100;

    const catCounts: Record<string, number> = {
      RATE_LIMIT: 0,
      AUTH_EXPIRED: 0,
      PROXY_OFFLINE: 0,
      TARGET_NOT_FOUND: 0,
      DOM_SELECTOR: 0,
      OTHER: 0,
    };

    const nodeFails: Record<string, { accountId: string; accountName: string; failedCount: number }> = {};

    failedItems.forEach((item) => {
      const text = `${item.details || ''} ${item.message || ''}`.toLowerCase();
      if (text.includes('rate limit') || text.includes('429') || text.includes('too many requests')) {
        catCounts.RATE_LIMIT += 1;
      } else if (
        text.includes('auth') ||
        text.includes('token') ||
        text.includes('cookie') ||
        text.includes('login') ||
        text.includes('401') ||
        text.includes('403') ||
        text.includes('session expired')
      ) {
        catCounts.AUTH_EXPIRED += 1;
      } else if (
        text.includes('proxy') ||
        text.includes('timeout') ||
        text.includes('econnreset') ||
        text.includes('socket') ||
        text.includes('net::') ||
        text.includes('fetch failed')
      ) {
        catCounts.PROXY_OFFLINE += 1;
      } else if (
        text.includes('not found') ||
        text.includes('deleted') ||
        text.includes('unavailable') ||
        text.includes('404') ||
        text.includes('suspended')
      ) {
        catCounts.TARGET_NOT_FOUND += 1;
      } else if (
        text.includes('selector') ||
        text.includes('locator') ||
        text.includes('element') ||
        text.includes('click')
      ) {
        catCounts.DOM_SELECTOR += 1;
      } else {
        catCounts.OTHER += 1;
      }

      // Group by node
      const nId = item.accountId || item.accountName || 'unknown';
      if (!nodeFails[nId]) {
        nodeFails[nId] = {
          accountId: item.accountId || nId,
          accountName: item.accountName ? `@${item.accountName}` : nId,
          failedCount: 0,
        };
      }
      nodeFails[nId].failedCount += 1;
    });

    const categoryMeta: Record<string, { label: string; color: string }> = {
      RATE_LIMIT: { label: 'X Rate Limit (429)', color: '#f59e0b' },
      AUTH_EXPIRED: { label: 'Auth & Cookie Expired', color: '#ef4444' },
      PROXY_OFFLINE: { label: 'Proxy / Network Timeout', color: '#3b82f6' },
      TARGET_NOT_FOUND: { label: 'Target Tweet Gone/404', color: '#a855f7' },
      DOM_SELECTOR: { label: 'UI / Locator Mismatch', color: '#10b981' },
      OTHER: { label: 'Uncategorized Anomaly', color: '#64748b' },
    };

    const categories: FailureCategory[] = Object.keys(catCounts)
      .map((key) => ({
        category: key,
        label: categoryMeta[key].label,
        count: catCounts[key],
        percentage: failureCount > 0 ? Math.round((catCounts[key] / failureCount) * 100) : 0,
        color: categoryMeta[key].color,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    const affectedNodes = Object.values(nodeFails).sort((a, b) => b.failedCount - a.failedCount);

    return {
      failureCount,
      totalAttempts,
      reliabilityIndex,
      categories,
      affectedNodes,
    };
  }, [filteredHistory]);

  return {
    totalLikes,
    totalRetweets,
    totalComments,
    totalPosts,
    totalActions,
    successRate,
    todayStats,
    dailyTrendData,
    donutChartData,
    fullNodeLeaderboard,
    hourlyActivityData,
    peakHour,
    failureDiagnostics,
  };
}
