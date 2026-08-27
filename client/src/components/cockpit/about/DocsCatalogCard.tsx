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
    desc: 'Diagram topologi Mermaid, arsitektur 4-layer sistem, dan alur data automasi.',
  },
  {
    file: '⚡ docs/API_REFERENCE.md',
    desc: 'Katalog lengkap seluruh endpoint REST API dan spesifikasi SSE stream.',
  },
  {
    file: '🛡️ docs/AUTOMATION_PROTOCOLS.md',
    desc: 'Protokol Playwright stealth evasion, human cadence, dan GraphQL interceptor.',
  },
  {
    file: '🛠️ docs/DEVELOPMENT_GUIDE.md',
    desc: 'Panduan setup environment, script commands, testing, dan struktur project tree.',
  },
  {
    file: '🤖 docs/AI_AGENT_PROMPT_GUIDE.md',
    desc: 'Aturan panduan khusus untuk AI coding agents (atomic writes, state hydration).',
  },
  {
    file: '📜 CHANGELOG.md & CONTRIBUTING.md',
    desc: 'Riwayat rilis SemVer v1.0.0 s/d v1.3.0 dan panduan kontribusi etis.',
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
          Dokumentasi komprehensif untuk developer, kontributor, dan AI agent di dalam folder{' '}
          <code>docs/</code>:
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
