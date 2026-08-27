import React from 'react';
import { useStore } from '@/store/useStore';
import { Heart, Repeat, MessageSquare, Sparkles, Menu } from 'lucide-react';

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  'tab-accounts': {
    title: 'Multi-Node & Proxy Management',
    subtitle:
      'Configure authenticated X accounts, dedicated proxy tunnels, and JSON payload pools.',
  },
  'tab-composer': {
    title: 'AI Post Studio & Fleet Publisher',
    subtitle:
      'Generate high-engagement post content from keywords and broadcast across multi-node fleets.',
  },
  'tab-batch': {
    title: 'Target Engagement Workbench',
    subtitle:
      'Execute multi-node sequential engagement for Like, Repost, and Custom Reply vectors.',
  },
  'tab-hunter': {
    title: 'Feed Hunter Intelligence',
    subtitle: 'Autonomous keyword scanning and multi-node engagement sequence.',
  },
  'tab-analytics': {
    title: 'Analytics & Growth Intelligence',
    subtitle:
      'Interactive telemetry trends, node cluster distribution, and execution velocity metrics.',
  },
  'tab-spintax': {
    title: 'Payload Bank & Spintax Generator',
    subtitle: 'Configure global fallback payloads and test spintax permutations.',
  },
  'tab-safety': {
    title: 'Anti-Detection & Defense Protocol',
    subtitle: 'Configure rate limits, natural delay intervals, and browser emulation flags.',
  },
  'tab-history': {
    title: 'Interaction Audit Ledger',
    subtitle: 'Full immutable record of all processed interactions per node.',
  },
  'tab-about': {
    title: 'About & System Specifications',
    subtitle:
      'Architecture overview, technical specifications, and core capabilities of X-SENTINEL.',
  },
};

export const TelemetryRibbon: React.FC = () => {
  const { activeTab, stats, setIsMobileDrawerOpen } = useStore();
  const meta = TAB_TITLES[activeTab] || TAB_TITLES['tab-accounts'];

  return (
    <header className="mb-6 flex flex-col justify-between gap-4 border-b border-border/80 pb-6 lg:flex-row lg:items-center">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-md border border-border/80 bg-obsidian-850 p-2 text-slate-300 hover:text-white lg:hidden"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-white lg:text-2xl">
            {meta.title}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground lg:text-sm">{meta.subtitle}</p>
        </div>
      </div>

      {/* Metrics Chips */}
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:grid-cols-4 sm:items-center">
        <div className="flex items-center gap-3 rounded-md border border-border/80 bg-obsidian-850 px-3 py-2 shadow-sm">
          <div className="rounded bg-red-500/10 p-1.5 text-red-400">
            <Heart className="h-4 w-4 fill-red-400/20" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold leading-none text-white lg:text-base">
              {stats?.totalLikes ?? 0}
            </div>
            <div className="mt-0.5 font-mono text-[9px] tracking-wider text-muted-foreground">
              LIKES
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border/80 bg-obsidian-850 px-3 py-2 shadow-sm">
          <div className="rounded bg-emerald-500/10 p-1.5 text-emerald-400">
            <Repeat className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold leading-none text-white lg:text-base">
              {stats?.totalRetweets ?? 0}
            </div>
            <div className="mt-0.5 font-mono text-[9px] tracking-wider text-muted-foreground">
              REPOSTS
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border/80 bg-obsidian-850 px-3 py-2 shadow-sm">
          <div className="rounded bg-blue-500/10 p-1.5 text-blue-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold leading-none text-white lg:text-base">
              {stats?.totalComments ?? 0}
            </div>
            <div className="mt-0.5 font-mono text-[9px] tracking-wider text-muted-foreground">
              REPLIES
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border/80 bg-obsidian-850 px-3 py-2 shadow-sm">
          <div className="rounded bg-amber-500/10 p-1.5 text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold leading-none text-white lg:text-base">
              {stats?.totalPosts ?? 0}
            </div>
            <div className="mt-0.5 font-mono text-[9px] tracking-wider text-muted-foreground">
              POSTS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
