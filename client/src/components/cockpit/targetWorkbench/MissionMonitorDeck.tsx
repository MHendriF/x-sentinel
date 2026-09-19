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
  Layers,
} from 'lucide-react';
import { HistoryItem } from '@/services/apiClient';

interface MissionMonitorDeckProps {
  isRunning: boolean;
  currentTask: any;
  lastMission?: any;
  targetUrls: string[];
  recentHistory?: HistoryItem[];
  missionStartedAt?: number | null;
}

export const MissionMonitorDeck: React.FC<MissionMonitorDeckProps> = ({
  isRunning,
  currentTask,
  lastMission,
  targetUrls,
  recentHistory = [],
  missionStartedAt = null,
}) => {
  const taskSource = isRunning ? currentTask : (currentTask || lastMission);

  const total = taskSource?.total || taskSource?.targetCount || targetUrls.length || 0;
  const completed = taskSource?.completed || 0;
  const progressPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  // Aggregate all candidate target URLs across props, currentTask, and lastMission
  const allCandidateUrls = React.useMemo(() => {
    const list: string[] = [...targetUrls];
    if (currentTask?.urls && Array.isArray(currentTask.urls)) {
      list.push(...currentTask.urls);
    }
    if (currentTask?.targetUrls && Array.isArray(currentTask.targetUrls)) {
      list.push(...currentTask.targetUrls);
    }
    if (currentTask?.currentUrl) {
      list.push(currentTask.currentUrl);
    }
    if (lastMission?.urls && Array.isArray(lastMission.urls)) {
      list.push(...lastMission.urls);
    }
    if (lastMission?.targetUrls && Array.isArray(lastMission.targetUrls)) {
      list.push(...lastMission.targetUrls);
    }
    if (lastMission?.currentUrl) {
      list.push(lastMission.currentUrl);
    }
    return Array.from(new Set(list.filter(Boolean)));
  }, [targetUrls, currentTask, lastMission]);

  // Extract tweet IDs from target URLs for precise matching
  const targetTweetIds = React.useMemo(() => {
    return new Set(
      allCandidateUrls
        .map((u) => {
          const match = u.match(/\/status(?:es)?\/(\d+)/i);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[]
    );
  }, [allCandidateUrls]);

  // Clean URLs for fallback matching
  const cleanTargetUrls = React.useMemo(() => {
    return allCandidateUrls.map((u) => u.split('?')[0].trim()).filter(Boolean);
  }, [allCandidateUrls]);

  // Resolve effective mission start time
  const effectiveStartTime = React.useMemo(() => {
    if (missionStartedAt) return missionStartedAt;
    if (currentTask?.startedAt) {
      const parsed = new Date(currentTask.startedAt).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    if (lastMission?.startedAt) {
      const parsed = new Date(lastMission.startedAt).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }, [missionStartedAt, currentTask?.startedAt, lastMission?.startedAt]);

  // Filter recent history strictly for the current/last mission
  const missionHistory = React.useMemo(() => {
    if (targetTweetIds.size === 0 && cleanTargetUrls.length === 0) {
      return [];
    }
    // If mission hasn't started yet, not running, and no lastMission, keep clean empty state
    if (!effectiveStartTime && !isRunning && !lastMission) {
      return [];
    }

    return (recentHistory || []).filter((h) => {
      // 1. Target URL or tweet ID match
      // For COMMENT actions, h.tweetId may be the reply tweet ID, so also inspect h.tweetUrl
      const urlTweetId = (h.tweetUrl || '').match(/\/status(?:es)?\/(\d+)/i)?.[1];
      const idMatch =
        (h.tweetId && targetTweetIds.has(h.tweetId)) ||
        (urlTweetId && targetTweetIds.has(urlTweetId));
      const urlMatch = cleanTargetUrls.some(
        (target) =>
          h.tweetUrl &&
          (h.tweetUrl.includes(target) || target.includes(h.tweetUrl.split('?')[0]))
      );
      if (!idMatch && !urlMatch) return false;

      // 2. Mission timestamp constraint: actions executed during or after this mission started
      // 30-second leeway to account for client/server clock skew or initialization lag
      if (effectiveStartTime) {
        const itemTime = new Date(h.timestamp).getTime();
        if (!isNaN(itemTime) && itemTime < effectiveStartTime - 30000) {
          return false;
        }
      }

      return true;
    });
  }, [recentHistory, targetTweetIds, cleanTargetUrls, effectiveStartTime, isRunning, lastMission]);

  const batchHistory = missionHistory.slice(0, 30);
  const successCount = missionHistory.filter((h) => h.status === 'SUCCESS').length;
  const failedCount = missionHistory.filter((h) => h.status === 'FAILED').length;

  return (
    <Card className="flex h-full flex-col border-border/80 bg-obsidian-900 shadow-xl">
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Mission Telemetry &amp; Live Monitor</span>
          </CardTitle>
          <Badge
            variant={isRunning ? 'success' : lastMission ? 'secondary' : 'outline'}
            className="font-mono text-[10px]"
          >
            {isRunning ? '● ACTIVE STREAM' : lastMission ? '✓ COMPLETED' : '○ IDLE'}
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
              <strong className="text-white">{total}</strong> nodes
              {isRunning && taskSource?.currentNode ? (
                <span className="ml-2 text-emerald-400 truncate max-w-[220px]">
                  • Active: <strong>@{taskSource.currentNode}</strong>
                  {taskSource.currentAction && (
                    <span className="ml-1 font-semibold text-amber-400">
                      [{taskSource.currentAction}]
                    </span>
                  )}
                </span>
              ) : !isRunning && lastMission ? (
                <span className="ml-2 text-slate-400 truncate max-w-[220px]">
                  • Last Run: <span className="text-emerald-400 font-semibold">Finished</span>
                </span>
              ) : null}
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
              {missionHistory.length}
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
                    : lastMission
                    ? 'Mission concluded. No records matching current target filters.'
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
