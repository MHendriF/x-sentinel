import React from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  Layers,
  Sparkles,
  Crosshair,
  BarChart3,
  BookOpen,
  Compass,
} from 'lucide-react';

interface NotFoundDeckProps {
  currentPath?: string;
}

export const NotFoundDeck: React.FC<NotFoundDeckProps> = ({ currentPath }) => {
  const { setActiveTab } = useStore();

  const handleNavigate = (tabId: string, hash: string) => {
    setActiveTab(tabId);
    window.location.hash = hash;
  };

  const displayPath =
    currentPath || (typeof window !== 'undefined' ? window.location.hash : '') || '#unknown';

  const QUICK_SECTORS = [
    {
      id: 'tab-accounts',
      hash: '#nodes',
      title: 'Multi-Node Cluster',
      desc: 'Kelola armada akun X, proxy tunnel, dan health diagnostic.',
      icon: Layers,
      color: 'text-flame border-flame/30 hover:border-flame',
    },
    {
      id: 'tab-composer',
      hash: '#composer',
      title: 'AI Post Studio',
      desc: 'Buat postingan viral AI, lampiran gambar, dan penjadwalan draf.',
      icon: Sparkles,
      color: 'text-amber-400 border-amber-500/30 hover:border-amber-500',
    },
    {
      id: 'tab-batch',
      hash: '#batch',
      title: 'Target Workbench',
      desc: 'Otomatisasi batch like, repost, dan distribusi balasan 1-to-1.',
      icon: Crosshair,
      color: 'text-red-400 border-red-500/30 hover:border-red-500',
    },
    {
      id: 'tab-analytics',
      hash: '#analytics',
      title: 'Growth Analytics',
      desc: 'Grafik tren volume aktivitas 4-vektor dan leaderboard armada.',
      icon: BarChart3,
      color: 'text-emerald-400 border-emerald-500/30 hover:border-emerald-500',
    },
  ];

  return (
    <div className="animate-in fade-in flex min-h-[70vh] flex-col items-center justify-center space-y-6 py-8 duration-300">
      {/* 404 Hero Card */}
      <Card className="relative w-full max-w-3xl overflow-hidden border-rose-500/40 bg-gradient-to-b from-obsidian-850 via-obsidian-900 to-obsidian-950 p-6 text-center shadow-2xl sm:p-10">
        <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 -mb-16 -ml-16 h-72 w-72 rounded-full bg-flame/10 blur-3xl" />

        <CardContent className="relative z-10 flex flex-col items-center space-y-5 p-0">
          {/* Badge indicator */}
          <div className="flex items-center gap-2">
            <Badge
              variant="destructive"
              className="gap-1.5 border border-rose-500/40 bg-rose-600/20 px-3 py-1 font-mono text-xs font-bold text-rose-300"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              ERROR 404 // SECTOR NOT FOUND
            </Badge>
          </div>

          {/* Holographic Radar Icon */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/30 bg-obsidian-950 shadow-inner">
            <Compass className="h-10 w-10 animate-pulse text-rose-400" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500"></span>
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">
              Sektor Tidak Ditemukan
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              Rute navigasi atau sektor antarmuka{' '}
              <code className="rounded border border-rose-500/30 bg-obsidian-950 px-2 py-0.5 font-mono text-xs text-rose-400">
                {displayPath}
              </code>{' '}
              tidak terdaftar di dalam sistem kendali matriks <strong>X-SENTINEL</strong>.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="default"
              onClick={() => handleNavigate('tab-accounts', '#nodes')}
              className="gap-2 bg-flame font-heading text-xs font-bold text-obsidian-950 shadow-md hover:bg-flame-light"
            >
              <Home className="h-4 w-4" />
              Kembali ke Cockpit Utama
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNavigate('tab-about', '#about')}
              className="gap-2 border-slate-700 bg-obsidian-900/80 font-mono text-xs text-slate-300 hover:border-slate-600 hover:text-white"
            >
              <BookOpen className="h-4 w-4 text-cyan-400" />
              Dokumentasi &amp; Specs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Quick Navigation Sectors */}
      <div className="w-full max-w-3xl space-y-3">
        <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-slate-400">
          <ArrowLeft className="h-3.5 w-3.5 text-flame" />
          SEKTOR COCKPIT YANG TERSEDIA:
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_SECTORS.map((sector) => {
            const Icon = sector.icon;
            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => handleNavigate(sector.id, sector.hash)}
                className={`group flex items-start gap-3 rounded-lg border bg-obsidian-850 p-3.5 text-left transition-all hover:bg-obsidian-800 ${sector.color}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-obsidian-950">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-heading text-xs font-bold text-white group-hover:text-amber-300">
                    {sector.title}
                  </div>
                  <div className="text-[11px] leading-tight text-slate-400">{sector.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
