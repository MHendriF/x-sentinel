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
  const { activeTab, setActiveTab, accounts, isMobileDrawerOpen, setIsMobileDrawerOpen } =
    useStore();

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a) => a.enabled !== false).length;

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
          'fixed bottom-0 left-0 top-0 z-50 flex w-72 shrink-0 select-none flex-col gap-5 border-r border-border/80 bg-obsidian-850 p-5 shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:shadow-none',
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700/80 bg-obsidian-750 font-heading text-xl font-bold text-white shadow-inner">
              𝕏
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-heading text-base font-bold tracking-tight text-white">
                X-SENTINEL
                <span className="rounded border border-flame/30 bg-flame/20 px-1.5 py-0.5 font-mono text-[9px] text-flame">
                  v1.3
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Autonomous Fleet Control
              </div>
            </div>
          </div>
          <button
            className="rounded-md p-1.5 text-slate-400 hover:bg-obsidian-750 hover:text-white lg:hidden"
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Telemetry Status Card */}
        <div className="rounded-md border border-border/70 bg-obsidian-800 p-3">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald"></span>
            </span>
            <span className="font-mono text-[11px] font-bold tracking-wide text-emerald">
              CORE ONLINE
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

        {/* Navigation Tabs Menu */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
                {item.section && (
                  <div className="px-2.5 pb-1 pt-3 font-mono text-[10px] font-semibold tracking-wider text-slate-500">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs font-medium transition-all',
                    isActive
                      ? 'border-l-2 border-flame bg-obsidian-800 font-semibold text-white shadow-sm'
                      : 'text-slate-400 hover:bg-obsidian-800/50 hover:text-slate-100'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive ? 'text-flame' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <span>{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Deck Footer */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 animate-pulse text-blue-400" />
            <span>HTTP/2 Stealth</span>
          </div>
          <span className="text-slate-600">v2.4.0</span>
        </div>
      </aside>
    </>
  );
};
