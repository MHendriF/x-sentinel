import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Clock, Zap } from 'lucide-react';
import { HourlyActivityPoint } from './useAnalyticsData';

interface HourlyActivityChartProps {
  data: HourlyActivityPoint[];
  peakHour: { hour: string; count: number };
}

export const HourlyActivityChart: React.FC<HourlyActivityChartProps> = ({ data, peakHour }) => {
  const hasActivity = data.some((d) => d.total > 0);

  return (
    <Card className="border-border/80 bg-obsidian-850">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-cyan-400">
            <Clock className="h-3.5 w-3.5" />
            24-HOUR ACTIVITY DENSITY
          </div>

          {peakHour.count > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 font-mono text-[11px] text-cyan-300">
              <Zap className="h-3 w-3 text-cyan-400" />
              <span>Peak:</span>
              <span className="font-bold text-white">{peakHour.hour}</span>
              <span className="text-slate-400">({peakHour.count} acts)</span>
            </div>
          )}
        </div>
        <CardTitle className="text-lg">Distribusi Jam Aktivitas Armada</CardTitle>
        <CardDescription>
          Kerapatan eksekusi interaksi per jam (00:00 – 23:00) untuk evaluasi jadwal otomasi optimal.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!hasActivity ? (
          <div className="flex h-72 w-full flex-col items-center justify-center rounded-md border border-dashed border-border/70 bg-obsidian-900/50 text-center">
            <Clock className="mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Belum ada aktivitas dalam rentang waktu ini</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Distribusi 24-jam akan terisi otomatis seiring bot mengeksekusi misi like, repost, komentar, atau postingan.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis
                  dataKey="hour"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  interval={2}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as HourlyActivityPoint;
                      return (
                        <div className="rounded-lg border border-slate-700 bg-obsidian-950 p-2.5 font-mono text-xs shadow-xl">
                          <div className="mb-1 font-bold text-cyan-400">Jam {label}</div>
                          <div className="space-y-0.5 text-slate-300">
                            <div className="flex justify-between gap-4">
                              <span>Total Aksi:</span>
                              <span className="font-bold text-white">{item.total}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-red-400">
                              <span>Likes:</span>
                              <span>{item.likes}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-emerald-400">
                              <span>Reposts:</span>
                              <span>{item.retweets}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-blue-400">
                              <span>Replies:</span>
                              <span>{item.comments}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-amber-400">
                              <span>Posts:</span>
                              <span>{item.posts}</span>
                            </div>
                            {item.failures > 0 && (
                              <div className="flex justify-between gap-4 text-rose-400">
                                <span>Gagal/Skip:</span>
                                <span>{item.failures}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => {
                    const isPeak = entry.hour === peakHour.hour && peakHour.count > 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPeak ? '#06b6d4' : '#38bdf8'}
                        fillOpacity={isPeak ? 0.95 : 0.6}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
