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
} from 'lucide-react';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#6366f1'];

export const AnalyticsDeck: React.FC = () => {
  const { history, stats, accounts, loadHistory } = useStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Aggregate Data for Daily Trend
  const dailyTrendData = useMemo(() => {
    const map: Record<string, { date: string; likes: number; retweets: number; comments: number }> = {};

    // Take last 30 entries and group by date
    history.forEach((item) => {
      const dateStr = item.timestamp ? item.timestamp.slice(0, 10) : 'Today';
      if (!map[dateStr]) {
        map[dateStr] = { date: dateStr.slice(5), likes: 0, retweets: 0, comments: 0 };
      }
      if (item.action === 'LIKE' && item.status === 'SUCCESS') map[dateStr].likes += 1;
      if (item.action === 'RETWEET' && item.status === 'SUCCESS') map[dateStr].retweets += 1;
      if (item.action === 'COMMENT' && item.status === 'SUCCESS') map[dateStr].comments += 1;
    });

    const result = Object.values(map);
    if (result.length === 0) {
      // Dummy baseline for initial display
      return [
        { date: 'Day-1', likes: stats?.totalLikes || 1, retweets: stats?.totalRetweets || 0, comments: stats?.totalComments || 0 },
      ];
    }
    return result.slice(-10);
  }, [history, stats]);

  // Aggregate Node Share
  const nodeShareData = useMemo(() => {
    const map: Record<string, number> = {};
    history.forEach((item) => {
      const name = item.accountName ? `@${item.accountName}` : 'Main Node';
      map[name] = (map[name] || 0) + 1;
    });

    const list = Object.entries(map).map(([name, value]) => ({ name, value }));
    if (list.length === 0 && accounts.length > 0) {
      return accounts.map((acc, i) => ({
        name: `@${acc.username || acc.label}`,
        value: 1,
      }));
    }
    return list;
  }, [history, accounts]);

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

    const total = history.length || 1;
    return {
      success,
      already,
      failed,
      successRate: Math.round((success / total) * 100),
    };
  }, [history]);

  const totalActions = (stats?.totalLikes || 0) + (stats?.totalRetweets || 0) + (stats?.totalComments || 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
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
          <Button variant="outline" size="sm" onClick={() => loadHistory()} className="gap-1.5 text-xs font-mono">
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
                All Nodes Active
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
                {(stats?.totalLikes || 0) + (stats?.totalRetweets || 0)}
              </div>
              <div className="text-[10px] text-red-400 font-mono mt-1 flex items-center gap-1">
                <Heart className="w-3 h-3 fill-red-400/20" /> {stats?.totalLikes || 0} Likes · <Repeat className="w-3 h-3 ml-1" /> {stats?.totalRetweets || 0} RTs
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
              <div className="font-mono text-[10px] text-muted-foreground tracking-wider">REPLY PAYLOADS</div>
              <div className="font-heading font-bold text-2xl text-blue-400 mt-1">
                {stats?.totalComments || 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">Spintax Randomized</div>
            </div>
            <div className="p-3 rounded-md bg-blue-500/10 text-blue-400">
              <MessageSquare className="w-6 h-6" />
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
            <CardDescription>Grafik tren volume Like, Repost, dan Reply per interval waktu.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-2">
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
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e1117',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Plus Jakarta Sans', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="likes" name="Likes" stroke="#f87171" fillOpacity={1} fill="url(#likeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="retweets" name="Reposts" stroke="#34d399" fillOpacity={1} fill="url(#rtGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="comments" name="Replies" stroke="#60a5fa" fillOpacity={1} fill="url(#replyGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right: Node Workload Share Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="font-mono text-[10px] font-bold text-flame tracking-wider">CLUSTER BALANCE</div>
            <CardTitle className="text-base">Node Workload Share</CardTitle>
            <CardDescription>Distribusi porsi eksekusi antar node akun.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center pt-2">
            {nodeShareData.length === 0 ? (
              <div className="text-slate-500 italic text-xs font-mono">Belum ada data distribusi node.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nodeShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {nodeShareData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0e1117',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Vector Breakdown Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="font-mono text-[10px] font-bold text-flame tracking-wider">VECTOR BREAKDOWN</div>
          <CardTitle className="text-base">Cumulative Vector Totals</CardTitle>
          <CardDescription>Perbandingan total volume interaksi per kategori vektor.</CardDescription>
        </CardHeader>
        <CardContent className="h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Like Posts', count: stats?.totalLikes || 0, fill: '#f87171' },
                { name: 'Repost / RT', count: stats?.totalRetweets || 0, fill: '#34d399' },
                { name: 'Reply Payloads', count: stats?.totalComments || 0, fill: '#60a5fa' },
              ]}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0e1117',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {[
                  <Cell key="0" fill="#f87171" />,
                  <Cell key="1" fill="#34d399" />,
                  <Cell key="2" fill="#60a5fa" />,
                ]}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
