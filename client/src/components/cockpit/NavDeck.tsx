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
} from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'tab-accounts',
    label: 'Multi-Node & Proxy',
    section: 'CONTROL SURFACES',
    icon: Layers,
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
    id: 'tab-spintax',
    label: 'Payload & Spintax',
    section: 'PAYLOAD & DEFENSE',
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
  const { activeTab, setActiveTab, accounts, isMobileDrawerOpen, setIsMobileDrawerOpen } = useStore();

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => a.enabled !== false).length;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Navigation Deck Aside */}
      <aside
        className={cn(
          'fixed lg:static top-0 left-0 bottom-0 z-50 w-72 bg-obsidian-850 border-r border-border/80 p-5 flex flex-col gap-5 transition-transform duration-300 ease-in-out lg:translate-x-0 shrink-0 select-none shadow-2xl lg:shadow-none',
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-obsidian-750 border border-slate-700/80 flex items-center justify-center font-heading font-bold text-xl text-white shadow-inner">
              𝕏
            </div>
            <div>
              <div className="font-heading font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                X-SENTINEL
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-flame/20 text-flame border border-flame/30">v2.5</span>
              </div>
              <div className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">
                Autonomous Fleet Control
              </div>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-obsidian-750"
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Status Card */}
        <div className="rounded-md border border-border/70 bg-obsidian-800 p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald"></span>
            </span>
            <span className="font-mono text-[11px] font-bold text-emerald tracking-wide">
              CORE ONLINE
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 bg-obsidian-900/90 rounded p-2 text-center border border-border/40">
            <div>
              <div className="font-mono text-[9px] text-muted-foreground">NODES</div>
              <div className="font-mono font-bold text-xs text-white">{totalAccounts}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-muted-foreground">ACTIVE</div>
              <div className="font-mono font-bold text-xs text-flame">{activeAccounts}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-muted-foreground">TUNNEL</div>
              <div className="font-mono font-bold text-xs text-blue-400">
                {activeAccounts > 0 ? `${activeAccounts}x` : 'IDLE'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Menu */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
                {item.section && (
                  <div className="font-mono text-[10px] tracking-wider text-slate-500 font-semibold px-2.5 pt-3 pb-1">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all text-left group',
                    isActive
                      ? 'bg-obsidian-800 text-white font-semibold border-l-2 border-flame shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-obsidian-800/50'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
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
        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>HTTP/2 Stealth</span>
          </div>
          <span className="text-slate-600">v2.4.0</span>
        </div>
      </aside>
    </>
  );
};
