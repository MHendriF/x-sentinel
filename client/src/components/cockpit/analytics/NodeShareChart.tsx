import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PieChart as PieIcon, Users } from 'lucide-react';

interface NodeShareChartProps {
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

export const NodeShareChart: React.FC<NodeShareChartProps> = ({
  donutChartData,
  fullNodeLeaderboard,
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
          <CardTitle className="text-lg">Node Workload Share</CardTitle>
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

      {/* Leaderboard: Node Execution Output */}
      <Card className="border-border/80 bg-obsidian-850">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-emerald-400">
            <Users className="h-3.5 w-3.5" />
            FLEET LEADERBOARD
          </div>
          <CardTitle className="text-lg">Node Execution Output</CardTitle>
          <CardDescription>
            Peringkat akumulasi aksi interaksi per node akun terdaftar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
            {fullNodeLeaderboard.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-slate-500">
                Belum ada node akun yang terdaftar.
              </div>
            ) : (
              fullNodeLeaderboard.map((node, i) => (
                <div
                  key={node.id || i}
                  className="flex items-center justify-between rounded-lg border border-border/80 bg-obsidian-900/60 p-2.5 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 font-mono text-xs font-bold text-slate-500">#{i + 1}</span>
                    {node.avatar ? (
                      <img
                        src={node.avatar}
                        alt={node.name}
                        className="h-7 w-7 rounded-full border border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-obsidian-800 font-mono text-xs text-slate-300">
                        {node.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-white">{node.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{node.username}</div>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="border-slate-700 bg-obsidian-950 font-mono text-xs text-flame"
                  >
                    {node.count} actions
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
