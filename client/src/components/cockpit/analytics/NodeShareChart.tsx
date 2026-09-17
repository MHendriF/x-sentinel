import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  PieChart as PieIcon,
  Users,
  Heart,
  Repeat,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Check,
} from 'lucide-react';
import { EnrichedNodeLeaderboard } from './useAnalyticsData';

interface NodeShareChartProps {
  donutChartData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  fullNodeLeaderboard: EnrichedNodeLeaderboard[];
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}

export const NodeShareChart: React.FC<NodeShareChartProps> = ({
  donutChartData,
  fullNodeLeaderboard,
  selectedNodeId = 'all',
  onSelectNode,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Donut Chart: Cluster Workload Share */}
      <Card className="border-border/80 bg-obsidian-850">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-purple-400">
            <PieIcon className="h-3.5 w-3.5" />
            WORKLOAD PROPORTION
          </div>
          <CardTitle className="text-lg">Distribusi Beban Kerja Node</CardTitle>
          <CardDescription>
            Distribusi proporsi eksekusi interaksi antar node akun di dalam cluster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard: Node Execution Output & Drill-down */}
      <Card className="border-border/80 bg-obsidian-850">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-emerald-400">
              <Users className="h-3.5 w-3.5" />
              FLEET LEADERBOARD
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              {onSelectNode ? '💡 Klik baris node untuk drill-down' : ''}
            </span>
          </div>
          <CardTitle className="text-lg">Output Eksekusi Node</CardTitle>
          <CardDescription>
            Peringkat akumulasi aksi interaksi per node akun beserta rincian vektor aksi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {fullNodeLeaderboard.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-slate-500">
                Belum ada node akun yang terdaftar.
              </div>
            ) : (
              fullNodeLeaderboard.map((node, i) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id || i}
                    onClick={() => onSelectNode && onSelectNode(isSelected ? 'all' : node.id)}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all ${
                      isSelected
                        ? 'border-cyan-500/80 bg-cyan-950/30 shadow-md shadow-cyan-950/50'
                        : 'border-border/80 bg-obsidian-900/60 hover:border-slate-600 hover:bg-obsidian-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 font-mono text-xs font-bold text-slate-500">#{i + 1}</span>

                      {/* Avatar with health status dot */}
                      <div className="relative">
                        {node.avatar ? (
                          <img
                            src={node.avatar}
                            alt={node.name}
                            className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-obsidian-800 font-mono text-xs text-slate-300">
                            {node.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {node.healthStatus && (
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-obsidian-900 ${
                              node.healthStatus === 'HEALTHY'
                                ? 'bg-emerald-400'
                                : node.healthStatus === 'EXPIRED'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-400'
                            }`}
                            title={`Status: ${node.healthStatus}`}
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white group-hover:text-cyan-300">
                            {node.name}
                          </span>
                          {isSelected && (
                            <span className="flex items-center rounded bg-cyan-500/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-cyan-400">
                              <Check className="mr-0.5 h-2.5 w-2.5" /> FILTERED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                          <span>{node.username}</span>
                          {node.healthStatus === 'HEALTHY' ? (
                            <span className="flex items-center text-emerald-400">
                              <ShieldCheck className="mr-0.5 h-2.5 w-2.5" /> Healthy
                            </span>
                          ) : node.healthStatus === 'EXPIRED' ? (
                            <span className="flex items-center text-rose-400">
                              <ShieldAlert className="mr-0.5 h-2.5 w-2.5" /> Expired
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Vector breakdown mini tags & Total Actions */}
                    <div className="flex items-center gap-2.5">
                      <div className="hidden items-center gap-1.5 font-mono text-[10px] text-slate-400 sm:flex">
                        <span className="flex items-center text-red-400/80" title="Likes">
                          <Heart className="mr-0.5 h-2.5 w-2.5" /> {node.likes}
                        </span>
                        <span className="flex items-center text-emerald-400/80" title="Reposts">
                          <Repeat className="mr-0.5 h-2.5 w-2.5" /> {node.retweets}
                        </span>
                        <span className="flex items-center text-blue-400/80" title="Replies">
                          <MessageSquare className="mr-0.5 h-2.5 w-2.5" /> {node.comments}
                        </span>
                        {node.posts > 0 && (
                          <span className="flex items-center text-amber-400/80" title="Posts">
                            <Sparkles className="mr-0.5 h-2.5 w-2.5" /> {node.posts}
                          </span>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className="border-slate-700 bg-obsidian-950 font-mono text-xs font-bold text-flame"
                      >
                        {node.count.toLocaleString()} actions
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
