import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Layers,
  Crosshair,
  Radar,
  BarChart3,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
  Terminal,
  Cpu,
  Zap,
  Globe,
  Database,
  Code2,
  ExternalLink,
  Sparkles,
  Lock,
  Bot,
  UploadCloud,
  Download,
  BookOpen,
  FolderKanban,
  FileCode2,
  Activity,
} from 'lucide-react';

export const AboutDeck: React.FC = () => {
  return (
    <div className="animate-in fade-in space-y-6 pb-8 duration-300">
      {/* Hero Banner Card */}
      <Card className="relative overflow-hidden border-flame/40 bg-gradient-to-br from-obsidian-850 via-obsidian-900 to-obsidian-950 shadow-2xl">
        <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-flame/10 blur-3xl"></div>
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl"></div>

        <CardContent className="relative z-10 space-y-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="default"
              className="gap-1.5 bg-flame px-3 py-1 font-mono text-[11px] font-bold text-obsidian-950 shadow-md"
            >
              <Shield className="h-3.5 w-3.5" />
              X-SENTINEL CORE v1.3.0
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-700 bg-obsidian-900/60 font-mono text-[11px] text-slate-300"
            >
              MODULAR ARCHITECTURE · REACT 19 · AI POST STUDIO · MULTI-NODE FLEET · BUN ENGINE
            </Badge>
          </div>

          <div className="max-w-3xl space-y-2">
            <h2 className="font-heading text-2xl font-black tracking-tight text-white sm:text-3xl">
              Autonomous Multi-Node Fleet Cockpit &amp; Growth Studio for X
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              <strong>X-SENTINEL</strong> adalah platform otomatisasi (*engagement &amp; publishing
              cockpit*) tingkat lanjut untuk platform <strong>X (Twitter)</strong>. Menggabungkan
              arsitektur rotasi multi-akun modular, isolasi tunnel proxy dedicated, pembuatan
              postingan cerdas berbasis AI (*AI Post Studio*), balasan kontekstual otomatis
              (*OpenRouter, Groq, OpenAI, Gemini, Ollama*), pemindaian radar kata kunci (*Feed
              Hunter*), onboarding armada massal (*Bulk Fleet Manager*), perpustakaan spintax
              multi-niche, telemetri live stream, serta analitik visual interaktif tanpa
              ketergantungan database eksternal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>AI Post Studio &amp; Fleet Dispatcher</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-3 py-1.5">
              <Bot className="h-4 w-4 text-purple-400" />
              <span>Multi-Provider AI Context Engine</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-3 py-1.5">
              <Terminal className="h-4 w-4 text-flame" />
              <span>Realtime SSE Telemetry Stream</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-obsidian-950/80 px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Hardened Stealth &amp; Evasion</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Features Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-flame">
          <Sparkles className="h-4 w-4" />
          MODULAR COCKPIT SURFACES &amp; CAPABILITIES
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Feature 1: Multi-Node & Bulk Fleet */}
          <Card className="bg-obsidian-850 transition-colors hover:border-slate-600">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-flame">
                <Layers className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">1. Multi-Node Cluster</CardTitle>
              <CardDescription className="text-xs">
                Manajemen armada akun dengan isolasi proxy, health checker, &amp; warmup protocol.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                <li>
                  Otentikasi aman via cookie <code>auth_token</code> &amp; <code>ct0</code> tanpa
                  password.
                </li>
                <li>
                  <strong>🩺 Fleet Health Diagnostic</strong>: Uji validitas sesi cookie &amp; proxy
                  seluruh node armada dengan 1 klik.
                </li>
                <li>
                  <strong>🐣 Account Warm-up Protocol</strong>: Rutinitas pemanasan bertahap (Day
                  1-7) anti-shadowban untuk akun baru.
                </li>
                <li>
                  <strong>🔒 Proxy Masking &amp; Auto-Pause</strong>: Sembunyikan kredensial dan
                  auto-pause node jika proxy mati.
                </li>
                <li>
                  <strong>📥 Bulk Import &amp; Export Backup</strong>: Onboarding massal teks/CSV
                  dan ekspor armada ke file JSON.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 2: AI Post Creator & Studio */}
          <Card className="border-amber-500/30 bg-obsidian-850 transition-colors hover:border-slate-600">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">2. AI Post Studio &amp; Scheduler</CardTitle>
              <CardDescription className="text-xs">
                Generator konten viral AI, lampiran gambar, &amp; auto-post scheduler.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                <li>
                  <strong>5 Persona Presets</strong>: Viral Hook, Alpha Insight, Mini Value-Drop,
                  Founder Story, &amp; Indo Tech.
                </li>
                <li>
                  <strong>🖼️ Media &amp; Image Upload</strong>: Lampirkan hingga 4 gambar
                  (PNG/JPG/GIF/WebP) per postingan.
                </li>
                <li>
                  <strong>⏰ Cron Auto-Scheduler</strong>: Jadwalkan postingan draf di masa depan
                  dengan eksekusi background otomatis.
                </li>
                <li>
                  <strong>WYSIWYG Tweet Mockup</strong>: Live preview avatar, handle, media
                  thumbnail, &amp; live 280-char meter.
                </li>
                <li>
                  <strong>🎯 Single-Line Formatting</strong>: Tombol instan merapikan postingan
                  menjadi satu alur tulisan mengalir.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 3: AI Contextual Replies & Webhooks */}
          <Card className="border-purple-500/30 bg-obsidian-850 transition-colors hover:border-slate-600">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400">
                <Bot className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">3. AI Engine &amp; Webhooks</CardTitle>
              <CardDescription className="text-xs">
                Balasan tweet kontekstual &amp; alert real-time ke Telegram/Discord.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                <li>
                  Multi-provider: <strong>OpenRouter</strong>, <strong>Groq</strong>,{' '}
                  <strong>OpenAI</strong>, <strong>Gemini</strong>, &amp; <strong>Ollama</strong>.
                </li>
                <li>
                  <strong>🔔 Telegram &amp; Discord Alerts</strong>: Notifikasi instan saat tweet
                  terbit, tugas selesai, atau sesi expired.
                </li>
                <li>Membaca teks target dan meracik balasan sesuai tone persona terpilih.</li>
                <li>
                  <strong>Smart Fallback</strong>: Otomatis beralih ke Spintax jika kuota AI habis
                  atau timeout.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 4: Target Workbench & Matrix */}
          <Card className="bg-obsidian-850 transition-colors hover:border-slate-600">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                <Crosshair className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">4. Target Workbench</CardTitle>
              <CardDescription className="text-xs">
                Eksekutor interaksi berurutan dengan distribusi matriks balasan 1-ke-1.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                <li>Input batch multi-line URL target dengan penundaan human jitter alami.</li>
                <li>
                  Vektor modular: <strong>❤️ Like</strong>, <strong>🔁 Repost</strong>, dan{' '}
                  <strong>💬 Reply</strong>.
                </li>
                <li>
                  <strong>🔀 1-to-1 JSON Matrix</strong>: Tiap akun node memposting 1 balasan unik
                  berbeda dari payload array.
                </li>
                <li>Dynamic selector waiting untuk rendering DOM X modern.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 5: Curated Spintax Library */}
          <Card className="bg-obsidian-850 transition-colors hover:border-slate-600">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">5. Multi-Niche Spintax</CardTitle>
              <CardDescription className="text-xs">
                Bank template spintax kurasi untuk Web3, AI, Developer, dan Komunitas Indo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                <li>
                  5 Kategori: <strong>Web3 Alpha</strong>, <strong>AI Agents</strong>,{' '}
                  <strong>Devs/SaaS</strong>, <strong>Indo Tech</strong>, dan{' '}
                  <strong>Viral Hooks</strong>.
                </li>
                <li>
                  Penyimpanan komentar terisolasi per node akun (<code>data/comments/</code>).
                </li>
                <li>
                  <strong>1-Click Apply</strong>: Terapkan template ke fallback atau akun tertentu.
                </li>
                <li>
                  <strong>Live Tester</strong>: Uji ribuan permutasi spintax secara instan.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 6: Feed Hunter */}
          <Card className="bg-obsidian-850 transition-colors hover:border-slate-600">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
                <Radar className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">6. Feed Hunter Radar</CardTitle>
              <CardDescription className="text-xs">
                Radar pemindaian otomatis postingan trending berdasarkan kata kunci.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                <li>
                  Pemindaian postingan terbaru berdasarkan kata kunci (*keywords*) atau hashtag.
                </li>
                <li>Penyaringan postingan teratas dan teranyar secara dinamis.</li>
                <li>Otomatisasi Like, Repost, dan Balasan langsung dari hasil temuan radar.</li>
                <li>
                  <strong>Recurring Hunter</strong>: Penjadwalan berburu otomatis berkala via
                  scheduler.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 7: Telemetry & Growth Analytics */}
          <Card className="border-emerald-500/30 bg-obsidian-850 transition-colors hover:border-slate-600">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">7. 4-Vector Analytics</CardTitle>
              <CardDescription className="text-xs">
                Visualisasi interaktif volume interaksi dan beban kerja cluster.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                <li>
                  <strong>4 Vektor Terintegrasi</strong>: Like, Repost, Reply, dan Postingan Baru.
                </li>
                <li>
                  <strong>Activity Velocity (AreaChart)</strong>: Tren volume engagement harian.
                </li>
                <li>
                  <strong>Cluster Share (Donut)</strong>: Distribusi proporsi beban kerja antar
                  node.
                </li>
                <li>
                  <strong>Cumulative Badges</strong>: Ringkasan total metrik interaksi &amp; success
                  rate.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 8: Paginated Audit Ledger & Maintenance */}
          <Card className="bg-obsidian-850 transition-colors hover:border-slate-600">
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">8. Audit Ledger &amp; Maintenance</CardTitle>
              <CardDescription className="text-xs">
                Log peristiwa interaksi kekal, filter tanggal angka Indonesia, &amp; maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-sans text-xs text-slate-300">
              <ul className="list-disc space-y-1 pl-4 text-slate-400">
                <li>
                  <strong>GraphQL Post URL Capture</strong>: Menyimpan URL langsung postingan tweet.
                </li>
                <li>
                  <strong>📅 Date Range &amp; Preset</strong>: Filter tanggal kustom &amp; preset
                  cepat (*Hari Ini, 7 Hari, 30 Hari*) dalam format <code>DD/MM/YYYY</code>.
                </li>
                <li>
                  <strong>🧹 Ledger Maintenance</strong>: Pangkas log &gt;30 hari, &gt;7 hari, atau
                  FAILED status.
                </li>
                <li>
                  <strong>Export CSV</strong>: Unduh riwayat audit terfilter ke file spreadsheet.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modular Architecture Breakdown Card */}
      <Card className="border-border/80 bg-obsidian-850">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
            <FolderKanban className="h-4 w-4" />
            MODULAR CODEBASE ARCHITECTURE
          </div>
          <CardTitle className="text-lg">Sub-Modules &amp; Separation of Concerns</CardTitle>
          <CardDescription>
            Arsitektur kode refaktor yang bersih, sangat mudah di-maintain, dan terisolasi per
            domain tanggung jawab.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Backend Bot Subsystem */}
            <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-900/60 p-3.5">
              <div className="flex items-center gap-2 font-heading text-xs font-bold text-amber-400">
                <Bot className="h-4 w-4" />
                <span>Backend Core Bot (`server/automation/bot/`)</span>
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-slate-400">
                <li>
                  • <code>humanCadence.js</code>: Jitter, scrolling, typing delays
                </li>
                <li>
                  • <code>browserFactory.js</code>: Playwright context &amp; stealth
                </li>
                <li>
                  • <code>tweetComposer.js</code>: Tweet publisher &amp; media attachments
                </li>
                <li>
                  • <code>interactionEngine.js</code>: Like, Repost, Reply pipelines
                </li>
                <li>
                  • <code>healthRunner.js</code>: Fleet health &amp; warmup protocols
                </li>
              </ul>
            </div>

            {/* Express Sub-Routers */}
            <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-900/60 p-3.5">
              <div className="flex items-center gap-2 font-heading text-xs font-bold text-blue-400">
                <FileCode2 className="h-4 w-4" />
                <span>Express API Routers (`server/routes/`)</span>
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-slate-400">
                <li>
                  • <code>accountsRouter.js</code>: Fleet CRUD &amp; bulk operations
                </li>
                <li>
                  • <code>tasksRouter.js</code>: Multi-post, batch, &amp; hunter tasks
                </li>
                <li>
                  • <code>aiRouter.js</code>: AI post generator &amp; connectivity
                </li>
                <li>
                  • <code>schedulesRouter.js</code>: Automated post queues
                </li>
                <li>
                  • <code>historyRouter.js</code>: Audit history &amp; pruning
                </li>
              </ul>
            </div>

            {/* Frontend Sub-Components */}
            <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-900/60 p-3.5">
              <div className="flex items-center gap-2 font-heading text-xs font-bold text-emerald-400">
                <Code2 className="h-4 w-4" />
                <span>Frontend Surfaces (`client/src/components/`)</span>
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-slate-400">
                <li>
                  • <code>postStudio/</code>: Mockup, dropzone, schedule modal
                </li>
                <li>
                  • <code>analytics/</code>: Hook, velocity, share charts
                </li>
                <li>
                  • <code>audit/</code>: Filters, table, pagination, maintenance
                </li>
                <li>
                  • <code>ui/</code>: Reusable atomic Tailwind &amp; Radix UI components
                </li>
                <li>
                  • <code>store/useStore.ts</code>: Global reactive state hydration
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack & Architecture Specs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
            SYSTEM SPECIFICATIONS
          </div>
          <CardTitle className="text-lg">
            Technology Stack &amp; Architectural Foundations
          </CardTitle>
          <CardDescription>
            Dirancang dengan fondasi teknologi modern untuk kecepatan, stabilitas, dan kedaulatan
            data lokal.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-3">
            <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-850 p-4">
              <div className="flex items-center gap-2 font-heading text-sm font-bold text-white">
                <Code2 className="h-4 w-4 text-flame" />
                Frontend Cockpit
              </div>
              <div className="space-y-1 font-mono text-xs text-slate-400">
                <div>• React 19 (Concurrent Mode)</div>
                <div>• TypeScript &amp; Vite 6</div>
                <div>• Tailwind CSS v3 &amp; Radix UI Primitives</div>
                <div>• Recharts 4-Vector Activity Graphs</div>
                <div>• Zustand Reactive State + URL Hash Sync</div>
                <div>• Server-Sent Events (SSE) Live Stream</div>
                <div>• Prettier Automated Formatting &amp; Linting</div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-850 p-4">
              <div className="flex items-center gap-2 font-heading text-sm font-bold text-purple-400">
                <Cpu className="h-4 w-4 text-purple-400" />
                Automation Backend
              </div>
              <div className="space-y-1 font-mono text-xs text-slate-400">
                <div>• Bun Runtime / Node.js 18+ (High Throughput)</div>
                <div>• Express 5 Modular REST API Routers</div>
                <div>• Microsoft Playwright Headless Browser Engine</div>
                <div>• GraphQL CreateTweet Network Interceptor</div>
                <div>• Multi-Provider LLM Engine (Groq / OpenRouter)</div>
                <div>• SOCKS5 &amp; HTTP Isolated Proxy Tunneling</div>
                <div>• Webhook Dispatcher (Telegram &amp; Discord)</div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-850 p-4">
              <div className="flex items-center gap-2 font-heading text-sm font-bold text-emerald-400">
                <Database className="h-4 w-4 text-emerald-400" />
                Storage &amp; Privacy
              </div>
              <div className="space-y-1 font-mono text-xs text-slate-400">
                <div>• Zero-Dependency Local JSON Database</div>
                <div>• Atomic Temp File Writes (.tmp) &amp; Swap</div>
                <div>• Path Traversal Security Hardening</div>
                <div>• Isolated Account Payload Directory</div>
                <div>• Git-Ignored Credentials &amp; Session Tokens</div>
                <div>• 1-Click Fleet JSON Backup &amp; Export</div>
                <div>• 100% On-Premise Data Sovereignty</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Suite Catalog */}
      <Card className="border-border/80 bg-obsidian-850">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-cyan-400">
            <BookOpen className="h-4 w-4" />
            ENGINEERING DOCUMENTATION CATALOG
          </div>
          <CardTitle className="text-lg">Official System &amp; AI Documentation Suite</CardTitle>
          <CardDescription>
            Dokumentasi komprehensif untuk developer, kontributor, dan AI agent di dalam folder{' '}
            <code>docs/</code>:
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-obsidian-900/60 p-3">
              <div className="font-mono text-xs font-bold text-slate-200">
                📘 docs/ARCHITECTURE.md
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Diagram topologi Mermaid, arsitektur 4-layer sistem, dan alur data automasi.
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-obsidian-900/60 p-3">
              <div className="font-mono text-xs font-bold text-slate-200">
                ⚡ docs/API_REFERENCE.md
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Katalog lengkap seluruh endpoint REST API dan spesifikasi SSE stream.
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-obsidian-900/60 p-3">
              <div className="font-mono text-xs font-bold text-slate-200">
                🛡️ docs/AUTOMATION_PROTOCOLS.md
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Protokol Playwright stealth evasion, human cadence, dan GraphQL interceptor.
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-obsidian-900/60 p-3">
              <div className="font-mono text-xs font-bold text-slate-200">
                🛠️ docs/DEVELOPMENT_GUIDE.md
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Panduan setup environment, script commands, testing, dan struktur project tree.
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-obsidian-900/60 p-3">
              <div className="font-mono text-xs font-bold text-slate-200">
                🤖 docs/AI_AGENT_PROMPT_GUIDE.md
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Aturan panduan khusus untuk AI coding agents (atomic writes, state hydration).
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-obsidian-900/60 p-3">
              <div className="font-mono text-xs font-bold text-slate-200">
                📜 CHANGELOG.md &amp; CONTRIBUTING.md
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Riwayat rilis SemVer v1.0.0 s/d v1.3.0 dan panduan kontribusi etis.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety & Compliance Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 font-mono text-xs text-slate-300">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-flame" />
        <div className="space-y-1">
          <strong className="block font-bold text-amber-300">
            Prinsip Keamanan &amp; Kedaulatan Data:
          </strong>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Seluruh data akun, cookie autentikasi, dan catatan interaksi disimpan secara eksklusif
            pada komputer lokal Anda di folder <code>data/</code>. X-SENTINEL tidak mengirimkan
            kredensial atau riwayat bot Anda ke server pihak ketiga mana pun.
          </p>
        </div>
      </div>
    </div>
  );
};
