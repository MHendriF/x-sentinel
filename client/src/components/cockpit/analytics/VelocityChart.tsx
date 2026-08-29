import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface VelocityChartProps {
  data: Array<{
    date: string;
    likes: number;
    retweets: number;
    comments: number;
    posts: number;
  }>;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({ data }) => {
  const hasActivity =
    data.length > 0 && data.some((d) => d.likes || d.retweets || d.comments || d.posts);

  return (
    <Card className="border-border/80 bg-obsidian-850">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
          <TrendingUp className="h-3.5 w-3.5" />
          INTERACTION VELOCITY
        </div>
        <CardTitle className="text-lg">Velocity Aktivitas & Tren</CardTitle>
        <CardDescription>
          Tren volume Likes, Reposts, Replies, dan New Posts dalam rentang waktu aktivitas terbaru.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <div className="flex h-72 w-full flex-col items-center justify-center rounded-md border border-dashed border-border/70 bg-obsidian-900/50 text-center">
            <TrendingUp className="mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Belum ada aktivitas tercatat</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Grafik velocity akan muncul setelah ada interaksi sukses (Like, Repost, Reply, atau
              Post) yang terekam di Audit Ledger.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="likeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="commentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="likes"
                  name="Likes"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#likeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="retweets"
                  name="Reposts"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#rtGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="comments"
                  name="Replies"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#commentGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="posts"
                  name="Posts"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#postGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
