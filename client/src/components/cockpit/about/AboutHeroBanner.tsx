import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Sparkles, Bot, Terminal, ShieldCheck } from 'lucide-react';

export const AboutHeroBanner: React.FC = () => {
  return (
    <Card className="relative overflow-hidden border-flame/40 bg-gradient-to-br from-obsidian-850 via-obsidian-900 to-obsidian-950 shadow-2xl">
      <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-flame/10 blur-3xl"></div>
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl"></div>

      <CardContent className="relative z-10 space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="default"
            className="gap-1.5 bg-flame px-3 py-1 font-mono text-[11px] font-bold text-obsidian-950 shadow-md"
          >
            <Shield className="h-3.5 w-3.5" />
            X-SENTINEL CORE v1.3.0
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-700 bg-obsidian-900/60 font-mono text-[11px] text-slate-300"
          >
            MODULAR ARCHITECTURE · REACT 19 · AI POST STUDIO · MULTI-NODE FLEET · BUN ENGINE
          </Badge>
        </div>

        <div className="max-w-3xl space-y-2">
          <h2 className="font-heading text-2xl font-black tracking-tight text-white sm:text-3xl">
            Autonomous Multi-Node Fleet Cockpit &amp; Growth Studio for X
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            <strong>X-SENTINEL</strong> adalah platform otomatisasi (*engagement &amp; publishing
            cockpit*) tingkat enterprise untuk platform <strong>X (Twitter)</strong>. Menggabungkan
            arsitektur rotasi multi-akun modular, isolasi tunnel proxy dedicated, pembuatan
            postingan cerdas berbasis AI (*AI Post Studio*), balasan kontekstual otomatis
            (*OpenRouter, Groq, OpenAI, Gemini, Ollama*), pemindaian radar kata kunci (*Feed
            Hunter*), onboarding armada massal (*Bulk Fleet Manager*), perpustakaan spintax
            multi-niche, telemetri live stream, serta analitik visual interaktif tanpa
            ketergantungan database eksternal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2 font-mono text-xs text-slate-300">
          <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-3 py-1.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>AI Post Studio &amp; Fleet Dispatcher</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-3 py-1.5">
            <Bot className="h-4 w-4 text-purple-400" />
            <span>Multi-Provider AI Context Engine</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-3 py-1.5">
            <Terminal className="h-4 w-4 text-flame" />
            <span>Realtime SSE Telemetry Stream</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-3 py-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Hardened Stealth &amp; Evasion</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
