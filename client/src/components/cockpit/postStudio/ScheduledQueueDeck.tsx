import React from 'react';
import { ScheduleItem } from '@/services/apiClient';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trash2, Play, Pause } from 'lucide-react';

interface ScheduledQueueDeckProps {
  schedules: ScheduleItem[];
  onToggleSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
}

export const ScheduledQueueDeck: React.FC<ScheduledQueueDeckProps> = ({
  schedules,
  onToggleSchedule,
  onDeleteSchedule,
}) => {
  if (!schedules || schedules.length === 0) return null;

  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) {
      return (
        <Badge variant="outline" className="border-slate-700 bg-obsidian-900 text-slate-500">
          PAUSED
        </Badge>
      );
    }
    switch (status) {
      case 'RUNNING':
        return (
          <Badge variant="blue" className="animate-pulse">
            RUNNING
          </Badge>
        );
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>;
      default:
        return (
          <Badge variant="default" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
            PENDING
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Calendar className="h-4 w-4 text-amber-400" />
          <span>Automated Execution Queue ({schedules.length})</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">Background Cron Active</span>
      </div>

      <div className="space-y-2">
        {schedules.map((item) => {
          const dateStr = new Date(item.scheduledAt).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          return (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-3 rounded-lg border border-border/80 bg-obsidian-900/80 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{item.title}</span>
                  {getStatusBadge(item.status, item.enabled)}
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  <span>Scheduled: </span>
                  <strong className="text-slate-200">{dateStr}</strong>
                  {item.posts && item.posts.length > 0 && (
                    <span className="ml-2 text-slate-500">
                      · {item.posts.length} Drafts ({item.mediaPaths?.length || 0} Media)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSchedule(item.id)}
                  className="rounded border border-border/60 bg-obsidian-800 p-1.5 text-slate-300 transition-colors hover:bg-obsidian-750 hover:text-white"
                  title={item.enabled ? 'Pause Schedule' : 'Enable Schedule'}
                >
                  {item.enabled ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSchedule(item.id)}
                  className="rounded border border-rose-500/30 bg-rose-950/30 p-1.5 text-rose-400 transition-colors hover:bg-rose-900/50 hover:text-rose-200"
                  title="Delete Schedule"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
