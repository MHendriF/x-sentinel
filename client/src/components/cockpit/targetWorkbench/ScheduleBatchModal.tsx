import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, X, Loader2, Crosshair, Layers, Timer } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { toast } from 'sonner';

interface ScheduleBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrls: string[];
  accountIds: string | string[];
  like: boolean;
  retweet: boolean;
  comment: boolean;
  commentText?: string;
  defaultDelay?: number;
  onScheduledSuccess?: () => void;
}

export const ScheduleBatchModal: React.FC<ScheduleBatchModalProps> = ({
  isOpen,
  onClose,
  targetUrls,
  accountIds,
  like,
  retweet,
  comment,
  commentText,
  defaultDelay = 30,
  onScheduledSuccess,
}) => {
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [scheduleTime, setScheduleTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d.toTimeString().slice(0, 5);
  });
  const [delaySeconds, setDelaySeconds] = useState(defaultDelay);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Please specify execution date and time.');
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(scheduledDateTime.getTime())) {
      toast.error('Invalid date or time format.');
      return;
    }

    if (scheduledDateTime.getTime() <= Date.now()) {
      toast.error('Scheduled time must be in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeVectors = [
        like ? 'LIKE' : null,
        retweet ? 'REPOST' : null,
        comment ? 'REPLY' : null,
      ].filter(Boolean);

      const title =
        scheduleTitle.trim() ||
        `Batch Mission (${targetUrls.length} targets · ${activeVectors.join('+')})`;

      const resolvedAccountIds =
        accountIds === 'all' ? 'all' : Array.isArray(accountIds) ? accountIds : [accountIds];

      const res = await apiClient.createSchedule({
        type: 'BATCH_ENGAGEMENT',
        title,
        scheduledAt: scheduledDateTime.toISOString(),
        accountIds: resolvedAccountIds,
        urls: targetUrls,
        like,
        retweet,
        comment,
        commentText: commentText?.trim() || undefined,
        delaySeconds: Math.max(5, delaySeconds),
        enabled: true,
      });

      if (res.success) {
        toast.success(`📅 Batch mission scheduled for ${scheduledDateTime.toLocaleString()}!`);
        onClose();
        if (onScheduledSuccess) onScheduledSuccess();
      } else {
        toast.error(`Scheduling failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nodeLabel =
    accountIds === 'all'
      ? 'All Active Nodes'
      : Array.isArray(accountIds)
        ? `${accountIds.length} Nodes`
        : '1 Node';

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-amber-500/40 bg-obsidian-900 p-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Calendar className="h-4 w-4 text-amber-400" />
            <span>Schedule Batch Engagement</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mission Specs Pill */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-obsidian-950/80 px-3 py-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Crosshair className="h-3.5 w-3.5 text-flame" />
            <span className="font-bold text-white">{targetUrls.length}</span> Targets
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>{nodeLabel}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-amber-300">
            {[like && '❤️', retweet && '🔁', comment && '💬'].filter(Boolean).join(' ')}
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-3.5">
          <div className="space-y-1">
            <label className="font-mono text-xs font-semibold text-slate-300">
              MISSION LABEL / TITLE
            </label>
            <Input
              type="text"
              value={scheduleTitle}
              onChange={(e) => setScheduleTitle(e.target.value)}
              placeholder="e.g. Morning Viral Tweet Boost"
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-mono text-xs font-semibold text-slate-300">DATE</label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs font-semibold text-slate-300">TIME (24H)</label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-semibold text-slate-300">
                ROTATION DELAY (SECONDS)
              </label>
              <span className="font-mono text-[10px] text-slate-400">{delaySeconds}s</span>
            </div>
            <Input
              type="number"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              min={5}
              max={3600}
              className="font-mono text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-1 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="border-amber-500/50 bg-amber-500 font-mono text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Confirm Schedule
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
