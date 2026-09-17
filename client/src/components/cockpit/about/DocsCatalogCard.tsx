import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
import { BookOpen, FileText, ArrowRight, ExternalLink } from 'lucide-react';

interface DocItem {
  id: string;
  file: string;
  badge: string;
  desc: string;
  summary: string;
  keyPoints: string[];
}

const DOCS_LIST: DocItem[] = [
  {
    id: 'architecture',
    file: '📘 docs/ARCHITECTURE.md',
    badge: 'SYSTEM TOPOLOGY',
    desc: 'Mermaid topology diagrams, 4-layer system architecture, and automation data flow.',
    summary:
      'X-Sentinel operates on a 4-tier decoupled architecture: Frontend Cockpit (React 19), Express REST & SSE Layer, Automation Bot Core (Playwright & Camoufox), and Zero-Dependency Local JSON Database. Domain boundaries strictly isolate credentials, logs, and comments.',
    keyPoints: [
      'Layer 1: React 19 Cockpit with URL Hash routing and Zustand reactive state hydration.',
      'Layer 2: Express 5 API Layer enforcing security headers, path-traversal guards, and atomic temp file writes.',
      'Layer 3: Playwright Dual-Engine Core with native C++ mouse bezier curves and WebRTC leak protection.',
      'Layer 4: Zero-DB local storage (accounts.json, history.json, comments/ directory) ensuring 100% data sovereignty.',
    ],
  },
  {
    id: 'api_reference',
    file: '⚡ docs/API_REFERENCE.md',
    badge: 'REST & SSE SPEC',
    desc: 'Complete catalog of REST API endpoints and SSE real-time stream specifications.',
    summary:
      'Exhaustive endpoint reference for all modular sub-routers: /api/accounts, /api/tasks, /api/ai, /api/schedules, /api/media, /api/history, /api/system, and /api/logs/stream.',
    keyPoints: [
      'GET /api/system/health - Real-time system telemetry, process memory, and local storage footprint.',
      'GET /api/system/diagnostics - 6-Pillar system self-diagnostic health audit.',
      'POST /api/tasks/post - Multi-account publication with staggered rotation delays and round-robin distribution.',
      'GET /api/logs/stream - Server-Sent Events (SSE) live telemetry log streaming pipeline.',
    ],
  },
  {
    id: 'protocols',
    file: '🛡️ docs/AUTOMATION_PROTOCOLS.md',
    badge: 'STEALTH & EVASION',
    desc: 'Playwright stealth evasion protocols, human cadence models, and GraphQL interceptors.',
    summary:
      'Comprehensive stealth defense manual covering Camoufox C++ fingerprint randomization, natural Gaussian typing delays, bezier cursor arcs, and robust DOM selector fallbacks.',
    keyPoints: [
      'Dual-Engine Architecture: Switchable Playwright Chromium and Camoufox Firefox C++ stealth browser.',
      'Bezier Humanized Cursor: C++ level humanized trajectory math preventing machine detection.',
      'WebRTC Leak Guard: Restricts STUN requests to prevent host IP exposure through proxies.',
      'GraphQL CreateTweet Interceptor: Captures published tweet URLs directly from network responses.',
    ],
  },
  {
    id: 'development',
    file: '🛠️ docs/DEVELOPMENT_GUIDE.md',
    badge: 'ENGINEERING WORKFLOW',
    desc: 'Environment setup instructions, script commands, testing workflows, and project directory structure.',
    summary:
      'Step-by-step developer onboarding instructions, repository scripts, verification test suite commands, and atomic file modification protocols.',
    keyPoints: [
      'bun run dev / npm run dev - Starts backend server on port 3001 with Vite HMR client.',
      'bun run --cwd client build - Validates TypeScript compilation and bundles static assets.',
      'npm test - Runs logic verification suite for Spintax, Cookies, and Database schemas.',
      'node test/verify_url_resilience.js - Verifies Playwright driver patch and error dispatch resilience.',
    ],
  },
  {
    id: 'ai_guide',
    file: '🤖 docs/AI_AGENT_PROMPT_GUIDE.md',
    badge: 'AGENT DIRECTIVES',
    desc: 'Specialized guidelines for AI coding agents (atomic writes, state hydration, error handling).',
    summary:
      'Guidelines and architectural guardrails for autonomous AI coding agents pair programming on X-Sentinel.',
    keyPoints: [
      'Preserve atomic temp writes (.tmp and rename) to avoid JSON corruption during concurrent operations.',
      'Sanitize all file inputs with getSafeCommentsFilePath to block path traversal attacks.',
      'Respect zero external DB constraint: use LocalDB with in-memory caching and disk flushing.',
      'Eliminate AI slop, quotes, and robotic sycophancy in all generated tweet drafts.',
    ],
  },
  {
    id: 'changelog',
    file: '📜 CHANGELOG.md & CONTRIBUTING.md',
    badge: 'RELEASE HISTORY',
    desc: 'SemVer release history v1.0.0 through v1.3.4 and responsible usage guidelines.',
    summary:
      'Complete evolutionary record of X-Sentinel from initial multi-account automation prototype to v1.3.4 Enterprise Cockpit.',
    keyPoints: [
      'v1.3.4: Modularization of PayloadBank and PostStudio with persistent Drafts Stash and single-row regeneration.',
      'v1.3.3: Camoufox Firefox C++ stealth browser integration and WebRTC leak shield.',
      'v1.3.2: 4-Vector Analytics Deck and RFC-4180 Audit Ledger forensics.',
      'v1.3.0: Multi-provider AI Gateway (OpenRouter, Groq, OpenAI, Gemini, Ollama) and Feed Hunter Radar.',
    ],
  },
];

export const DocsCatalogCard: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<DocItem | null>(null);

  return (
    <Card className="border-border/80 bg-obsidian-850">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-cyan-400">
          <BookOpen className="h-4 w-4" />
          ENGINEERING DOCUMENTATION CATALOG
        </div>
        <CardTitle className="text-lg font-bold text-white">
          Official System &amp; AI Documentation Suite
        </CardTitle>
        <CardDescription className="text-xs">
          Comprehensive documentation suite located in the <code>docs/</code> repository directory:
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS_LIST.map((doc) => (
            <div
              key={doc.id}
              className="group flex flex-col justify-between rounded-lg border border-slate-800 bg-obsidian-900/80 p-3.5 transition-all hover:border-slate-700 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-200">{doc.file}</span>
                  <Badge variant="outline" className="border-cyan-500/30 font-mono text-[9px] text-cyan-300">
                    {doc.badge}
                  </Badge>
                </div>
                <div className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{doc.desc}</div>
              </div>

              <div className="mt-3 border-t border-slate-800/80 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveDoc(doc)}
                  className="w-full justify-between border-slate-800 bg-obsidian-950 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-white"
                >
                  <span>Quick Read</span>
                  <ArrowRight className="h-3 w-3 text-cyan-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Quick Reader Modal */}
      <Dialog open={Boolean(activeDoc)} onOpenChange={(open) => !open && setActiveDoc(null)}>
        <DialogContent className="max-w-xl border-border/80 bg-obsidian-950 text-slate-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-cyan-400">
              <FileText className="h-3.5 w-3.5" />
              DOCUMENTATION QUICK READER
            </div>
            <DialogTitle className="font-heading text-lg font-bold text-white">
              {activeDoc?.file}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {activeDoc?.desc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-slate-800 bg-obsidian-900/80 p-3.5">
              <div className="font-mono text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                Executive Summary
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {activeDoc?.summary}
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] font-bold text-flame uppercase tracking-wider">
                Core Architectural Highlights
              </div>
              <ul className="space-y-2 font-mono text-xs text-slate-300">
                {activeDoc?.keyPoints.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-flame">•</span>
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800/80 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDoc(null)}
              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
            >
              Close Reader
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
