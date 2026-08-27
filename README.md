# 🛡️ X-SENTINEL v3.0: Autonomous Multi-Node Fleet Cockpit & Growth Studio for X

> **X-SENTINEL** adalah sistem kendali otomatisasi (*engagement & publishing cockpit*) terpadu tingkat enterprise untuk platform **X (Twitter)** berbasis **Playwright Stealth Engine**, **Multi-Node Account Cluster**, **Dedicated Proxy Tunneling**, **AI Post Studio (Anti-AI-Slop Ghostwriter)**, **Media/Image Attachments**, **Cron Auto-Scheduler & Queue**, **Telegram & Discord Webhooks**, **Fleet Health & Account Warmup Engine**, **Feed Hunter Radar**, **Bulk Fleet Onboarding & Export**, **Curated Multi-Niche Spintax Library**, serta **Cockpit UI (React 19 + TypeScript + Tailwind CSS + shadcn/ui + Recharts)**.

---

## 🌟 Fitur Utama (Core Capabilities)

### 1. 🛡️ Multi-Node Cluster, Proxy Tunneling & Health Validator
- **Zero-Password Authentication**: Otentikasi aman tanpa password menggunakan session cookies (`auth_token` & `ct0`).
- **🩺 Fleet Health Mass-Checker**: Verifikasi status kesehatan cookie login dan proxy seluruh armada node dengan 1 klik.
- **🐣 Account Warm-up Protocol**: Rutinitas pemanasan otomatis (Day 1-7: timeline scrolling & organic likes bertahap) anti-shadowban untuk akun baru.
- **Dedicated Proxy Tunneling**: Dukungan proxy per node (`user:pass@ip:port`, `ip:port:user:pass`, `socks5://`).
- **🔒 Proxy Credential Masking & Auto-Pause**: Antarmuka hanya menampilkan `IP:Port` bersih, dan auto-pause node jika proxy mati demi keamanan.
- **⚡ Live Proxy Ping & GeoIP**: Uji latensi (ms), status koneksi, IP publik, dan ISP sebelum menjalankan tugas.
- **📥 Bulk Fleet Import & 📤 Export Backup**: Daftarkan puluhan akun sekaligus via teks/JSON dan cadangkan seluruh armada ke file `.json`.

### 2. ✨ AI Post Studio, Media Upload & Auto-Scheduler
- **Auto-Generate High Engagement Posts**: Buat postingan X autentik dan tajam hanya dari kata kunci/topik dengan model AI pilihan Anda.
- **🖼️ Media & Image Attachments**: Dukungan upload gambar (PNG/JPG/GIF/WebP hingga 4 file) yang dilampirkan otomatis oleh bot Playwright.
- **⏰ Cron Auto-Scheduler & Post Queue**: Jadwalkan postingan draf di masa depan dengan interval background scheduler (15 detik).
- **5 Persona & Tone Presets**: Pilihan gaya *🔥 Viral Hook*, *💡 Alpha Insight*, *📊 Mini Value-Drop*, *🛠️ Founder Story*, dan *🇮🇩 Komunitas Indo Tech*.
- **Strict Single-Line Format**: Output 1 baris mengalir bebas *newline* (`\n`) dengan pemisah spasi alami untuk estetika native X.
- **Interactive Live Tweet Mockup & 280-Char Meter**: Editor WYSIWYG lengkap dengan preview avatar, media thumbnails, handle, dan meter karakter.
- **Multi-Node Fleet Dispatcher**: Publikasikan postingan ke 1 akun terpilih atau siarkan variasi draf unik ke seluruh armada akun.
- **📡 Integrated Live Telemetry Stream**: Pantau konsol log pengetikan Playwright secara realtime langsung dari studio.

### 3. 🤖 AI Contextual Auto-Replies & Webhooks Alert
- **Multi-Provider LLM Integration**: Mendukung **OpenRouter**, **Groq (Ultra-Fast Inference)**, **OpenAI (GPT-4o/mini)**, **Google Gemini**, dan **Local Ollama** (*self-hosted*).
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
- **1-Click Apply**: Muat template preset langsung ke *Fallback Stack* atau ke *Storage Payload* akun tertentu.
- **Live Permutation Sandbox**: Pratinjau ribuan variasi kalimat secara instan.

### 6. 📡 Feed Hunter Intelligence & Recurring Radar
- Radar pencarian otomatis postingan terkini berdasarkan kata kunci (*keywords*) atau hashtag.
- Menyaring postingan teratas dan teranyar secara dinamis.
- Menjalankan interaksi bertingkat langsung dari hasil tangkapan radar secara otomatis.
- **Recurring Hunter Mode**: Eksekusi periodik otomatis di latar belakang melalui engine penjadwalan.

### 7. 📊 Telemetry & Growth Analytics (Recharts)
- **4-Vector Metric Engine**: Pelacakan komprehensif volume **Likes**, **Reposts**, **Replies**, dan **New Posts**.
- **Activity Velocity (Area Chart)**: Tren kecepatan volume interaksi per interval waktu dengan gradien warna terpisah.
- **Compact Cumulative Badges**: Ringkasan total per vektor yang bersih, ringkas, dan responsif.
- **Node Workload Share (Donut Chart)**: Visualisasi pembagian beban kerja antar node akun dengan leaderboard.
- Pelacak rasio keberhasilan (*Success Rate*) dan akumulasi total eksekusi armada.

### 8. 📜 Immutable Audit Ledger, Date Range Filter & Maintenance
- **Exact Status URL Capture**: Menangkap URL postingan baru via intersepsi respon GraphQL API `CreateTweet` (`https://x.com/username/status/id`).
- **📅 Date Range Filter & Quick Presets**: Filter tanggal kustom serta tombol instan (*Hari Ini, 7 Hari, 30 Hari*).
- **🧹 Log Maintenance & Pruning**: Alat pembersih log riwayat interaksi (> 30 hari, > 7 hari, FAILED only, atau Reset).
- **Fast Interactive Pagination**: Pemilih 10, 25, 50, atau 100 entri per halaman dengan kontrol navigasi halaman penuh (`<<`, `<`, `>`, `>>`).
- **Filtered CSV Export**: Unduh riwayat audit yang sedang terfilter dalam format spreadsheet `.csv`.

### 9. 🔒 Anti-Ban Defense & Hardening Protocol
- **Stealth Browser Scripts**: Masking `navigator.webdriver`, WebGL GPU vendor spoofing, dan WebRTC IP leak shield.
- **Atomic File Writes**: Perlindungan data dengan penulisan file sementara (`.tmp`) + `fs.renameSync` untuk mencegah korupsi data JSON.
- **Natural Human Cadence**: Interval jeda acak (*jitter*), emulasi pengetikan bertahap (*human typing*), dan simulasi scrolling acak.
- **Graceful Teardown**: Penutupan browser dan context Playwright yang aman saat proses dihentikan (*SIGINT/SIGTERM*).

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat:
* **Bun** versi 1.0+ (Sangat Direkomendasikan) atau **Node.js** 18+
* Browser Chromium (Playwright)

### 2. Instalasi & Menjalankan:
```bash
# Clone repository
git clone https://github.com/MHendriF/x-sentinel.git
cd x-sentinel

# Install dependencies root & client
bun install

# Build client bundle
bun run build

# Jalankan server
bun start
```

Buka browser dan akses cockpit di: **`http://localhost:3000`**

---

## 📁 Arsitektur Direktori
```
x-sentinel/
├── client/                         # Frontend Cockpit (React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts)
│   ├── src/components/cockpit/     # Modular Cockpit Decks
│   │   ├── PostStudio.tsx          # ✨ AI Post Studio, Media Upload & Auto-Scheduler
│   │   ├── NodesGrid.tsx           # Multi-Node, Fleet Health Check & Warmup Protocol
│   │   ├── TargetWorkbench.tsx     # Batch Target Engagement Workbench
│   │   ├── FeedHunter.tsx          # Autonomous Feed Hunter Radar
│   │   ├── AnalyticsDeck.tsx       # 4-Vector Telemetry & Growth Analytics
│   │   ├── SpintaxVault.tsx        # Multi-Niche Spintax Library & Tester
│   │   ├── DefenseProtocol.tsx     # Anti-Ban Settings & Webhook Config (TG/Discord)
│   │   ├── AuditLedger.tsx         # Paginated Audit Ledger, Date Range & Pruning
│   │   ├── TerminalConsole.tsx     # Live Telemetry Stream Terminal
│   │   ├── TelemetryRibbon.tsx     # Top Metrics Header & Breadcrumbs
│   │   └── NavDeck.tsx             # Navigation Deck Sidebar & Hash Sync
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
├── server/
│   ├── automation/                 # Playwright Bot, Notifier, Scheduler, AIService, ProxyHelper, CookieManager
│   │   ├── twitterBot.js           # Core Automation, Health Check & Warmup Runner
│   │   ├── scheduler.js            # Background Cron & Post Queue Loop
│   │   ├── notifier.js             # Telegram & Discord Webhook Engine
│   │   ├── aiService.js            # Multi-Provider AI Inference Engine
│   │   ├── proxyHelper.js          # Live Ping & GeoIP Resolver
│   │   └── cookieManager.js        # Session Cookie Formatter & Injector
│   ├── routes/api.js               # REST API Controller
│   ├── db.js                       # Atomic JSON Storage Engine & Pruning
│   └── index.js                    # Express Application Server, Scheduler & SSE Stream
├── test/                           # Automated Verification Test Suites
└── package.json
```

---

## 📜 Lisensi & Keamanan
Proyek ini dibuat untuk riset otomatisasi media sosial beretika. Seluruh data akun, cookie, dan riwayat interaksi disimpan secara lokal di komputer Anda tanpa dikirim ke server pihak ketiga mana pun.


