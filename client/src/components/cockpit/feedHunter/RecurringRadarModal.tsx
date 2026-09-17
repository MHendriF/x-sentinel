import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Radar, Clock, X, Loader2, Layers, Heart, Repeat, MessageSquare, Sparkles } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { toast } from 'sonner';

interface RecurringRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyword: string;
  count: number;
  like: boolean;
  retweet: boolean;
  comment: boolean;
  commentText?: string;
  accountIds: string | string[];
  defaultDelay?: number;
  onScheduledSuccess?: () => void;
}

export const RecurringRadarModal: React.FC<RecurringRadarModalProps> = ({
  isOpen,
  onClose,
  keyword,
  count,
  like,
  retweet,
  comment,
  commentText,
  accountIds,
  defaultDelay = 15,
  onScheduledSuccess,
}) => {
  const [radarTitle, setRadarTitle] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [delaySeconds, setDelaySeconds] = useState(defaultDelay);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!keyword.trim()) {
      toast.error('Search query or hashtag is required.');
      return;
    }

    const activeVectors = [
      like ? 'LIKE' : null,
      retweet ? 'RETWEET' : null,
      comment ? 'COMMENT' : null,
    ].filter(Boolean) as string[];

    if (activeVectors.length === 0) {
      toast.error('Select at least one engagement vector.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedAccountIds =
        accountIds === 'all' ? 'all' : Array.isArray(accountIds) ? accountIds : [accountIds];

      const title =
        radarTitle.trim() ||
        `Radar Station: ${keyword} (Every ${intervalMinutes}m)`;

      const res = await apiClient.createSchedule({
        type: 'RECURRING_HUNTER',
        title,
        keywords: [keyword.trim()],
        vectors: activeVectors,
        maxTweets: Math.min(Math.max(count, 1), 30),
        intervalMinutes,
        accountIds: resolvedAccountIds,
        commentText: commentText?.trim() || undefined,
        delaySeconds: Math.max(5, delaySeconds),
        enabled: true,
      });

      if (res.success) {
        toast.success(`🛰️ Autopilot Radar deployed! Running every ${intervalMinutes} minutes.`);
        onClose();
        if (onScheduledSuccess) onScheduledSuccess();
      } else {
        toast.error(`Failed to deploy radar schedule: ${res.message}`);
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
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-cyan-500/40 bg-obsidian-900 p-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Radar className="h-4 w-4 text-cyan-400 animate-spin-slow" />
            <span>Deploy Autopilot Surveillance Radar</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Radar Summary Pill */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-obsidian-950/80 px-3 py-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-bold text-white truncate max-w-[160px]">{keyword || 'Search Query'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>{nodeLabel}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-cyan-300">
            {[like && '❤️', retweet && '🔁', comment && '💬'].filter(Boolean).join(' ')}
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-3.5">
          <div className="space-y-1">
            <label className="font-mono text-xs font-semibold text-slate-300">
              RADAR STATION LABEL
            </label>
            <Input
              type="text"
              value={radarTitle}
              onChange={(e) => setRadarTitle(e.target.value)}
              placeholder={`e.g. 24/7 AI Lead Radar`}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-xs font-semibold text-slate-300">
              RADAR SCAN INTERVAL (AUTOPILOT FREQUENCY)
            </label>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {[
                { min: 30, label: '30m' },
                { min: 60, label: '1 hour' },
                { min: 120, label: '2 hours' },
                { min: 240, label: '4 hours' },
              ].map((opt) => (
                <button
                  key={opt.min}
                  type="button"
                  onClick={() => setIntervalMinutes(opt.min)}
                  className={`cursor-pointer rounded-md border p-2 text-center transition-all ${
                    intervalMinutes === opt.min
                      ? 'border-cyan-500/80 bg-cyan-500/20 font-bold text-cyan-300'
                      : 'border-border/80 bg-obsidian-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-mono text-xs font-semibold text-slate-300">
                HARVEST PER SCAN
              </label>
              <div className="rounded-md border border-slate-800 bg-obsidian-950 px-3 py-2 font-mono text-xs text-slate-200">
                Top {count} Tweets
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs font-semibold text-slate-300">
                NODE DELAY
              </label>
              <Input
                type="number"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                min={5}
                max={300}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="rounded-md border border-cyan-500/20 bg-cyan-950/20 p-2.5 font-sans text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-cyan-300">Autopilot Info:</span> The scheduler engine will periodically sweep X for this topic every {intervalMinutes} minutes, engaging up to {count} matching posts with zero manual intervention.
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
            className="border-cyan-500/50 bg-cyan-600 font-mono text-xs font-bold text-white hover:bg-cyan-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Radar className="mr-1.5 h-3.5 w-3.5" />
                Activate Radar Schedule
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
