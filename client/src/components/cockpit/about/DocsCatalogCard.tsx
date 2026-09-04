import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

interface DocItem {
  file: string;
  desc: string;
}

const DOCS_LIST: DocItem[] = [
  {
    file: '📘 docs/ARCHITECTURE.md',
    desc: 'Mermaid topology diagrams, 4-layer system architecture, and automation data flow.',
  },
  {
    file: '⚡ docs/API_REFERENCE.md',
    desc: 'Complete catalog of REST API endpoints and SSE stream specifications.',
  },
  {
    file: '🛡️ docs/AUTOMATION_PROTOCOLS.md',
    desc: 'Playwright stealth evasion protocols, human cadence models, and GraphQL interceptors.',
  },
  {
    file: '🛠️ docs/DEVELOPMENT_GUIDE.md',
    desc: 'Environment setup instructions, script commands, testing workflows, and project directory structure.',
  },
  {
    file: '🤖 docs/AI_AGENT_PROMPT_GUIDE.md',
    desc: 'Specialized guidelines for AI coding agents (atomic writes, state hydration, error handling).',
  },
  {
    file: '📜 CHANGELOG.md & CONTRIBUTING.md',
    desc: 'SemVer release history v1.0.0 through v1.3.0 and responsible usage guidelines.',
  },
];

export const DocsCatalogCard: React.FC = () => {
  return (
    <Card className="border-border/80 bg-obsidian-850">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-cyan-400">
          <BookOpen className="h-4 w-4" />
          ENGINEERING DOCUMENTATION CATALOG
        </div>
        <CardTitle className="text-lg">Official System &amp; AI Documentation Suite</CardTitle>
        <CardDescription>
          Comprehensive documentation for engineers, contributors, and AI agents located in the{' '}
          <code>docs/</code> directory:
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS_LIST.map((doc, idx) => (
            <div key={idx} className="rounded-lg border border-slate-800 bg-obsidian-900/60 p-3">
              <div className="font-mono text-xs font-bold text-slate-200">{doc.file}</div>
              <div className="mt-1 text-[11px] text-slate-400">{doc.desc}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
