import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TACTICAL_EASE } from '@/components/ui/motion';
import { useStore } from '@/store/useStore';
import { Heart, Repeat, MessageSquare, Sparkles, Menu, Loader2 } from 'lucide-react';

const TASK_LABELS: Record<string, string> = {
  MULTI_POST: 'FLEET POST DISPATCH',
  MULTI_BATCH: 'BATCH ENGAGEMENT',
  MULTI_HUNTER: 'FEED HUNTER',
  WARMUP: 'WARMUP PROTOCOL',
};

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  'tab-accounts': {
    title: 'Multi-Node & Proxy Management',
    subtitle: 'Manage authenticated X accounts, dedicated proxy tunnels, and payload pools.',
  },
  'tab-composer': {
    title: 'AI Post Studio & Fleet Publisher',
    subtitle:
      'Generate high-engagement post content from focus topics and broadcast across the multi-node fleet.',
  },
  'tab-batch': {
    title: 'Target Engagement Workbench',
    subtitle: 'Execute multi-node sequential engagement across Like, Repost, and Reply vectors.',
  },
  'tab-hunter': {
    title: 'Feed Hunter Intelligence',
    subtitle: 'Autonomous keyword & hashtag radar sweep with coordinated multi-node engagement.',
  },
  'tab-analytics': {
    title: 'Analytics & Growth Intelligence',
    subtitle: 'Interactive telemetry trends, node cluster distribution, and execution velocity metrics.',
  },
  'tab-ai': {
    title: 'AI Provider Settings',
    subtitle: 'Configure LLM providers, models, credentials, and autonomous reply personas.',
  },
  'tab-spintax': {
    title: 'Payload Bank & Spintax Generator',
    subtitle: 'Manage global fallback payloads, anti-slop prompt pipelines, and test spintax variations.',
  },
  'tab-safety': {
    title: 'Anti-Detection & Defense Protocol',
    subtitle: 'Tune rate limits, natural delay intervals, and browser fingerprint emulation.',
  },
  'tab-history': {
    title: 'Audit Ledger & History',
    subtitle: 'Permanent execution records across all nodes with timestamps and diagnostic traces.',
  },
  'tab-about': {
    title: 'About & System Specifications',
    subtitle: 'Architectural overview, technical specifications, and core capabilities of X-SENTINEL.',
  },
  'tab-404': {
    title: 'Page Not Found',
    subtitle: 'The requested path is unrecognized by the cockpit router.',
  },
};

export const TelemetryRibbon: React.FC = () => {
  const {
    activeTab,
    stats,
    setIsMobileDrawerOpen,
    isRunning,
    currentTask,
    setActiveTab,
    settings,
  } = useStore();
  const meta = TAB_TITLES[activeTab] ?? {
    title: 'X-SENTINEL Console',
    subtitle: 'Local Fleet Orchestrator',
  };

  const taskLabel = TASK_LABELS[currentTask?.type] ?? 'AUTOMATION TASK';
  const progressTotal = Number(currentTask?.total ?? currentTask?.targetCount ?? 0);
  const progressDone = Number(currentTask?.completed ?? 0);
  const progressFailed = Number(currentTask?.failed ?? 0);
  const progressPercent =
    progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;

  return (
    <header className="mb-6 flex flex-col flex-wrap justify-between gap-4 rounded-xl border border-white/[0.08] border-t-white/[0.12] bg-obsidian-850/80 px-5 py-4 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md lg:flex-row lg:items-center">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-md border border-border/80 bg-obsidian-850 p-2 text-slate-300 hover:text-white lg:hidden"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2.5">
            <h1
              id="page-heading"
              tabIndex={-1}
              className="font-heading text-xl font-bold tracking-tight text-white outline-none lg:text-2xl"
            >
              {meta.title}
            </h1>
            <button
              type="button"
              onClick={() => setActiveTab('tab-safety')}
              title={`Browser Engine: ${settings?.browserEngine === 'camoufox' ? 'Camoufox Stealth' : 'Chromium Core'} (Click to configure)`}
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-2xs font-semibold transition-colors ${
                settings?.browserEngine === 'camoufox'
                  ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  : 'border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  settings?.browserEngine === 'camoufox'
                    ? isRunning
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-amber-400'
                    : 'bg-blue-400'
                }`}
              />
              {settings?.browserEngine === 'camoufox' ? '🦊 Camoufox' : '⚡ Chromium'}
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground lg:text-sm">{meta.subtitle}</p>
        </div>
      </div>

      {/* Metrics Chips */}
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:grid-cols-4 sm:items-center">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: TACTICAL_EASE }}
          className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-obsidian-900/90 px-3 py-2 shadow-sm hover:border-white/[0.14]"
        >
          <div className="rounded bg-red-500/10 p-1.5 text-red-400">
            <Heart className="h-4 w-4 fill-red-400/20" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold leading-none text-white tabular-nums lg:text-base">
              {stats?.totalLikes ?? 0}
            </div>
            <div className="mt-0.5 font-mono text-2xs tracking-wider text-muted-foreground">
              LIKES
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: TACTICAL_EASE }}
          className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-obsidian-900/90 px-3 py-2 shadow-sm hover:border-white/[0.14]"
        >
          <div className="rounded bg-emerald-500/10 p-1.5 text-emerald-400">
            <Repeat className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold leading-none text-white tabular-nums lg:text-base">
              {stats?.totalRetweets ?? 0}
            </div>
            <div className="mt-0.5 font-mono text-2xs tracking-wider text-muted-foreground">
              REPOSTS
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: TACTICAL_EASE }}
          className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-obsidian-900/90 px-3 py-2 shadow-sm hover:border-white/[0.14]"
        >
          <div className="rounded bg-blue-500/10 p-1.5 text-blue-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold leading-none text-white tabular-nums lg:text-base">
              {stats?.totalComments ?? 0}
            </div>
            <div className="mt-0.5 font-mono text-2xs tracking-wider text-muted-foreground">
              REPLIES
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: TACTICAL_EASE }}
          className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-obsidian-900/90 px-3 py-2 shadow-sm hover:border-white/[0.14]"
        >
          <div className="rounded bg-amber-500/10 p-1.5 text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold leading-none text-white tabular-nums lg:text-base">
              {stats?.totalPosts ?? 0}
            </div>
            <div className="mt-0.5 font-mono text-2xs tracking-wider text-muted-foreground">
              POSTS
            </div>
          </div>
        </motion.div>
      </div>

      {/* Running Task Progress Strip */}
      <AnimatePresence>
        {isRunning && (
          <motion.button
            type="button"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: TACTICAL_EASE }}
            onClick={() => setActiveTab('tab-batch')}
            title="Click to open Live Telemetry Stream"
            className="w-full overflow-hidden rounded-lg border border-flame/40 bg-flame/5 px-3.5 py-2.5 text-left transition-colors hover:bg-flame/10"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className="flex items-center gap-2 font-mono text-xs font-bold tracking-wide text-flame"
                aria-live="polite"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {taskLabel} IN PROGRESS
              </span>
              {progressTotal > 0 && (
                <span className="font-mono text-xs text-slate-300 tabular-nums">
                  {progressDone}/{progressTotal} completed
                  {progressFailed > 0 ? ` · ${progressFailed} failed` : ''}
                </span>
              )}
            </div>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-obsidian-800"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label={`${taskLabel} progress`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={
                  progressTotal > 0 ? { width: `${Math.max(progressPercent, 4)}%` } : undefined
                }
                transition={{ duration: 0.35, ease: TACTICAL_EASE }}
                className={`h-full rounded-full bg-gradient-to-r from-flame to-flame-light ${
                  progressTotal === 0 ? 'w-1/3 animate-pulse' : ''
                }`}
              />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </header>
  );
};
