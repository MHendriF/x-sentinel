import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Heart,
  Repeat,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Bot,
  Layers,
} from 'lucide-react';
import { HistoryItem } from '@/services/apiClient';

interface MissionMonitorDeckProps {
  isRunning: boolean;
  currentTask: any;
  targetUrls: string[];
  recentHistory?: HistoryItem[];
}

export const MissionMonitorDeck: React.FC<MissionMonitorDeckProps> = ({
  isRunning,
  currentTask,
  targetUrls,
  recentHistory = [],
}) => {
  const total = currentTask?.total || currentTask?.targetCount || targetUrls.length || 0;
  const completed = currentTask?.completed || 0;
  const progressPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  // Filter recent history for batch actions
  const batchHistory = recentHistory.slice(0, 10);
  const successCount = batchHistory.filter((h) => h.status === 'SUCCESS').length;
  const failedCount = batchHistory.filter((h) => h.status === 'FAILED').length;

  return (
    <Card className="flex h-full flex-col border-border/80 bg-obsidian-900 shadow-xl">
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Mission Telemetry &amp; Live Monitor</span>
          </CardTitle>
          <Badge
            variant={isRunning ? 'success' : 'secondary'}
            className="font-mono text-[10px]"
          >
            {isRunning ? '● ACTIVE STREAM' : '○ IDLE'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {/* Progress HUD */}
        <div className="rounded-lg border border-slate-800 bg-obsidian-950/80 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Progress: <strong className="text-white">{completed}</strong> of{' '}
              <strong className="text-white">{total}</strong> targets
            </span>
            <span className="font-bold text-emerald-400">{progressPct}%</span>
          </div>
          <Progress value={progressPct} />
        </div>

        {/* Action Metrics Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="rounded-lg border border-slate-800 bg-obsidian-950/60 p-2.5">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>SUCCESSFUL</span>
            </div>
            <div className="mt-1 font-heading text-lg font-bold text-emerald-400">
              {successCount}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-obsidian-950/60 p-2.5">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px]">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <span>FAILED / SKIP</span>
            </div>
            <div className="mt-1 font-heading text-lg font-bold text-red-400">
              {failedCount}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-obsidian-950/60 p-2.5">
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px]">
              <Layers className="h-3 w-3 text-blue-400" />
              <span>TOTAL ACTIONS</span>
            </div>
            <div className="mt-1 font-heading text-lg font-bold text-blue-400">
              {batchHistory.length}
            </div>
          </div>
        </div>

        {/* Current Active Target Pipeline */}
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="flex items-center justify-between font-mono text-xs font-semibold text-slate-300">
            <span>RECENT EXECUTION TRAIL</span>
            <span className="text-[10px] text-slate-500">REALTIME DISPATCH</span>
          </div>

          <div className="h-[260px] overflow-y-auto space-y-2 rounded-lg border border-border/60 bg-obsidian-950/80 p-2.5 custom-scrollbar">
            {batchHistory.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <Activity className="mb-2 h-7 w-7 text-slate-600" />
                <p className="font-mono text-xs">
                  {isRunning
                    ? 'Engaging first target node...'
                    : 'No active mission. Configure parameters and launch.'}
                </p>
              </div>
            ) : (
              batchHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-obsidian-900/80 px-2.5 py-1.5 font-mono text-[11px] transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {item.action === 'LIKE' ? (
                      <Heart className="h-3 w-3 text-red-400 shrink-0" />
                    ) : item.action === 'RETWEET' ? (
                      <Repeat className="h-3 w-3 text-emerald-400 shrink-0" />
                    ) : (
                      <MessageSquare className="h-3 w-3 text-blue-400 shrink-0" />
                    )}
                    <span className="font-bold text-slate-300 truncate">
                      @{item.accountName || 'node'}
                    </span>
                    <span className="text-slate-500 truncate text-[10px]">
                      {item.action}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500">{item.timeFormatted}</span>
                    <Badge
                      variant={item.status === 'SUCCESS' ? 'success' : 'destructive'}
                      className="h-4 px-1 text-[9px]"
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
