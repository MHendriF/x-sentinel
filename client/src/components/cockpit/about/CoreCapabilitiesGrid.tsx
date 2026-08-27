import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Layers,
  Bot,
  Crosshair,
  BookOpen,
  Radar,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';

interface CapabilityItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  borderClass?: string;
  bullets: React.ReactNode[];
}

const CAPABILITIES_DATA: CapabilityItem[] = [
  {
    id: 'multi-node',
    title: '1. Multi-Node Cluster',
    desc: 'Manajemen armada akun dengan isolasi proxy, health checker, & warmup protocol.',
    icon: <Layers className="h-5 w-5 text-flame" />,
    bullets: [
      <>
        Otentikasi aman via cookie <code>auth_token</code> &amp; <code>ct0</code> tanpa password.
      </>,
      <>
        <strong>🩺 Fleet Health Diagnostic</strong>: Uji validitas sesi cookie &amp; proxy seluruh
        node armada dengan 1 klik.
      </>,
      <>
        <strong>🐣 Account Warm-up Protocol</strong>: Rutinitas pemanasan bertahap (Day 1-7)
        anti-shadowban untuk akun baru.
      </>,
      <>
        <strong>🔒 Proxy Masking &amp; Auto-Pause</strong>: Sembunyikan kredensial dan auto-pause
        node jika proxy mati.
      </>,
      <>
        <strong>📥 Bulk Import &amp; Export Backup</strong>: Onboarding massal teks/CSV dan ekspor
        armada ke file JSON.
      </>,
    ],
  },
  {
    id: 'ai-studio',
    title: '2. AI Post Studio & Scheduler',
    desc: 'Generator konten viral AI, lampiran gambar, & auto-post scheduler.',
    icon: <Sparkles className="h-5 w-5 text-amber-400" />,
    borderClass: 'border-amber-500/30',
    bullets: [
      <>
        <strong>5 Persona Presets</strong>: Viral Hook, Alpha Insight, Mini Value-Drop, Founder
        Story, &amp; Indo Tech.
      </>,
      <>
        <strong>🖼️ Media &amp; Image Upload</strong>: Lampirkan hingga 4 gambar (PNG/JPG/GIF/WebP)
        per postingan.
      </>,
      <>
        <strong>⏰ Cron Auto-Scheduler</strong>: Jadwalkan postingan draf di masa depan dengan
        eksekusi background otomatis.
      </>,
      <>
        <strong>WYSIWYG Tweet Mockup</strong>: Live preview avatar, handle, media thumbnail, &amp;
        live 280-char meter.
      </>,
      <>
        <strong>🎯 Single-Line Formatting</strong>: Tombol instan merapikan postingan menjadi satu
        alur tulisan mengalir.
      </>,
    ],
  },
  {
    id: 'ai-engine',
    title: '3. AI Engine & Webhooks',
    desc: 'Balasan tweet kontekstual & alert real-time ke Telegram/Discord.',
    icon: <Bot className="h-5 w-5 text-purple-400" />,
    borderClass: 'border-purple-500/30',
    bullets: [
      <>
        Multi-provider: <strong>OpenRouter</strong>, <strong>Groq</strong>, <strong>OpenAI</strong>,{' '}
        <strong>Gemini</strong>, &amp; <strong>Ollama</strong>.
      </>,
      <>
        <strong>🔔 Telegram &amp; Discord Alerts</strong>: Notifikasi instan saat tweet terbit,
        tugas selesai, atau sesi expired.
      </>,
      <>Membaca teks target dan meracik balasan sesuai tone persona terpilih.</>,
      <>
        <strong>Smart Fallback</strong>: Otomatis beralih ke Spintax jika kuota AI habis atau
        timeout.
      </>,
    ],
  },
  {
    id: 'target-workbench',
    title: '4. Target Workbench',
    desc: 'Eksekutor interaksi berurutan dengan distribusi matriks balasan 1-ke-1.',
    icon: <Crosshair className="h-5 w-5 text-red-400" />,
    bullets: [
      <>Input batch multi-line URL target dengan penundaan human jitter alami.</>,
      <>
        Vektor modular: <strong>❤️ Like</strong>, <strong>🔁 Repost</strong>, dan{' '}
        <strong>💬 Reply</strong>.
      </>,
      <>
        <strong>🔀 1-to-1 JSON Matrix</strong>: Tiap akun node memposting 1 balasan unik berbeda
        dari payload array.
      </>,
      <>Dynamic selector waiting untuk rendering DOM X modern.</>,
    ],
  },
  {
    id: 'spintax',
    title: '5. Multi-Niche Spintax',
    desc: 'Bank template spintax kurasi untuk Web3, AI, Developer, dan Komunitas Indo.',
    icon: <BookOpen className="h-5 w-5 text-amber-400" />,
    bullets: [
      <>
        5 Kategori: <strong>Web3 Alpha</strong>, <strong>AI Agents</strong>,{' '}
        <strong>Devs/SaaS</strong>, <strong>Indo Tech</strong>, dan <strong>Viral Hooks</strong>.
      </>,
      <>
        Penyimpanan komentar terisolasi per node akun (<code>data/comments/</code>).
      </>,
      <>
        <strong>1-Click Apply</strong>: Terapkan template ke fallback atau akun tertentu.
      </>,
      <>
        <strong>Live Tester</strong>: Uji ribuan permutasi spintax secara instan.
      </>,
    ],
  },
  {
    id: 'feed-hunter',
    title: '6. Feed Hunter Radar',
    desc: 'Radar pemindaian otomatis postingan trending berdasarkan kata kunci.',
    icon: <Radar className="h-5 w-5 text-blue-400" />,
    bullets: [
      <>Pemindaian postingan terbaru berdasarkan kata kunci (*keywords*) atau hashtag.</>,
      <>Penyaringan postingan teratas dan teranyar secara dinamis.</>,
      <>Otomatisasi Like, Repost, dan Balasan langsung dari hasil temuan radar.</>,
      <>
        <strong>Recurring Hunter</strong>: Penjadwalan berburu otomatis berkala via scheduler.
      </>,
    ],
  },
  {
    id: 'analytics',
    title: '7. 4-Vector Analytics',
    desc: 'Visualisasi interaktif volume interaksi dan beban kerja cluster.',
    icon: <BarChart3 className="h-5 w-5 text-emerald-400" />,
    borderClass: 'border-emerald-500/30',
    bullets: [
      <>
        <strong>4 Vektor Terintegrasi</strong>: Like, Repost, Reply, dan Postingan Baru.
      </>,
      <>
        <strong>Activity Velocity (AreaChart)</strong>: Tren volume engagement harian.
      </>,
      <>
        <strong>Cluster Share (Donut)</strong>: Distribusi proporsi beban kerja antar node.
      </>,
      <>
        <strong>Cumulative Badges</strong>: Ringkasan total metrik interaksi &amp; success rate.
      </>,
    ],
  },
  {
    id: 'audit-ledger',
    title: '8. Audit Ledger & Maintenance',
    desc: 'Log peristiwa interaksi kekal, filter tanggal angka Indonesia, & maintenance.',
    icon: <FileSpreadsheet className="h-5 w-5 text-indigo-400" />,
    bullets: [
      <>
        <strong>GraphQL Post URL Capture</strong>: Menyimpan URL langsung postingan tweet.
      </>,
      <>
        <strong>📅 Date Range &amp; Preset</strong>: Filter tanggal kustom &amp; preset cepat (*Hari
        Ini, 7 Hari, 30 Hari*) dalam format <code>DD/MM/YYYY</code>.
      </>,
      <>
        <strong>🧹 Ledger Maintenance</strong>: Pangkas log &gt;30 hari, &gt;7 hari, atau FAILED
        status.
      </>,
      <>
        <strong>Export CSV</strong>: Unduh riwayat audit terfilter ke file spreadsheet.
      </>,
    ],
  },
];

export const CoreCapabilitiesGrid: React.FC = () => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-flame">
        <Sparkles className="h-4 w-4" />
        MODULAR COCKPIT SURFACES &amp; CAPABILITIES
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES_DATA.map((item) => (
          <Card
            key={item.id}
            className={`bg-obsidian-850 transition-colors hover:border-slate-600 ${
              item.borderClass || ''
            }`}
          >
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-obsidian-900">
                {item.icon}
              </div>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription className="text-xs">{item.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                {item.bullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
