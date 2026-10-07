import React from 'react';
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
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Navigation Deck Aside */}
      <aside
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 flex shrink-0 select-none flex-col gap-4 border-r border-border/80 bg-obsidian-850 shadow-2xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 lg:shadow-none',
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
                  <span className="font-mono text-[10px] font-normal tracking-wide text-slate-500">
                    v{__APP_VERSION__}
                  </span>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Autonomous Fleet Control
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
                <span
                  className={`absolute inline-flex h-full w-full ${apiOnline ? 'animate-ping opacity-75' : ''} rounded-full ${coreStatus.dot}`}
                ></span>
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${coreStatus.dot}`}
                ></span>
              </span>
              <span
                className={`font-mono text-[11px] font-bold tracking-wide ${coreStatus.color}`}
                aria-live="polite"
              >
                {coreStatus.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded border border-border/40 bg-obsidian-900/90 p-2 text-center">
              <div>
                <div className="font-mono text-[9px] text-muted-foreground">NODES</div>
                <div className="font-mono text-xs font-bold text-white">{totalAccounts}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-muted-foreground">ACTIVE</div>
                <div className="font-mono text-xs font-bold text-flame">{activeAccounts}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-muted-foreground">TUNNEL</div>
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
              <span
                className={`absolute inline-flex h-full w-full ${apiOnline ? 'animate-ping opacity-75' : ''} rounded-full ${coreStatus.dot}`}
              ></span>
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${coreStatus.dot}`}
              ></span>
            </span>
            <div className="mt-1 font-mono text-[9px] font-bold text-flame">
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
                    <div className="px-2.5 pb-1 pt-3 font-mono text-[10px] font-semibold tracking-wider text-slate-400">
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
                    'group flex items-center rounded-md text-xs font-medium transition-all',
                    isSidebarCollapsed
                      ? 'justify-center p-2.5'
                      : 'gap-3 px-3 py-2.5 text-left',
                    isActive
                      ? isSidebarCollapsed
                        ? 'border border-flame/50 bg-obsidian-800 text-white shadow-sm'
                        : 'border-l-2 border-flame bg-obsidian-800 font-semibold text-white shadow-sm'
                      : 'text-slate-400 hover:bg-obsidian-800/50 hover:text-slate-100'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-flame' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Deck Footer */}
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3 font-mono text-[11px] text-muted-foreground">
          <button
            id="sentinel-logout-btn"
            type="button"
            onClick={() => logout()}
            className={cn(
              'group flex items-center rounded-md border border-slate-800 bg-obsidian-950/80 text-slate-400 transition-all hover:border-red-500/40 hover:bg-red-950/20 hover:text-red-300',
              isSidebarCollapsed
                ? 'justify-center p-2'
                : 'w-full justify-between px-2.5 py-1.5'
            )}
            title="Terminate session and lock cockpit"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider">
              <LogOut className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-red-400" />
              {!isSidebarCollapsed && 'LOCK COCKPIT'}
            </span>
            {!isSidebarCollapsed && (
              <span className="text-[9px] text-slate-600 transition-colors group-hover:text-red-400/80">
                DISCONNECT
              </span>
            )}
          </button>

          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Radio className="h-3 w-3 animate-pulse text-blue-400" />
                <span>HTTP/2 Stealth</span>
              </div>
              <span className="text-slate-500">v{__APP_VERSION__}</span>
            </div>
          ) : (
            <div className="flex justify-center pt-0.5" title="HTTP/2 Stealth Active">
              <Radio className="h-3 w-3 animate-pulse text-blue-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
