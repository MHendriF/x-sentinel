import React, { useState, useEffect } from 'react';
import { apiClient, SystemDiagnosticsData } from '@/services/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  ShieldCheck,
  HardDrive,
  Cpu,
  Bot,
  Layers,
  Clock,
} from 'lucide-react';

interface SystemDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDiagnosticModal: React.FC<SystemDiagnosticModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<SystemDiagnosticsData | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const res = await apiClient.getSystemDiagnostics();
      if (res.success) {
        setData(res);
        toast.success(`System audit complete: Score ${res.score}/100`);
      } else {
        toast.error('Diagnostic audit encountered an issue.');
      }
    } catch (err: any) {
      toast.error(`Diagnostic failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportDump = () => {
    if (!data) return;
    const dump = {
      systemAudit: data,
      exportedAt: new Date().toISOString(),
      agent: 'X-Sentinel Cockpit v1.3.4',
    };
    const jsonStr = JSON.stringify(dump, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `x_sentinel_diagnostic_dump_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('System diagnostic dump downloaded!');
  };

  const getPillarIcon = (id: string) => {
    switch (id) {
      case 'storage_io':
        return <HardDrive className="h-4 w-4 text-emerald-400" />;
      case 'browser_engine':
        return <Cpu className="h-4 w-4 text-cyan-400" />;
      case 'ai_gateway':
        return <Bot className="h-4 w-4 text-purple-400" />;
      case 'fleet_readiness':
        return <Layers className="h-4 w-4 text-flame" />;
      case 'stealth_cadence':
        return <ShieldCheck className="h-4 w-4 text-amber-400" />;
      case 'scheduler_engine':
        return <Clock className="h-4 w-4 text-blue-400" />;
      default:
        return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl border-border/80 bg-obsidian-950 text-slate-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
            <Activity className="h-3.5 w-3.5" />
            6-PILLAR SYSTEM SELF-DIAGNOSTIC AUDIT
          </div>
          <DialogTitle className="flex items-center justify-between font-heading text-lg font-bold text-white">
            <span>System Health &amp; Readiness Diagnostic</span>
            {data && (
              <Badge
                variant="outline"
                className={`font-mono text-xs font-bold ${
                  data.score >= 80
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                }`}
              >
                Health Score: {data.score}/100
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Real-time validation of local storage I/O, browser engine drivers, AI connectivity, and fleet state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isRunning ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-flame" />
              <div className="font-heading text-xs font-semibold text-slate-300">
                Auditing System Health Pillars...
              </div>
              <p className="font-mono text-[10px] text-slate-500">
                Testing storage I/O latency, stealth driver integrity, and daemon status.
              </p>
            </div>
          ) : !data ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No diagnostic data available. Click &quot;Run Audit&quot; to begin.
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {data.pillars.map((pillar) => (
                <div
                  key={pillar.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-obsidian-900/80 p-3 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-obsidian-950">
                      {getPillarIcon(pillar.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-xs font-bold text-white">
                          {pillar.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[9px] ${
                            pillar.passed
                              ? 'border-emerald-500/40 text-emerald-400'
                              : 'border-amber-500/40 text-amber-400'
                          }`}
                        >
                          {pillar.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {pillar.message}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {pillar.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 sm:justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportDump}
            disabled={!data || isRunning}
            className="gap-1.5 border-slate-800 font-mono text-xs text-slate-300 hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" />
            Export Diagnostic Dump
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={runDiagnostics}
              disabled={isRunning}
              className="gap-1.5 border-slate-800 font-mono text-xs text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={`h-3 w-3 ${isRunning ? 'animate-spin' : ''}`} />
              Run Again
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={onClose}
              className="bg-flame font-heading text-xs font-bold text-obsidian-950 hover:bg-flame/90"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
