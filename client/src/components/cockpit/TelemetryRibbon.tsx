import React from 'react';
import { useStore } from '@/store/useStore';
import { Heart, Repeat, MessageSquare, Sparkles, Menu } from 'lucide-react';

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  'tab-accounts': {
    title: 'Manajemen Multi-Node & Proxy',
    subtitle: 'Kelola akun X terautentikasi, tunnel proxy khusus, dan pool payload JSON.',
  },
  'tab-composer': {
    title: 'AI Post Studio & Fleet Publisher',
    subtitle:
      'Hasilkan konten postingan ber-engagement tinggi dari kata kunci, lalu siarkan ke armada multi-node.',
  },
  'tab-batch': {
    title: 'Target Engagement Workbench',
    subtitle: 'Eksekusi engagement berurutan multi-node untuk vektor Like, Repost, dan Reply.',
  },
  'tab-hunter': {
    title: 'Feed Hunter Intelligence',
    subtitle: 'Pemindaian kata kunci & hashtag otonom dengan eksekusi engagement multi-node.',
  },
  'tab-analytics': {
    title: 'Analytics & Growth Intelligence',
    subtitle: 'Tren telemetri interaktif, distribusi cluster node, dan metrik velocity eksekusi.',
  },
  'tab-ai': {
    title: 'Pengaturan AI Provider',
    subtitle: 'Konfigurasi provider LLM, model, kredensial, dan persona balasan otonom.',
  },
  'tab-spintax': {
    title: 'Payload Bank & Spintax Generator',
    subtitle: 'Kelola payload fallback global dan uji permutasi spintax.',
  },
  'tab-safety': {
    title: 'Protokol Anti-Deteksi & Defense',
    subtitle: 'Atur rate limit, interval delay natural, dan flag emulasi browser.',
  },
  'tab-history': {
    title: 'Audit Ledger Interaksi',
    subtitle: 'Rekaman permanen seluruh interaksi per node beserta status dan waktunya.',
  },
  'tab-about': {
    title: 'Tentang & Spesifikasi Sistem',
    subtitle: 'Ikhtisar arsitektur, spesifikasi teknis, dan kapabilitas inti X-SENTINEL.',
  },
  'tab-404': {
    title: 'Halaman Tidak Ditemukan',
    subtitle: 'Path yang Anda buka tidak dikenali oleh cockpit.',
  },
};

export const TelemetryRibbon: React.FC = () => {
  const { activeTab, stats, setIsMobileDrawerOpen } = useStore();
  const meta = TAB_TITLES[activeTab] ?? {
    title: 'X-SENTINEL Cockpit',
    subtitle: 'Autonomous Fleet Control',
  };

  return (
    <header className="mb-6 flex flex-col justify-between gap-4 border-b border-border/80 pb-6 lg:flex-row lg:items-center">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-md border border-border/80 bg-obsidian-850 p-2 text-slate-300 hover:text-white lg:hidden"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Buka menu navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1
            id="page-heading"
            tabIndex={-1}
            className="font-heading text-xl font-bold tracking-tight text-white outline-none lg:text-2xl"
          >
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
