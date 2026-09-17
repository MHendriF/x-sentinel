import React from 'react';
import { ScheduleItem, apiClient } from '@/services/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Radar,
  Power,
  Trash2,
  Clock,
  Heart,
  Repeat,
  MessageSquare,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ActiveRadarStationsProps {
  schedules: ScheduleItem[];
  onRefresh: () => Promise<void>;
  onDeployNew: () => void;
}

export const ActiveRadarStations: React.FC<ActiveRadarStationsProps> = ({
  schedules,
  onRefresh,
  onDeployNew,
}) => {
  const radarSchedules = schedules.filter((s) => s.type === 'RECURRING_HUNTER');

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await apiClient.toggleSchedule(id, !currentEnabled);
      if (res.success) {
        toast.success(`Radar station ${!currentEnabled ? 'activated' : 'paused'}.`);
        await onRefresh();
      }
    } catch (err: any) {
      toast.error(`Failed to update radar status: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiClient.deleteSchedule(id);
      if (res.success) {
        toast.info('Radar station decommissioned.');
        await onRefresh();
      }
    } catch (err: any) {
      toast.error(`Failed to delete radar: ${err.message}`);
    }
  };

  return (
    <Card className="flex h-full flex-col border-border/80 bg-obsidian-900 shadow-xl">
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Radar className="h-4 w-4 text-cyan-400 animate-spin-slow" />
            <span>Active Autopilot Radar Stations</span>
          </CardTitle>
          <Badge variant="outline" className="border-cyan-500/40 font-mono text-[10px] text-cyan-300">
            {radarSchedules.length} STATIONS
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {radarSchedules.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-slate-500">
            <Radar className="mb-3 h-10 w-10 text-slate-700" />
            <p className="font-heading text-sm font-semibold text-slate-400">
              No Autopilot Radar Stations Active
            </p>
            <p className="mt-1 font-mono text-xs text-slate-500 max-w-xs">
              Schedule an automated recurring radar to scan topics and engage targets on a 24/7 background interval.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeployNew}
              className="mt-4 border-cyan-500/40 font-mono text-xs text-cyan-300 hover:bg-cyan-500/10"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
              Deploy Radar Station
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
            {radarSchedules.map((radar) => {
              const vectors = radar.vectors || ['LIKE', 'RETWEET', 'COMMENT'];
              const keyword = radar.keywords?.[0] || 'Unknown Query';

              return (
                <div
                  key={radar.id}
                  className={`flex flex-col gap-2 rounded-lg border p-3.5 transition-all ${
                    radar.enabled
                      ? 'border-cyan-500/40 bg-cyan-950/20'
                      : 'border-border/60 bg-obsidian-950/70 opacity-65'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-xs font-bold text-white">
                          {radar.title || `Radar: ${keyword}`}
                        </span>
                        <Badge
                          variant={radar.enabled ? 'success' : 'secondary'}
                          className="font-mono text-[9px]"
                        >
                          {radar.enabled ? 'ONLINE' : 'PAUSED'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-cyan-300">
                        <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5">
                          "{keyword}"
                        </span>
                        <span className="text-slate-400">
                          Sweep every {radar.intervalMinutes || 60}m
                        </span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(radar.id, radar.enabled)}
                        title={radar.enabled ? 'Pause Radar Station' : 'Activate Radar Station'}
                        className={`h-7 w-7 rounded ${
                          radar.enabled
                            ? 'text-emerald-400 hover:text-amber-400'
                            : 'text-slate-500 hover:text-emerald-400'
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(radar.id)}
                        title="Decommission Radar Station"
                        className="h-7 w-7 rounded text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Telemetry Footer */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 font-mono text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Quota: Top {radar.maxTweets || 3}</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        {vectors.includes('LIKE') && <Heart className="h-2.5 w-2.5 text-red-400" />}
                        {vectors.includes('RETWEET') && <Repeat className="h-2.5 w-2.5 text-emerald-400" />}
                        {vectors.includes('COMMENT') && <MessageSquare className="h-2.5 w-2.5 text-blue-400" />}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>
                        {radar.lastRunAt
                          ? `Last sweep: ${new Date(radar.lastRunAt).toLocaleTimeString()}`
                          : 'Awaiting first sweep'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
