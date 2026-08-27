import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Terminal, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

export const TerminalConsole: React.FC = () => {
  const { logs, clearLogs } = useStore();
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Log berhasil disalin ke clipboard.');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-emerald-400';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-red-400 font-semibold';
      case 'action':
        return 'text-sky-400 font-bold';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <Card className="flex h-[520px] flex-col border-slate-800 bg-obsidian-950">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-flame" />
          <CardTitle className="font-mono text-xs font-bold tracking-wider text-slate-300">
            LIVE TELEMETRY STREAM
          </CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-6 px-2 font-mono text-[10px] text-slate-400 hover:text-white"
          >
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearLogs}
            className="h-6 px-2 font-mono text-[10px] text-slate-400 hover:text-red-400"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent
        className="flex-1 space-y-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
        ref={screenRef}
      >
        {logs.length === 0 ? (
          <div className="py-6 text-center italic text-slate-600">
            [SYS] Menunggu event telemetry dari Playwright engine...
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 break-all rounded px-1 py-0.5 hover:bg-slate-900/40"
            >
              <span className="shrink-0 select-none text-[10px] text-slate-600">
                [{log.timestamp || 'LOG'}]
              </span>
              <span className={getLevelColor(log.level)}>{log.message}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
