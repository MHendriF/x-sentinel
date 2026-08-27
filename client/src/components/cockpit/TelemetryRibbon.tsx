import React from 'react';
import { useStore } from '@/store/useStore';
import { Heart, Repeat, MessageSquare, Sparkles, Menu } from 'lucide-react';

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  'tab-accounts': {
    title: 'Multi-Node & Proxy Management',
    subtitle: 'Configure authenticated X accounts, dedicated proxy tunnels, and JSON payload pools.',
  },
  'tab-composer': {
    title: 'AI Post Studio & Fleet Publisher',
    subtitle: 'Generate high-engagement post content from keywords and broadcast across multi-node fleets.',
  },
  'tab-batch': {
    title: 'Target Engagement Workbench',
    subtitle: 'Execute multi-node sequential engagement for Like, Repost, and Custom Reply vectors.',
  },
  'tab-hunter': {
    title: 'Feed Hunter Intelligence',
    subtitle: 'Autonomous keyword scanning and multi-node engagement sequence.',
  },
  'tab-analytics': {
    title: 'Analytics & Growth Intelligence',
    subtitle: 'Interactive telemetry trends, node cluster distribution, and execution velocity metrics.',
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
    subtitle: 'Architecture overview, technical specifications, and core capabilities of X-SENTINEL.',
  },
};

export const TelemetryRibbon: React.FC = () => {
  const { activeTab, stats, setIsMobileDrawerOpen } = useStore();
  const meta = TAB_TITLES[activeTab] || TAB_TITLES['tab-accounts'];

  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-border/80">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 bg-obsidian-850 border border-border/80 rounded-md text-slate-300 hover:text-white"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading font-bold text-xl lg:text-2xl text-white tracking-tight">
            {meta.title}
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Metrics Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:flex sm:items-center">
        <div className="flex items-center gap-3 bg-obsidian-850 border border-border/80 rounded-md px-3 py-2 shadow-sm">
          <div className="p-1.5 rounded bg-red-500/10 text-red-400">
            <Heart className="w-4 h-4 fill-red-400/20" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm lg:text-base text-white leading-none">
              {stats?.totalLikes ?? 0}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground tracking-wider mt-0.5">
              LIKES
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-obsidian-850 border border-border/80 rounded-md px-3 py-2 shadow-sm">
          <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm lg:text-base text-white leading-none">
              {stats?.totalRetweets ?? 0}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground tracking-wider mt-0.5">
              REPOSTS
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-obsidian-850 border border-border/80 rounded-md px-3 py-2 shadow-sm">
          <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm lg:text-base text-white leading-none">
              {stats?.totalComments ?? 0}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground tracking-wider mt-0.5">
              REPLIES
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-obsidian-850 border border-border/80 rounded-md px-3 py-2 shadow-sm">
          <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm lg:text-base text-white leading-none">
              {stats?.totalPosts ?? 0}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground tracking-wider mt-0.5">
              POSTS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
