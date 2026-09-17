import React from 'react';
import { SystemHealthData } from '@/services/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Cpu,
  Database,
  RefreshCw,
  Server,
  Layers,
  Bot,
  Clock,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';

interface LiveTelemetryHUDProps {
  health: SystemHealthData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onRunDiagnostics: () => void;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const LiveTelemetryHUD: React.FC<LiveTelemetryHUDProps> = ({
  health,
  isLoading,
  onRefresh,
  onRunDiagnostics,
}) => {
  if (!health) {
    return (
      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <RefreshCw className="h-6 w-6 animate-spin text-flame" />
          <p className="mt-2 font-mono text-xs text-slate-400">Loading system telemetry...</p>
        </CardContent>
      </Card>
    );
  }

  const heapUsedMb = (health.memory.heapUsed / (1024 * 1024)).toFixed(1);
  const heapTotalMb = (health.memory.heapTotal / (1024 * 1024)).toFixed(1);
  const rssMb = (health.memory.rss / (1024 * 1024)).toFixed(1);
  const heapPercent = Math.min(
    100,
    Math.round((health.memory.heapUsed / health.memory.heapTotal) * 100)
  );

  const platformLabel =
    health.platform === 'win32'
      ? 'Windows'
      : health.platform === 'linux'
      ? 'Linux'
      : health.platform === 'darwin'
      ? 'macOS'
      : health.platform;

  return (
    <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-emerald-400">
            <Activity className="h-3.5 w-3.5" />
            REALTIME SYSTEM TELEMETRY &amp; ENVIRONMENT
          </div>
          <CardTitle className="text-base font-bold text-white">
            Runtime Engine &amp; Sovereign Data Footprint
          </CardTitle>
          <CardDescription className="text-xs">
            Live process metrics, local database storage consumption, and engine status.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRunDiagnostics}
            className="h-8 gap-1.5 border-flame/40 font-mono text-xs text-flame hover:bg-flame/10"
          >
            <Activity className="h-3.5 w-3.5" />
            Run Audit
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 gap-1.5 border-slate-800 font-mono text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Server Uptime */}
          <div className="space-y-1.5 rounded-lg border border-slate-800 bg-obsidian-950 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-slate-400">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Server Uptime
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="font-mono text-lg font-black text-white">
              {formatUptime(health.uptime)}
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              PID: {health.pid} · Online
            </div>
          </div>

          {/* 2. Runtime Environment */}
          <div className="space-y-1.5 rounded-lg border border-slate-800 bg-obsidian-950 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-slate-400">
                <Server className="h-3.5 w-3.5 text-blue-400" />
                Runtime OS
              </span>
              <Badge variant="outline" className="border-blue-500/30 font-mono text-[9px] text-blue-300">
                {health.arch}
              </Badge>
            </div>
            <div className="font-mono text-base font-bold text-white">
              {health.nodeVersion}
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              {platformLabel} ({health.arch})
            </div>
          </div>

          {/* 3. Memory Heap Footprint */}
          <div className="space-y-1.5 rounded-lg border border-slate-800 bg-obsidian-950 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-slate-400">
                <Cpu className="h-3.5 w-3.5 text-purple-400" />
                Memory Heap
              </span>
              <span className="font-mono text-[10px] font-semibold text-purple-300">
                {heapPercent}%
              </span>
            </div>
            <div className="font-mono text-base font-bold text-white">
              {heapUsedMb} <span className="text-xs font-normal text-slate-400">/ {heapTotalMb} MB</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-flame transition-all"
                style={{ width: `${heapPercent}%` }}
              />
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              RSS: {rssMb} MB
            </div>
          </div>

          {/* 4. Fleet & Engine State */}
          <div className="space-y-1.5 rounded-lg border border-slate-800 bg-obsidian-950 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-slate-400">
                <Layers className="h-3.5 w-3.5 text-flame" />
                Fleet &amp; Engine
              </span>
              <Badge
                variant="outline"
                className={`font-mono text-[9px] ${
                  health.botRunning
                    ? 'border-emerald-500/50 text-emerald-300'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                {health.botRunning ? 'TASK ACTIVE' : 'IDLE'}
              </Badge>
            </div>
            <div className="font-mono text-base font-bold text-white">
              {health.fleet.active} <span className="text-xs font-normal text-slate-400">/ {health.fleet.total} Nodes Active</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
              <span>AI: <strong className="text-amber-300">{health.aiProvider.toUpperCase()}</strong></span>
              <span>·</span>
              <span>Browser: <strong className="text-cyan-300">{health.browserEngine}</strong></span>
            </div>
          </div>
        </div>

        {/* Local Sovereign Database Storage Breakdown */}
        <div className="rounded-lg border border-slate-800 bg-obsidian-950 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-200">
              <HardDrive className="h-4 w-4 text-emerald-400" />
              <span>Zero-Dependency Local Storage Footprint (`data/`)</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400">
              ✓ 100% On-Premise Sovereign Storage
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
            <div className="space-y-0.5 rounded border border-slate-800/60 bg-obsidian-900/80 p-2.5">
              <div className="text-[10px] text-slate-500">accounts.json</div>
              <div className="font-bold text-white">{health.storage.accountsCount} accounts</div>
              <div className="text-[10px] text-slate-400">{formatBytes(health.storage.accountsSizeBytes)}</div>
            </div>

            <div className="space-y-0.5 rounded border border-slate-800/60 bg-obsidian-900/80 p-2.5">
              <div className="text-[10px] text-slate-500">history.json</div>
              <div className="font-bold text-white">{health.storage.historyCount} audit logs</div>
              <div className="text-[10px] text-slate-400">{formatBytes(health.storage.historySizeBytes)}</div>
            </div>

            <div className="space-y-0.5 rounded border border-slate-800/60 bg-obsidian-900/80 p-2.5">
              <div className="text-[10px] text-slate-500">data/comments/</div>
              <div className="font-bold text-white">{health.storage.commentsFilesCount} payload files</div>
              <div className="text-[10px] text-slate-400">Dedicated JSON pools</div>
            </div>

            <div className="space-y-0.5 rounded border border-slate-800/60 bg-obsidian-900/80 p-2.5">
              <div className="text-[10px] text-slate-500">x-sentinel.log</div>
              <div className="font-bold text-white">Runtime Log</div>
              <div className="text-[10px] text-slate-400">{formatBytes(health.storage.logFileSizeBytes)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
