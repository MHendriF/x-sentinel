import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SPRING_SNAPPY, TACTICAL_EASE } from '@/components/ui/motion';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import {
  Layers,
  Crosshair,
  Radar,
  Sliders,
  ShieldAlert,
  FileSpreadsheet,
  BarChart3,
  Info,
  X,
  Radio,
  Bot,
  Sparkles,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'tab-accounts',
    label: 'Multi-Node & Proxy',
    section: 'CONTROL SURFACES',
    icon: Layers,
  },
  {
    id: 'tab-composer',
    label: 'AI Post Studio',
    icon: Sparkles,
  },
  {
    id: 'tab-batch',
    label: 'Target Engagement',
    icon: Crosshair,
  },
  {
    id: 'tab-hunter',
    label: 'Feed Hunter',
    icon: Radar,
  },
  {
    id: 'tab-analytics',
    label: 'Analytics & Growth',
    icon: BarChart3,
  },
  {
    id: 'tab-ai',
    label: 'AI Provider Settings',
    section: 'INTELLIGENCE & DEFENSE',
    icon: Bot,
  },
  {
    id: 'tab-spintax',
    label: 'Payload & Spintax',
    icon: Sliders,
  },
  {
    id: 'tab-safety',
    label: 'Anti-Ban Protocol',
    icon: ShieldAlert,
  },
  {
    id: 'tab-history',
    label: 'Audit Logs',
    icon: FileSpreadsheet,
  },
  {
    id: 'tab-about',
    label: 'About & System Specs',
    section: 'SYSTEM & INTEL',
    icon: Info,
  },
];

export const NavDeck: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    accounts,
    isRunning,
    apiOnline,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    logout,
  } = useStore();

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a) => a.enabled !== false).length;

  // Core status reflects reality: engine reachable + task activity
  const coreStatus = !apiOnline
    ? { label: 'CORE OFFLINE', color: 'text-red-400', dot: 'bg-red-500' }
    : isRunning
      ? { label: 'TASK RUNNING', color: 'text-flame', dot: 'bg-flame' }
      : { label: 'CORE ONLINE', color: 'text-emerald', dot: 'bg-emerald' };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: TACTICAL_EASE }}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Navigation Deck Aside */}
      <aside
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 flex shrink-0 select-none flex-col gap-4 border-r border-white/[0.08] bg-obsidian-900/95 backdrop-blur-md shadow-2xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 lg:shadow-none',
          isSidebarCollapsed ? 'w-20 p-3' : 'w-72 p-5',
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center flex-col gap-2' : 'justify-between')}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-700/80 bg-obsidian-750 font-heading text-xl font-bold text-white shadow-inner">
              𝕏
            </div>
            {!isSidebarCollapsed && (
              <div className="animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 font-heading text-base font-bold tracking-tight text-white">
                  X-SENTINEL
                  <span className="font-mono text-2xs font-normal tracking-wide text-slate-500">
                    v{__APP_VERSION__}
                  </span>
                </div>
                <div className="font-mono text-2xs tracking-wide text-muted-foreground whitespace-nowrap">
                  Fleet Orchestrator
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden rounded-md p-1.5 text-slate-400 transition-colors hover:bg-obsidian-750 hover:text-white lg:flex"
              title={isSidebarCollapsed ? 'Expand Sidebar (Ctrl+B or [)' : 'Minimize Sidebar (Ctrl+B or [)'}
              aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5 text-slate-400 hover:text-white" />
              ) : (
                <PanelLeftClose className="h-5 w-5 text-slate-400 hover:text-white" />
              )}
            </button>

            {/* Mobile Drawer Close */}
            <button
              className="rounded-md p-1.5 text-slate-400 hover:bg-obsidian-750 hover:text-white lg:hidden"
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Telemetry Status Card */}
        {!isSidebarCollapsed ? (
          <div className="rounded-md border border-border/70 bg-obsidian-800 p-3 animate-in fade-in duration-200">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {apiOnline && isRunning && (
                  <span
                    className={`absolute inline-flex h-full w-full animate-pulse rounded-full ${coreStatus.dot}`}
                  ></span>
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${coreStatus.dot}`}
                ></span>
              </span>
              <span
                className={`font-mono text-xs font-bold tracking-wide ${coreStatus.color}`}
                aria-live="polite"
              >
                {coreStatus.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded border border-border/40 bg-obsidian-900/90 p-2 text-center">
              <div>
                <div className="font-mono text-2xs text-muted-foreground">NODES</div>
                <div className="font-mono text-xs font-bold text-white">{totalAccounts}</div>
              </div>
              <div>
                <div className="font-mono text-2xs text-muted-foreground">ACTIVE</div>
                <div className="font-mono text-xs font-bold text-flame">{activeAccounts}</div>
              </div>
              <div>
                <div className="font-mono text-2xs text-muted-foreground">TUNNEL</div>
                <div className="font-mono text-xs font-bold text-blue-400">
                  {activeAccounts > 0 ? `${activeAccounts}x` : 'IDLE'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed Mini Telemetry Status Pill */
          <div
            className="flex flex-col items-center justify-center rounded-md border border-border/70 bg-obsidian-800 p-2 text-center animate-in fade-in duration-200"
            title={`${coreStatus.label} — ${totalAccounts} Nodes (${activeAccounts} Active)`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {apiOnline && isRunning && (
                <span
                  className={`absolute inline-flex h-full w-full animate-pulse rounded-full ${coreStatus.dot}`}
                ></span>
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${coreStatus.dot}`}
              ></span>
            </span>
            <div className="mt-1 font-mono text-2xs font-bold text-flame">
              {activeAccounts}
            </div>
          </div>
        )}

        {/* Navigation Tabs Menu */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
                {item.section && (
                  !isSidebarCollapsed ? (
                    <div className="px-2.5 pb-1 pt-3 font-mono text-2xs font-semibold tracking-wider text-slate-400">
                      {item.section}
                    </div>
                  ) : (
                    <div className="my-1 border-t border-border/40" />
                  )
                )}
                <button
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    'group relative flex items-center rounded-lg text-xs font-medium transition-colors',
                    isSidebarCollapsed
                      ? 'justify-center p-2.5'
                      : 'gap-3 px-3 py-2.5 text-left',
                    isActive
                      ? 'font-semibold text-white'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="cockpit-nav-pill"
                      transition={SPRING_SNAPPY}
                      className={cn(
                        'pointer-events-none absolute inset-0 rounded-lg border border-white/[0.08] bg-gradient-to-r from-flame/15 via-obsidian-800/90 to-obsidian-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
                        !isSidebarCollapsed && 'border-l-2 border-l-flame'
                      )}
                    />
                  )}
                  <Icon
                    className={cn(
                      'relative z-10 h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-flame' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  {!isSidebarCollapsed && <span className="relative z-10 truncate">{item.label}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Deck Footer */}
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3 font-mono text-xs text-muted-foreground">
          <button
            id="sentinel-logout-btn"
            type="button"
            onClick={() => logout()}
            className={cn(
              'group flex items-center rounded-md border border-slate-800 bg-obsidian-950/80 text-slate-400 transition-all hover:border-red-500/40 hover:bg-red-950/20 hover:text-red-300',
              isSidebarCollapsed
                ? 'justify-center p-2'
                : 'w-full justify-between px-2.5 py-2'
            )}
            title="Terminate session and lock console"
          >
            <span className="flex items-center gap-1.5 text-2xs font-semibold tracking-wider">
              <LogOut className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-red-400" />
              {!isSidebarCollapsed && 'LOCK CONSOLE'}
            </span>
            {!isSidebarCollapsed && (
              <span className="text-2xs text-slate-500 transition-colors group-hover:text-red-400/80">
                SIGN OUT
              </span>
            )}
          </button>

          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between pt-0.5 text-2xs">
              <div className="flex items-center gap-1.5">
                <Radio className={cn('h-3 w-3', isRunning ? 'animate-pulse text-flame' : 'text-blue-400')} />
                <span>Rust · Axum</span>
              </div>
              <span className="text-slate-500">v{__APP_VERSION__}</span>
            </div>
          ) : (
            <div className="flex justify-center pt-0.5" title="HTTP/2 Stealth Active">
              <Radio className={cn('h-3 w-3', isRunning ? 'animate-pulse text-flame' : 'text-blue-400')} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
