# 🛡️ X-SENTINEL v1.3: Autonomous Multi-Node Fleet Cockpit & Growth Studio for X

> **X-SENTINEL** adalah sistem kendali otomatisasi (_engagement & publishing cockpit_) terpadu tingkat enterprise untuk platform **X (Twitter)** berbasis **Playwright Stealth Engine**, **Modular Sub-Architecture**, **Multi-Node Account Cluster**, **Dedicated Proxy Tunneling**, **AI Post Studio (Anti-AI-Slop Ghostwriter)**, **Media/Image Attachments**, **Cron Auto-Scheduler & Queue**, **Telegram & Discord Webhooks**, **Fleet Health & Account Warmup Engine**, **Feed Hunter Radar**, **Bulk Fleet Onboarding & Export**, **Curated Multi-Niche Spintax Library**, serta **Cockpit UI (React 19 + TypeScript + Tailwind CSS + Radix UI + Recharts)**.

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.3.0-emerald.svg)](CHANGELOG.md)
[![Runtime](https://img.shields.io/badge/runtime-Bun%20%7C%20Node.js-blue.svg)](https://bun.sh)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-purple.svg)](https://react.dev)

---

## 🌟 Fitur Utama (Core Capabilities)

### 1. 🛡️ Multi-Node Cluster, Proxy Tunneling & Health Validator

- **Zero-Password Authentication**: Otentikasi aman tanpa password menggunakan session cookies (`auth_token` & `ct0`).
- **🩺 Fleet Health Mass-Checker**: Verifikasi status kesehatan cookie login dan proxy seluruh armada node dengan 1 klik.
- **🐣 Account Warm-up Protocol**: Rutinitas pemanasan otomatis (Day 1-7: timeline scrolling & organic likes bertahap) anti-shadowban untuk akun baru.
- **Dedicated Proxy Tunneling**: Dukungan proxy per node (`user:pass@ip:port`, `ip:port:user:pass`, `socks5://`).
- **🔒 Proxy Credential Masking & Auto-Pause**: Antarmuka hanya menampilkan `IP:Port` bersih, dan auto-pause node jika proxy mati demi keamanan.
- **⚡ Live Proxy Ping & GeoIP**: Uji latensi (ms), status koneksi, IP publik, dan ISP sebelum menjalankan tugas.
- **📥 Bulk Fleet Import & 📤 Export Backup**: Daftarkan puluhan akun sekaligus via format teks/CSV dan cadangkan seluruh armada ke file `.json`.

### 2. ✨ AI Post Studio, Media Upload & Auto-Scheduler

- **Auto-Generate High Engagement Posts**: Buat postingan X autentik dan tajam hanya dari kata kunci/topik dengan model AI pilihan Anda.
- **🖼️ Media & Image Attachments**: Dukungan upload gambar (PNG/JPG/GIF/WebP hingga 4 file) yang dilampirkan otomatis oleh bot Playwright.
- **⏰ Cron Auto-Scheduler & Post Queue**: Jadwalkan postingan draf di masa depan dengan interval background scheduler (15 detik).
- **5 Persona & Tone Presets**: Pilihan gaya _🔥 Viral Hook_, _💡 Alpha Insight_, _📊 Mini Value-Drop_, _🛠️ Founder Story_, dan _🇮🇩 Komunitas Indo Tech_.
- **Strict Single-Line Format**: Output 1 baris mengalir bebas _newline_ (`\n`) dengan pemisah spasi alami untuk estetika native X.
- **Interactive Live Tweet Mockup & 280-Char Meter**: Editor WYSIWYG lengkap dengan preview avatar, media thumbnails, handle, dan meter karakter.
- **Multi-Node Fleet Dispatcher**: Publikasikan postingan ke 1 akun terpilih atau siarkan variasi draf unik ke seluruh armada akun.
- **📡 Integrated Live Telemetry Stream**: Pantau konsol log pengetikan Playwright secara realtime langsung dari studio.

### 3. 🤖 AI Contextual Auto-Replies & Webhooks Alert

- **Multi-Provider LLM Integration**: Mendukung **OpenRouter**, **Groq (Ultra-Fast Inference)**, **OpenAI (GPT-4o/mini)**, **Google Gemini**, dan **Local Ollama** (_self-hosted_).
- **🔔 Telegram & Discord Webhooks**: Notifikasi instan langsung ke smartphone/channel saat tweet diposting, sesi kedaluwarsa, atau tugas selesai.
- **Context-Aware Sentiment & Topic Extraction**: Bot otomatis membaca isi tweet target dan meracik balasan alami, relevan, dan berbobot.
- **Smart Graceful Fallback**: Beralih otomatis ke pool Spintax/JSON jika kuota AI habis atau koneksi timeout.

### 4. 🎯 Target Engagement Workbench & Matrix Distribution

- **Batch URLs Execution**: Eksekusi serentak atau berurutan pada daftar URL tweet target.
- **Modular Interaction Vectors**: Aktifkan **❤️ Like**, **🔁 Repost / Retweet**, dan **💬 Comment** sesuai kebutuhan.
- **🔀 1-to-1 Unique JSON Reply Distribution**: Mendukung payload JSON `{ "topic": "...", "replies": [...] }` di mana setiap akun node memposting 1 balasan unik yang berbeda pada target tweet.
- **Dynamic Waiting & Smart Selectors**: Deteksi rendering DOM tweet modern untuk mencegah selector timeout.

### 5. 🌐 Curated Multi-Niche Spintax Library

- **5 Niche Industry Presets**:
  1. 🌐 **Web3, Crypto & DeFi Alpha** (English: TGE, Nodes, Base, Liquidity, Layer-2)
  2. 🤖 **AI & Autonomous Agents** (English: LLMs, Inference, Multi-Agent, Tooling)
  3. 💻 **Devs & SaaS Builders** (English: Architecture, Stacks, Velocity)
  4. 🇮🇩 **Indonesian Tech & Crypto Community** (Bahasa Indonesia)
  5. 🚀 **Viral Hooks & One-Liners** (Punchy Engagement)
- **1-Click Apply**: Muat template preset langsung ke _Fallback Stack_ atau ke _Storage Payload_ akun tertentu.
- **Live Permutation Sandbox**: Pratinjau ribuan variasi kalimat secara instan.

### 6. 📡 Feed Hunter Intelligence & Recurring Radar

- Radar pencarian otomatis postingan terkini berdasarkan kata kunci (_keywords_) atau hashtag.
- Menyaring postingan teratas dan teranyar secara dinamis.
- Menjalankan interaksi bertingkat langsung dari hasil tangkapan radar secara otomatis.
- **Recurring Hunter Mode**: Eksekusi periodik otomatis di latar belakang melalui engine penjadwalan.

### 7. 📊 Telemetry & Growth Analytics (Recharts)

- **4-Vector Metric Engine**: Pelacakan komprehensif volume **Likes**, **Reposts**, **Replies**, dan **New Posts**.
- **Activity Velocity (Area Chart)**: Tren kecepatan volume interaksi per interval waktu dengan gradien warna terpisah.
- **Cumulative Vector Badges**: Ringkasan total metrik dan rasio keberhasilan (_Success Rate_) cluster.
- **Node Workload Share (Donut Chart)**: Visualisasi pembagian beban kerja antar node akun dengan leaderboard.

### 8. 📜 Immutable Audit Ledger, Date Range Filter & Maintenance

- **Exact Status URL Capture**: Menangkap URL postingan baru via intersepsi respon GraphQL API `CreateTweet` (`https://x.com/username/status/id`).
- **📅 Date Range Filter & Quick Presets**: Filter tanggal kustom serta tombol instan (_Hari Ini, 7 Hari, 30 Hari_) dalam format angka Indonesia `DD/MM/YYYY`.
- **🧹 Log Maintenance & Pruning**: Alat pembersih log riwayat interaksi (> 30 hari, > 7 hari, FAILED only, atau Reset).
- **Fast Interactive Pagination**: Pemilih 10, 25, 50, atau 100 entri per halaman dengan kontrol navigasi halaman penuh (`<<`, `<`, `>`, `>>`).
- **Filtered CSV Export**: Unduh riwayat audit yang sedang terfilter dalam format spreadsheet `.csv`.

### 9. 🔒 Anti-Ban Defense & Hardening Protocol

- **Stealth Browser Scripts**: Masking `navigator.webdriver`, WebGL GPU vendor spoofing, dan WebRTC IP leak shield.
- **Atomic File Writes**: Perlindungan data dengan penulisan file sementara (`.tmp`) + `fs.renameSync` untuk mencegah korupsi data JSON.
- **Natural Human Cadence**: Interval jeda acak (_jitter_), emulasi pengetikan bertahap (_human typing_), dan simulasi scrolling acak.
- **Graceful Teardown**: Penutupan browser dan context Playwright yang aman saat proses dihentikan (_SIGINT/SIGTERM_).

---

## 📚 Dokumentasi Lengkap (Engineering Docs)

Untuk panduan arsitektur sistem dan panduan pengembangan, silakan baca dokumentasi di folder `docs/`:

- [📘 Architecture Topology & Data Flows](docs/ARCHITECTURE.md)
- [⚡ API Reference & SSE Streaming Specs](docs/API_REFERENCE.md)
- [🛡️ Automation & Playwright Stealth Protocols](docs/AUTOMATION_PROTOCOLS.md)
- [🛠️ Development Guide & Scripts](docs/DEVELOPMENT_GUIDE.md)
- [🤖 AI Coding Agent Prompt Guidelines](docs/AI_AGENT_PROMPT_GUIDE.md)
- [📜 Changelog History](docs/CHANGELOG.md)
- [🤝 Contributing Guidelines](docs/CONTRIBUTING.md)

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat:

- **Bun** versi 1.0+ (Sangat Direkomendasikan) atau **Node.js** 18+
- Browser Chromium (Playwright)

### 2. Instalasi & Menjalankan:

```bash
# Clone repository
git clone https://github.com/MHendriF/x-sentinel.git
cd x-sentinel

# Install dependencies root & client
bun install

# Build client bundle
bun run build

# Jalankan server aplikasi
bun start
```

### 3. Mode Pengembangan (Development Mode):

```bash
# Jalankan backend server & Vite dev server secara bersamaan
bun run dev

# Format seluruh kode dengan Prettier
bun run format
```

Buka browser dan akses cockpit di: **`http://localhost:3000`** (atau `http://localhost:5173` pada mode Vite dev).

---

## 📁 Arsitektur Direktori

```
x-sentinel/
├── client/                         # Frontend Cockpit (React 19, TypeScript, Tailwind CSS, Radix UI, Recharts)
│   ├── src/components/cockpit/     # Modular Cockpit Surfaces
│   │   ├── about/                  # About & Specs Sub-Components
│   │   ├── analytics/              # 4-Vector Analytics & Leaderboard Sub-Components
│   │   ├── audit/                  # Audit Ledger, Filters & Maintenance Sub-Components
│   │   ├── postStudio/             # AI Post Studio, Mockup & Media Sub-Components
│   │   ├── AboutDeck.tsx           # About & System Specifications Orchestrator
│   │   ├── AISettingsDeck.tsx      # AI Provider & Webhook Configuration
│   │   ├── AnalyticsDeck.tsx       # Analytics Deck Orchestrator
│   │   ├── AuditLedger.tsx         # Audit Ledger Orchestrator
│   │   ├── DefenseProtocol.tsx     # Anti-Ban Settings & Webhook Config (TG/Discord)
│   │   ├── FeedHunter.tsx          # Autonomous Feed Hunter Radar
│   │   ├── NavDeck.tsx             # Navigation Deck Sidebar & URL Hash Sync
│   │   ├── NodeCard.tsx            # Node Account Card Component
│   │   ├── NodesGrid.tsx           # Multi-Node Fleet Management Grid
│   │   ├── PayloadBank.tsx         # Curated Multi-Niche Spintax Library
│   │   ├── PostStudio.tsx          # Post Studio Orchestrator
│   │   ├── TargetWorkbench.tsx     # Batch Target Engagement Workbench
│   │   ├── TelemetryRibbon.tsx     # Header Telemetry Ribbon & Metrics
│   │   └── TerminalConsole.tsx     # Live Telemetry Stream Terminal
│   ├── src/lib/presetLibrary.ts    # Curated Multi-Niche Spintax Templates
│   └── src/services/apiClient.ts   # Type-safe REST & SSE Client
├── data/                           # Local JSON Storage (Git Ignored)
│   ├── accounts.json               # Cluster Akun Terdaftar & Health Status
│   ├── comments/                   # Isolated Payload Files per Node
│   ├── media/                      # Uploaded Image Media Storage
│   ├── schedules.json              # Persistent Auto-Scheduler Tasks Queue
│   ├── settings.json               # Defense, Webhooks & AI Config
│   ├── stats.json                  # Cumulative System Metrics
│   └── history.json                # Immutable Interaction Ledger
├── docs/                           # Official Engineering & Architecture Documentation
│   ├── ARCHITECTURE.md             # Topology & Data Flows
│   ├── API_REFERENCE.md            # REST Endpoints & SSE Stream Specs
│   ├── AUTOMATION_PROTOCOLS.md     # Stealth, Warmup & Cadence Protocols
│   ├── DEVELOPMENT_GUIDE.md        # Dev Setup, Scripts & Project Tree
│   └── AI_AGENT_PROMPT_GUIDE.md    # Instructions for AI Coding Agents
├── server/
│   ├── automation/                 # Playwright Automation Subsystem
│   │   ├── bot/                    # Modularized Bot Sub-Modules
│   │   │   ├── browserFactory.js   # Isolated Context & Stealth Launch
│   │   │   ├── healthRunner.js     # Fleet Health & Warmup Routine
│   │   │   ├── humanCadence.js     # Human Delays, Typing & Scrolling
│   │   │   ├── interactionEngine.js# Like, Repost, Comment Engines
│   │   │   └── tweetComposer.js    # Post Composer & Media Uploader
│   │   ├── aiService.js            # Multi-Provider AI Inference Engine
│   │   ├── cookieManager.js        # Session Cookie Formatter & Injector
│   │   ├── notifier.js             # Telegram & Discord Webhook Engine
│   │   ├── proxyHelper.js          # Live Ping & GeoIP Resolver
│   │   ├── scheduler.js            # Background Cron & Post Queue Loop
│   │   ├── spintax.js              # Spintax Permutation Engine
│   │   └── twitterBot.js           # Core Automation Orchestrator Facade
│   ├── routes/                     # Modular Express REST Routers
│   │   ├── accountsRouter.js       # Fleet CRUD & Bulk Actions
│   │   ├── aiRouter.js             # AI Post Generator & Test
│   │   ├── historyRouter.js        # Audit History & Maintenance
│   │   ├── mediaRouter.js          # Image Upload Handler
│   │   ├── schedulesRouter.js      # Cron Post Queue Schedules
│   │   ├── settingsRouter.js       # Configuration & Webhooks
│   │   ├── tasksRouter.js          # Automation Task Runners
│   │   └── api.js                  # Master API Mount Router
│   ├── config.js                   # Application Configuration
│   ├── db.js                       # Atomic JSON Storage Engine & Pruning
│   ├── index.js                    # Express Server & SSE Stream
│   └── logger.js                   # Terminal & SSE Logger
├── test/                           # Automated Verification Test Suites
│   ├── verify.js                   # General Logic Test
│   ├── verify_bulk_import.js       # Fleet Import Verification
│   ├── verify_hardening.js         # Atomic Write & Path Traversal Checks
│   ├── verify_json_replies.js      # Unique Matrix Distribution Test
│   └── verify_proxy_formats.js     # Proxy Protocol Validation
├── CHANGELOG.md                    # Release History (SemVer v1.0.0 - v1.3.0)
├── CONTRIBUTING.md                 # Contribution Guidelines & Ethics
├── LICENSE                         # MIT License
└── package.json                    # Project Manifest & Scripts
```

---

## 📜 Lisensi & Keamanan

Didistribusikan di bawah **[Lisensi MIT](LICENSE)**. Lihat file `LICENSE` untuk rincian lengkap.

> **🔒 Kedaulatan & Keamanan Data**: Proyek ini dibuat untuk riset otomatisasi media sosial beretika. Seluruh data akun, cookie, dan riwayat interaksi disimpan secara lokal di komputer Anda pada folder `data/` tanpa pernah dikirim ke server pihak ketiga mana pun.
