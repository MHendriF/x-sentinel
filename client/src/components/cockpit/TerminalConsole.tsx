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
    <Card className="flex flex-col h-[520px] bg-obsidian-950 border-slate-800">
      <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b border-slate-800 space-y-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-flame" />
          <CardTitle className="font-mono text-xs font-bold text-slate-300 tracking-wider">
            LIVE TELEMETRY STREAM
          </CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-6 px-2 text-[10px] font-mono text-slate-400 hover:text-white"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearLogs}
            className="h-6 px-2 text-[10px] font-mono text-slate-400 hover:text-red-400"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-3 font-mono text-xs overflow-y-auto leading-relaxed space-y-1" ref={screenRef}>
        {logs.length === 0 ? (
          <div className="text-slate-600 italic py-6 text-center">
            [SYS] Menunggu event telemetry dari Playwright engine...
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2 break-all hover:bg-slate-900/40 px-1 py-0.5 rounded">
              <span className="text-slate-600 text-[10px] shrink-0 select-none">
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
