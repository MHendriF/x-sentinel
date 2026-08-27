import React, { useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  PieChart as PieIcon,
  ShieldCheck,
  RefreshCw,
  Heart,
  Repeat,
  MessageSquare,
  CheckCircle,
  Users,
  Layers,
  Sparkles,
} from 'lucide-react';

const NODE_PALETTE = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#8b5cf6', // Violet
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#eab308', // Yellow
];

const OTHERS_COLOR = '#64748b'; // Slate for lumped remaining nodes

export const AnalyticsDeck: React.FC = () => {
  const { history, stats, accounts, loadHistory, loadAccounts } = useStore();

  useEffect(() => {
    loadHistory();
    loadAccounts();
  }, [loadHistory, loadAccounts]);

  // Synchronized Vector Counts
  const totalLikes = useMemo(() => {
    if (typeof stats?.totalLikes === 'number' && stats.totalLikes > 0) return stats.totalLikes;
    return history.filter((h) => h.action === 'LIKE' && h.status === 'SUCCESS').length;
  }, [stats, history]);

  const totalRetweets = useMemo(() => {
    if (typeof stats?.totalRetweets === 'number' && stats.totalRetweets > 0) return stats.totalRetweets;
    return history.filter((h) => h.action === 'RETWEET' && h.status === 'SUCCESS').length;
  }, [stats, history]);

  const totalComments = useMemo(() => {
    if (typeof stats?.totalComments === 'number' && stats.totalComments > 0) return stats.totalComments;
    return history.filter((h) => h.action === 'COMMENT' && h.status === 'SUCCESS').length;
  }, [stats, history]);

  const totalPosts = useMemo(() => {
    if (typeof stats?.totalPosts === 'number' && stats.totalPosts > 0) return stats.totalPosts;
    return history.filter((h) => h.action === 'POST' && h.status === 'SUCCESS').length;
  }, [stats, history]);

  const totalActions = totalLikes + totalRetweets + totalComments + totalPosts;

  // Aggregate Data for Daily Trend
  const dailyTrendData = useMemo(() => {
    const map: Record<string, { date: string; likes: number; retweets: number; comments: number; posts: number }> = {};

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
        { date: 'Today', likes: totalLikes, retweets: totalRetweets, comments: totalComments, posts: totalPosts },
      ];
    }
    return result.slice(-14);
  }, [history, totalLikes, totalRetweets, totalComments, totalPosts]);

  // Aggregate Node Workload (All nodes sorted by execution count)
  const fullNodeLeaderboard = useMemo(() => {
    const counts: Record<string, { name: string; username: string; count: number; avatar?: string }> = {};

    // 1. Initialize from registered accounts
    accounts.forEach((acc) => {
      const handle = `@${acc.username || acc.label}`;
      const accStatsSum = (acc.stats?.likes || 0) + (acc.stats?.retweets || 0) + (acc.stats?.comments || 0) + (acc.stats?.posts || 0);
      counts[acc.id] = {
        name: acc.label || acc.username || 'Node',
        username: handle,
        count: accStatsSum,
        avatar: acc.avatar,
      };
    });

    // 2. Cross-reference history items
    const historyCountsByAcc: Record<string, number> = {};
    history.forEach((item) => {
      if (item.status === 'SUCCESS') {
        const id = item.accountId || (item.accountName ? `@${item.accountName}` : 'unknown');
        historyCountsByAcc[id] = (historyCountsByAcc[id] || 0) + 1;
      }
    });

    // Merge best accurate count
    const list = Object.entries(counts).map(([key, node]) => {
      const histCount = historyCountsByAcc[key] || (node.username ? historyCountsByAcc[node.username.replace('@', '')] : 0) || 0;
      const finalCount = Math.max(node.count, histCount);
      return {
        id: key,
        name: node.username,
        label: node.name,
        value: finalCount,
        avatar: node.avatar,
      };
    });

    // Sort descending by workload
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [history, accounts]);

  const totalNodeWorkload = useMemo(() => {
    return fullNodeLeaderboard.reduce((sum, item) => sum + item.value, 0);
  }, [fullNodeLeaderboard]);

  // Donut Chart Data: Top 5 nodes + "Others" if nodes > 5
  const donutChartData = useMemo(() => {
    if (fullNodeLeaderboard.length === 0 || totalNodeWorkload === 0) {
      return [];
    }

    const maxIndividualSlices = 5;
    if (fullNodeLeaderboard.length <= maxIndividualSlices) {
      return fullNodeLeaderboard
        .filter((item) => item.value > 0)
        .map((item, idx) => ({
          name: item.name,
          value: item.value,
          color: NODE_PALETTE[idx % NODE_PALETTE.length],
          percentage: ((item.value / totalNodeWorkload) * 100).toFixed(1),
        }));
    }

    const topNodes = fullNodeLeaderboard.slice(0, maxIndividualSlices);
    const remainingNodes = fullNodeLeaderboard.slice(maxIndividualSlices);
    const othersValue = remainingNodes.reduce((sum, item) => sum + item.value, 0);

    const slices = topNodes
      .filter((item) => item.value > 0)
      .map((item, idx) => ({
        name: item.name,
        value: item.value,
        color: NODE_PALETTE[idx % NODE_PALETTE.length],
        percentage: ((item.value / totalNodeWorkload) * 100).toFixed(1),
      }));

    if (othersValue > 0) {
      slices.push({
        name: `Lainnya (${remainingNodes.length} nodes)`,
        value: othersValue,
        color: OTHERS_COLOR,
        percentage: ((othersValue / totalNodeWorkload) * 100).toFixed(1),
      });
    }

    return slices;
  }, [fullNodeLeaderboard, totalNodeWorkload]);

  // Aggregate Status Breakdown
  const statusBreakdown = useMemo(() => {
    let success = 0;
    let already = 0;
    let failed = 0;

    history.forEach((item) => {
      if (item.status === 'SUCCESS') success++;
      else if (item.status === 'ALREADY_DONE') already++;
      else if (item.status === 'FAILED') failed++;
    });

    const total = history.length;
    return {
      success,
      already,
      failed,
      successRate: total > 0 ? Math.round((success / total) * 100) : 100,
    };
  }, [history]);

  // Vector Breakdown Data with Percentages
  const vectorBreakdownData = useMemo(() => {
    const safeTotal = totalActions || 1;
    return [
      {
        name: 'Like Posts',
        count: totalLikes,
        fill: '#f87171',
        percentage: ((totalLikes / safeTotal) * 100).toFixed(1),
      },
      {
        name: 'Repost / RT',
        count: totalRetweets,
        fill: '#34d399',
        percentage: ((totalRetweets / safeTotal) * 100).toFixed(1),
      },
      {
        name: 'Reply Payloads',
        count: totalComments,
        fill: '#60a5fa',
        percentage: ((totalComments / safeTotal) * 100).toFixed(1),
      },
      {
        name: 'New Posts',
        count: totalPosts,
        fill: '#f59e0b',
        percentage: ((totalPosts / safeTotal) * 100).toFixed(1),
      },
    ];
  }, [totalLikes, totalRetweets, totalComments, totalPosts, totalActions]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-flame tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              TELEMETRY & GROWTH ANALYTICS
            </div>
            <CardTitle className="text-xl">Engagement Performance Intelligence</CardTitle>
            <CardDescription>
              Visualisasi distribusi interaksi, performa cluster node, dan tren pertumbuhan engagement akun Anda.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadHistory();
              loadAccounts();
            }}
            className="gap-1.5 text-xs font-mono shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </Button>
        </CardHeader>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-obsidian-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-wider">TOTAL EXECUTIONS</div>
              <div className="font-heading font-bold text-2xl text-white mt-1">{totalActions}</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
                <CheckCircle className="w-3 h-3" />
                {accounts.filter((a) => a.enabled !== false).length} Nodes Active
              </div>
            </div>
            <div className="p-3 rounded-md bg-flame/10 text-flame">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-obsidian-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-wider">SUCCESS RATE</div>
              <div className="font-heading font-bold text-2xl text-emerald-400 mt-1">
                {history.length > 0 ? `${statusBreakdown.successRate}%` : '100%'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {statusBreakdown.success} sukses / {statusBreakdown.failed} gagal
              </div>
            </div>
            <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-obsidian-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-wider">LIKES & REPOSTS</div>
              <div className="font-heading font-bold text-2xl text-white mt-1">
                {totalLikes + totalRetweets}
              </div>
              <div className="text-[10px] text-red-400 font-mono mt-1 flex items-center gap-1">
                <Heart className="w-3 h-3 fill-red-400/20" /> {totalLikes} Likes · <Repeat className="w-3 h-3 ml-1" /> {totalRetweets} RTs
              </div>
            </div>
            <div className="p-3 rounded-md bg-red-500/10 text-red-400">
              <Heart className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-obsidian-850">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-wider">REPLIES & POSTS</div>
              <div className="font-heading font-bold text-2xl text-amber-400 mt-1">
                {totalComments + totalPosts}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-blue-400" /> {totalComments} Rep · <Sparkles className="w-3 h-3 text-amber-400 ml-1" /> {totalPosts} Posts
              </div>
            </div>
            <div className="p-3 rounded-md bg-amber-500/10 text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Engagement Activity Velocity Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="font-mono text-[10px] font-bold text-flame tracking-wider">ACTIVITY VELOCITY</div>
            <CardTitle className="text-base">Interaction Volume Over Timeline</CardTitle>
            <CardDescription>Grafik tren volume Like, Repost, Reply, dan Postingan per interval waktu.</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="likeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="replyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e1117',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                    color: '#ffffff',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Plus Jakarta Sans', paddingTop: '10px' }} />
                <Area isAnimationActive={false} type="monotone" dataKey="likes" name="Likes" stroke="#f87171" fillOpacity={1} fill="url(#likeGrad)" strokeWidth={2} />
                <Area isAnimationActive={false} type="monotone" dataKey="retweets" name="Reposts" stroke="#34d399" fillOpacity={1} fill="url(#rtGrad)" strokeWidth={2} />
                <Area isAnimationActive={false} type="monotone" dataKey="comments" name="Replies" stroke="#60a5fa" fillOpacity={1} fill="url(#replyGrad)" strokeWidth={2} />
                <Area isAnimationActive={false} type="monotone" dataKey="posts" name="New Posts" stroke="#f59e0b" fillOpacity={1} fill="url(#postGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right: Node Workload Share Donut Chart & Leaderboard */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <div className="font-mono text-[10px] font-bold text-flame tracking-wider">CLUSTER BALANCE</div>
              <CardTitle className="text-base">Node Workload Share</CardTitle>
              <CardDescription>
                {fullNodeLeaderboard.length} node terdaftar ({totalNodeWorkload} total eksekusi)
              </CardDescription>
            </div>
            {fullNodeLeaderboard.length > 5 && (
              <Badge variant="outline" className="font-mono text-[10px] border-amber-500/30 text-amber-400">
                Top 5 + Others
              </Badge>
            )}
          </CardHeader>

          <CardContent className="flex-1 flex flex-col pt-1 space-y-4">
            {donutChartData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <PieIcon className="w-10 h-10 stroke-[1.5] mb-2 opacity-40 text-flame" />
                <div className="text-xs font-mono font-medium text-slate-400">Belum Ada Eksekusi Node</div>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                  Jalankan interaksi di Target Workbench untuk melihat pembagian beban kerja.
                </p>
              </div>
            ) : (
              <>
                {/* Donut Chart with Centered Metric */}
                <div className="h-44 relative flex items-center justify-center overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={donutChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutChartData.map((entry, index) => (
                          <Cell key={`donut-cell-${index}`} fill={entry.color} stroke="#0e1117" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0e1117',
                          borderColor: 'rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          fontFamily: 'JetBrains Mono',
                          fontSize: '12px',
                          color: '#ffffff',
                        }}
                        itemStyle={{ color: '#ffffff' }}
                        labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                        formatter={(value: any, name: any, item: any) => [
                          `${value} runs (${item?.payload?.percentage || 0}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Donut Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-heading font-bold text-lg text-white leading-none">
                      {totalNodeWorkload}
                    </span>
                    <span className="font-mono text-[8px] text-muted-foreground tracking-wider mt-0.5">
                      RUNS
                    </span>
                  </div>
                </div>

                {/* Node Share Scrollable Breakdown List */}
                <div className="border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-2">
                    <span className="flex items-center gap-1 font-bold">
                      <Users className="w-3 h-3 text-flame" /> NODE LEADERBOARD
                    </span>
                    <span>{fullNodeLeaderboard.length} Nodes</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {fullNodeLeaderboard.map((node, index) => {
                      const percentage =
                        totalNodeWorkload > 0
                          ? Math.round((node.value / totalNodeWorkload) * 100)
                          : 0;
                      const color =
                        index < 5
                          ? NODE_PALETTE[index % NODE_PALETTE.length]
                          : OTHERS_COLOR;

                      return (
                        <div
                          key={node.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-obsidian-950/60 border border-border/40 hover:border-border transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-mono font-medium text-slate-200 truncate">
                              {node.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                            <span className="text-slate-300 font-semibold">{node.value} runs</span>
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 h-4 bg-obsidian-800 text-slate-200 font-mono font-bold"
                            >
                              {percentage}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Vector Breakdown Bar Chart & Metrics */}
      <Card>
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-flame tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              VECTOR BREAKDOWN & METRICS
            </div>
            <CardTitle className="text-base">Cumulative Vector Totals</CardTitle>
            <CardDescription>
              Perbandingan total volume interaksi per kategori vektor (Like, Repost, Reply, Post).
            </CardDescription>
          </div>

          {/* Simplified Quick Stat Badges */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
              <Heart className="w-3 h-3 fill-red-400/20" />
              <span className="text-white">{totalLikes}</span>
              <span className="text-[10px] text-slate-400 font-normal">Likes</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <Repeat className="w-3 h-3" />
              <span className="text-white">{totalRetweets}</span>
              <span className="text-[10px] text-slate-400 font-normal">Reposts</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
              <MessageSquare className="w-3 h-3" />
              <span className="text-white">{totalComments}</span>
              <span className="text-[10px] text-slate-400 font-normal">Replies</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              <span className="text-white">{totalPosts}</span>
              <span className="text-[10px] text-slate-400 font-normal">Posts</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-obsidian-950 text-slate-300 border border-border/80 text-xs font-semibold">
              <Activity className="w-3 h-3 text-slate-400" />
              <span className="text-white">{totalActions}</span>
              <span className="text-[10px] text-slate-500 font-normal">Total</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Proportion Stack Bar */}
          {totalActions > 0 && (
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-obsidian-950 border border-border/80">
                <div
                  style={{ width: `${vectorBreakdownData[0].percentage}%` }}
                  className="bg-red-400"
                  title={`Likes: ${totalLikes} (${vectorBreakdownData[0].percentage}%)`}
                />
                <div
                  style={{ width: `${vectorBreakdownData[1].percentage}%` }}
                  className="bg-emerald-400"
                  title={`Reposts: ${totalRetweets} (${vectorBreakdownData[1].percentage}%)`}
                />
                <div
                  style={{ width: `${vectorBreakdownData[2].percentage}%` }}
                  className="bg-blue-400"
                  title={`Replies: ${totalComments} (${vectorBreakdownData[2].percentage}%)`}
                />
                <div
                  style={{ width: `${vectorBreakdownData[3]?.percentage || 0}%` }}
                  className="bg-amber-400"
                  title={`Posts: ${totalPosts} (${vectorBreakdownData[3]?.percentage || 0}%)`}
                />
              </div>
            </div>
          )}

          {/* Bar Chart with Crisp White Top Labels & No Hover Glitch */}
          <div className="h-56 pt-2 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={vectorBreakdownData}
                margin={{ top: 25, right: 20, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tick={{ fill: '#f8fafc', fontWeight: 600 }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8' }}
                  domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.35))]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  contentStyle={{
                    backgroundColor: '#0e1117',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                    color: '#ffffff',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  formatter={(value: any, name: any, item: any) => [
                    `${value} total (${item?.payload?.percentage || 0}%)`,
                    'Volume',
                  ]}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                  label={{
                    position: 'top',
                    fill: '#ffffff',
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                    offset: 8,
                  }}
                >
                  {vectorBreakdownData.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
