import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import {
  Sparkles,
  Layers,
  Bot,
  Crosshair,
  BookOpen,
  Radar,
  BarChart3,
  FileSpreadsheet,
  Flame,
  ArrowRight,
} from 'lucide-react';

interface CapabilityItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  borderClass?: string;
  tabId: string;
  actionLabel: string;
  bullets: React.ReactNode[];
}

const CAPABILITIES_DATA: CapabilityItem[] = [
  {
    id: 'multi-node',
    title: '1. Multi-Node Cluster',
    desc: 'Fleet account management with proxy isolation, health checks, & warm-up protocols.',
    icon: <Layers className="h-5 w-5 text-flame" />,
    tabId: 'tab-accounts',
    actionLabel: 'Open Nodes Fleet',
    bullets: [
      <>
        Secure authentication via <code>auth_token</code> &amp; <code>ct0</code> cookies without passwords.
      </>,
      <>
        <strong>🩺 Fleet Health Diagnostic</strong>: Test cookie session &amp; proxy validity across
        all fleet nodes in 1 click.
      </>,
      <>
        <strong>🐣 Account Warm-up Protocol</strong>: Gradual staged warm-up routines (Days 1-7)
        to prevent shadowbans for fresh accounts.
      </>,
      <>
        <strong>🔒 Proxy Masking &amp; Auto-Pause</strong>: Mask credentials and automatically pause
        nodes if proxies fail.
      </>,
      <>
        <strong>📥 Bulk Import &amp; Export Backup</strong>: Batch CSV/text onboarding and JSON
        fleet backups.
      </>,
    ],
  },
  {
    id: 'ai-studio',
    title: '2. AI Post Studio & Scheduler',
    desc: 'AI viral content generation, image attachments, & scheduled dispatching.',
    icon: <Sparkles className="h-5 w-5 text-amber-400" />,
    borderClass: 'border-amber-500/30',
    tabId: 'tab-composer',
    actionLabel: 'Open Post Studio',
    bullets: [
      <>
        <strong>5 Persona Presets</strong>: Viral Hook, Alpha Insight, Mini Value-Drop, Founder
        Story, &amp; Tech Native.
      </>,
      <>
        <strong>🖼️ Media &amp; Image Upload</strong>: Attach up to 4 images (PNG/JPG/GIF/WebP)
        per post.
      </>,
      <>
        <strong>⏰ Cron Auto-Scheduler</strong>: Schedule future post dispatches with automated
        background execution.
      </>,
      <>
        <strong>WYSIWYG Tweet Mockup</strong>: Live preview of avatar, handle, media thumbnails, &amp;
        live 280-char meter.
      </>,
      <>
        <strong>🎯 Single-Line Formatting</strong>: Instant button to flatten multi-line text into
        a smooth, readable flow.
      </>,
    ],
  },
  {
    id: 'ai-engine',
    title: '3. AI Engine & Webhooks',
    desc: 'Contextual tweet replies & real-time webhook alerts to Telegram/Discord.',
    icon: <Bot className="h-5 w-5 text-purple-400" />,
    borderClass: 'border-purple-500/30',
    tabId: 'tab-ai',
    actionLabel: 'Open AI Studio',
    bullets: [
      <>
        Multi-provider: <strong>OpenRouter</strong>, <strong>Groq</strong>, <strong>OpenAI</strong>,{' '}
        <strong>Gemini</strong>, &amp; <strong>Ollama</strong>.
      </>,
      <>
        <strong>🔔 Telegram &amp; Discord Alerts</strong>: Instant notifications when tweets are published,
        tasks complete, or sessions expire.
      </>,
      <>Reads target tweet content and formulates replies matched to the chosen persona tone.</>,
      <>
        <strong>Smart Fallback</strong>: Automatically falls back to Spintax if AI quotas deplete
        or timeout.
      </>,
    ],
  },
  {
    id: 'target-workbench',
    title: '4. Target Workbench',
    desc: 'Sequential engagement executor with 1-to-1 reply matrix distribution.',
    icon: <Crosshair className="h-5 w-5 text-red-400" />,
    tabId: 'tab-batch',
    actionLabel: 'Open Workbench',
    bullets: [
      <>Batch multi-line target URL inputs with natural human jitter delays.</>,
      <>
        Modular vectors: <strong>❤️ Like</strong>, <strong>🔁 Repost</strong>, and{' '}
        <strong>💬 Reply</strong>.
      </>,
      <>
        <strong>🔀 1-to-1 JSON Matrix</strong>: Each fleet node posts a unique reply from an
        input array.
      </>,
      <>Dynamic DOM waiting designed for modern X web interfaces.</>,
    ],
  },
  {
    id: 'spintax',
    title: '5. Multi-Niche Spintax',
    desc: 'Curated spintax template bank for Web3, AI, Developers, and Community discussions.',
    icon: <BookOpen className="h-5 w-5 text-amber-400" />,
    tabId: 'tab-spintax',
    actionLabel: 'Open Payload Bank',
    bullets: [
      <>
        5 Categories: <strong>Web3 Alpha</strong>, <strong>AI Agents</strong>,{' '}
        <strong>Devs/SaaS</strong>, <strong>Indonesian Tech</strong>, and <strong>Viral Hooks</strong>.
      </>,
      <>
        Isolated per-node comment storage (<code>data/comments/</code>).
      </>,
      <>
        <strong>1-Click Apply</strong>: Apply templates as fallback or directly to specific accounts.
      </>,
      <>
        <strong>Live Tester</strong>: Test thousands of spintax permutations instantly.
      </>,
    ],
  },
  {
    id: 'feed-hunter',
    title: '6. Feed Hunter Radar',
    desc: 'Surveillance radar automatically monitoring trending posts by keyword.',
    icon: <Radar className="h-5 w-5 text-blue-400" />,
    tabId: 'tab-hunter',
    actionLabel: 'Open Feed Hunter',
    bullets: [
      <>Scan latest posts based on keywords or hashtags.</>,
      <>Dynamic filtering for top and recent posts.</>,
      <>Automate Likes, Reposts, and Replies directly from radar findings.</>,
      <>
        <strong>Recurring Hunter</strong>: Recurring surveillance loops scheduled via background timer.
      </>,
    ],
  },
  {
    id: 'analytics',
    title: '7. 4-Vector Analytics',
    desc: 'Interactive telemetry visualizations of engagement volume and cluster workloads.',
    icon: <BarChart3 className="h-5 w-5 text-emerald-400" />,
    borderClass: 'border-emerald-500/30',
    tabId: 'tab-analytics',
    actionLabel: 'Open Fleet Analytics',
    bullets: [
      <>
        <strong>4 Integrated Vectors</strong>: Likes, Reposts, Replies, and Published Posts.
      </>,
      <>
        <strong>Activity Velocity (AreaChart)</strong>: Daily engagement volume trends.
      </>,
      <>
        <strong>Cluster Share (Donut)</strong>: Proportional workload distribution across fleet nodes.
      </>,
      <>
        <strong>Cumulative Badges</strong>: Aggregated summary of engagement metrics &amp; success rates.
      </>,
    ],
  },
  {
    id: 'audit-ledger',
    title: '8. Audit Ledger & Maintenance',
    desc: 'Immutable event logs, custom date filtering, CSV export, & maintenance.',
    icon: <FileSpreadsheet className="h-5 w-5 text-indigo-400" />,
    tabId: 'tab-history',
    actionLabel: 'Open Audit Ledger',
    bullets: [
      <>
        <strong>GraphQL Post URL Capture</strong>: Stores direct URLs for dispatched tweets.
      </>,
      <>
        <strong>📅 Date Range &amp; Presets</strong>: Custom date filters &amp; quick presets
        (*Today, 7 Days, 30 Days*).
      </>,
      <>
        <strong>🧹 Ledger Maintenance</strong>: Prune logs older than 30 days, 7 days, or FAILED
        status.
      </>,
      <>
        <strong>Export CSV</strong>: Download filtered audit records into spreadsheet formats.
      </>,
    ],
  },
  {
    id: 'stealth-defense',
    title: '9. Dual-Engine Anti-Detect',
    desc: 'Switchable Chromium Core & Camoufox Firefox C++ stealth browser engines.',
    icon: <Flame className="h-5 w-5 text-amber-400" />,
    borderClass: 'border-amber-500/30',
    tabId: 'tab-safety',
    actionLabel: 'Open Defense Protocol',
    bullets: [
      <>
        <strong>🦊 Camoufox Firefox</strong>: Native C++ fingerprint randomization &amp; hardware spoofing.
      </>,
      <>
        <strong>🖱️ Bezier Mouse Curves</strong>: C++ level humanized cursor trajectories (<code>humanize: 0.5</code>).
      </>,
      <>
        <strong>🛡️ WebRTC IP Leak Guard</strong>: Prevents STUN requests from leaking real host IPs through proxies.
      </>,
      <>
        <strong>🔄 Resilient Vector Selectors</strong>: Multi-lingual DOM detection with SVG path signature fallbacks.
      </>,
    ],
  },
];

export const CoreCapabilitiesGrid: React.FC = () => {
  const { setActiveTab } = useStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-flame">
        <Sparkles className="h-4 w-4" />
        MODULAR COCKPIT SURFACES &amp; QUICK LAUNCHERS
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES_DATA.map((item) => (
          <Card
            key={item.id}
            className={`flex flex-col justify-between bg-obsidian-850 transition-all hover:border-slate-600 hover:shadow-lg ${
              item.borderClass || 'border-border/80'
            }`}
          >
            <div>
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-obsidian-900">
                  {item.icon}
                </div>
                <CardTitle className="text-base font-bold text-white">{item.title}</CardTitle>
                <CardDescription className="text-xs">{item.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 font-sans text-xs text-slate-300">
                <ul className="list-disc space-y-1.5 pl-4 text-slate-400">
                  {item.bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              </CardContent>
            </div>

            <CardFooter className="border-t border-slate-800/80 pt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveTab(item.tabId)}
                className="w-full justify-between border-slate-800 bg-obsidian-900 font-mono text-xs text-slate-300 transition-colors hover:border-flame/40 hover:bg-flame/10 hover:text-white"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="h-3.5 w-3.5 text-flame" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
