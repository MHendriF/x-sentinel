import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Code2, Cpu, Database } from 'lucide-react';

export const SystemSpecsCard: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
          SYSTEM SPECIFICATIONS
        </div>
        <CardTitle className="text-lg">Technology Stack &amp; Architectural Foundations</CardTitle>
        <CardDescription>
          Dirancang dengan fondasi teknologi modern untuk kecepatan, stabilitas, dan kedaulatan data
          lokal.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-3">
          <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-850 p-4">
            <div className="flex items-center gap-2 font-heading text-sm font-bold text-white">
              <Code2 className="h-4 w-4 text-flame" />
              Frontend Cockpit
            </div>
            <div className="space-y-1 font-mono text-xs text-slate-400">
              <div>• React 19 (Concurrent Mode)</div>
              <div>• TypeScript &amp; Vite 6</div>
              <div>• Tailwind CSS v3 &amp; Radix UI Primitives</div>
              <div>• Recharts 4-Vector Activity Graphs</div>
              <div>• Zustand Reactive State + URL Hash Sync</div>
              <div>• Server-Sent Events (SSE) Live Stream</div>
              <div>• Prettier Automated Formatting &amp; Linting</div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-850 p-4">
            <div className="flex items-center gap-2 font-heading text-sm font-bold text-purple-400">
              <Cpu className="h-4 w-4 text-purple-400" />
              Automation Backend
            </div>
            <div className="space-y-1 font-mono text-xs text-slate-400">
              <div>• Bun Runtime / Node.js 18+ (High Throughput)</div>
              <div>• Express 5 Modular REST API Routers</div>
              <div>• Microsoft Playwright Headless Browser Engine</div>
              <div>• GraphQL CreateTweet Network Interceptor</div>
              <div>• Multi-Provider LLM Engine (Groq / OpenRouter)</div>
              <div>• SOCKS5 &amp; HTTP Isolated Proxy Tunneling</div>
              <div>• Webhook Dispatcher (Telegram &amp; Discord)</div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-850 p-4">
            <div className="flex items-center gap-2 font-heading text-sm font-bold text-emerald-400">
              <Database className="h-4 w-4 text-emerald-400" />
              Storage &amp; Privacy
            </div>
            <div className="space-y-1 font-mono text-xs text-slate-400">
              <div>• Zero-Dependency Local JSON Database</div>
              <div>• Atomic Temp File Writes (.tmp) &amp; Swap</div>
              <div>• Path Traversal Security Hardening</div>
              <div>• Isolated Account Payload Directory</div>
              <div>• Git-Ignored Credentials &amp; Session Tokens</div>
              <div>• 1-Click Fleet JSON Backup &amp; Export</div>
              <div>• 100% On-Premise Data Sovereignty</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
