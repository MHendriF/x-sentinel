# 🛡️ X-SENTINEL

> **Autonomous Multi-Node Fleet Cockpit & AI Growth Studio for X (Twitter)**
> Platform kendali otomatisasi terpadu berbasis **Playwright Stealth**, **Camoufox C++ Anti-Detect**, **Multi-Node Cluster**, **AI Post & Payload Studio**, dan **React 19 Cockpit**.

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.3.5-emerald.svg)](docs/CHANGELOG.md)
[![Runtime](https://img.shields.io/badge/runtime-Bun%20%7C%20Node.js%2018%2B-blue.svg)](https://bun.sh)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-purple.svg)](https://react.dev)

---

## ⚡ Ringkasan Fitur Utama

| Modul | Deskripsi Utama |
| :--- | :--- |
| **✨ AI Post Studio** | Generator postingan viral anti-AI-slop, upload media (PNG/JPG/GIF/WebP), persistent **Drafts Stash Drawer**, 4 Quick Polishers, single-row AI regenerate, dan **Staggered Fleet Delay** broadcasting. |
| **💬 Payload Bank Studio** | Vault komentar & balasan tweet modular, generator balasan anti-slop tanpa tanda kutip, barometer 280-karakter, regenerasi single-row, dan inspektor/penghapus file server aman anti path-traversal. |
| **🤖 Contextual AI Studio** | Universal model registry (_Groq, OpenRouter, OpenAI, Gemini, Ollama, 9router_), 7 persona presets terkalibrasi, sistem prompt anti-slop guardrails, dan live sandbox tester interaktif. |
| **⏰ Cron Scheduler** | Penjadwalan postingan dan radar pencarian dengan eksekusi background otomatis (loop 15 detik), pause/resume, dan pemantauan status queue. |
| **🛡️ Multi-Node Cluster** | Manajemen multi-akun tanpa password (via `auth_token` & `ct0`), isolasi dedicated proxy per node, health check serentak 1-klik, dan rutinitas warmup bertahap 7 hari. |
| **🦊 Dual-Engine Stealth** | Arsitektur switchable: Playwright Chromium & Camoufox Anti-Detect Firefox dengan pergerakan mouse kurva Bezier biologis (`humanize: 0.5`), WebRTC leak shield, dan patch driver URL resilience. |
| **🎯 Target Workbench** | Batch engagement (**Like**, **Repost**, **Comment**) berketahanan tinggi dengan selector SVG signature, deteksi author restriction, dan distribusi 1-to-1 balasan unik. |
| **📡 Feed Hunter Radar** | Pencarian otomatis tweet trending berdasarkan kata kunci atau hashtag secara berkala dengan filter Top / Latest. |
| **📊 Forensic Audit Ledger** | Audit telemetry HUD, RFC-4180 CSV export dengan escaping karakter aman, modal inspeksi detail payload/error, filter tanggal numerik (`DD/MM/YYYY`), dan maintenance log. |
| **🛰️ Live System Telemetry** | HUD metrik realtime (Heap/RSS RAM, Uptime, Active Nodes, Disk Storage), progress bar task global di semua tab, dan **6-Pillar System Diagnostic Self-Audit** 1-klik (`/api/system/diagnostics`). |
| **🔒 Stealth & Local Defense** | WebRTC IP leak shield, mitigasi fingerprinting, penundaan human cadence (_jitter typing/scroll_), server loopback 127.0.0.1, secret masking, dan atomic database writes. |

---

## 🚀 Panduan Cepat (Quick Start)

### 1. Prasyarat

- **[Bun](https://bun.sh)** v1.0+ _(Direkomendasikan)_ atau **Node.js** v18+
- Browser Chromium & Firefox (diunduh otomatis oleh Playwright / Camoufox)

### 2. Instalasi & Menjalankan

```bash
# 1. Clone repository
git clone https://github.com/MHendriF/x-sentinel.git
cd x-sentinel

# 2. Pasang dependensi (menjalankan postinstall patchPlaywright otomatis)
bun install

# 3. Kompilasi frontend client
bun run build

# 4. Jalankan aplikasi
bun start
```

Akses Web Cockpit di: **`http://localhost:3000`**

### 3. Perintah Pengembangan (Developer Scripts)

```bash
# Mode Live Development (Backend + Vite HMR)
bun run dev

# Jalankan Test Suite Verifikasi (DB, Spintax, Cookie, Masking)
node test/verify.js

# Jalankan Verifikasi Ketahanan Driver URL & Location Patch
node test/verify_url_resilience.js

# Jalankan API Smoke Test (boot server + assert security guard & masking)
bun run smoke

# Lint Server Code (ESLint)
bun run lint

# Format & Lint Seluruh Kode (Prettier)
bun run format
```

---

## 💡 Fitur Unggulan

### 1. ✨ AI Post Studio, Drafts Stash & Fleet Dispatcher

- **5 Persona Post Siap Pakai**: _🔥 Viral Hook_, _💡 Alpha Insight_, _📊 Mini Value-Drop_, _🛠️ Founder Story_, dan _🇮🇩 Komunitas Indo Tech_.
- **Persistent Drafts Stash Drawer**: Simpan ide draf tak terbatas di `localStorage` dengan tagging topik dan filter pencarian instan.
- **⚡ 4 Quick Polishers**: Poles draf dengan 1-klik: _Hook Booster_, _Punchline Polish_, _Formalize_, atau _Slop Purge_.
- **Strict Single-Line Output**: Merapikan teks menjadi 1 alur tulisan mengalir tanpa jeda baris kaku (`\n`).
- **Live WYSIWYG Tweet Mockup**: Pratinjau live avatar, handle, media thumbnails, dan indikator barometer 280 karakter.
- **Fleet Dispatcher & Staggered Broadcast**: Kirim ke 1 akun terpilih atau siarkan variasi draf berbeda ke seluruh armada dengan jeda rotasi aman (5s - 60s).

### 2. 💬 Payload Bank Studio & Anti-Slop AI Replier

- **Anti-AI-Slop Reply Generator**: Menghasilkan balasan tweet kontekstual bersinyal tinggi dari teks tweet target tanpa kutipan ganda (`"..."`).
- **Single-Row AI Regenerator**: Cukup klik tombol refresh pada baris balasan tertentu untuk meregenerasi hanya item tersebut tanpa kehilangan balasan lainnya.
- **280-Character Barometer**: Indikator visual real-time per baris untuk memastikan balasan tidak memotong batas limit karakter X.
- **Safe Server File Vault**: Simpan hasil generasi balasan ke file server (`data/comments/*.json`) secara terisolasi dengan proteksi anti path-traversal (`..`, `/`, `\`).
- **Inspector & Bulk Import/Export**: Preview isi file payload server, hapus file payload lama, atau import/export format JSON array & Spintax sintaks pipe.

### 3. 🛡️ Multi-Node Fleet, Proxy & Warmup Protocol

- **Zero-Password Authentication**: Cukup masukkan cookie `auth_token` & `ct0`.
- **🩺 Fleet Health Mass-Checker**: Diagnostic 1-klik untuk memeriksa keaktifan sesi cookie dan proxy seluruh akun secara paralel.
- **🐣 7-Day Warmup Protocol**: Pemanasan bertahap (organic likes & timeline scrolling) untuk mengamankan akun baru dari shadowban.
- **Proxy Masking & Auto-Pause**: Melindungi kredensial proxy di UI (`••••@host:port`) dan otomatis menonaktifkan akun jika proxy mati.

### 4. 🛰️ Live Telemetry HUD & 6-Pillar System Diagnostics

- **Realtime Telemetry Stream**: Polling metrik server setiap 5 detik: Heap Memory, RSS, Uptime sistem, jumlah Node aktif, dan total ukuran penyimpanan disk.
- **6-Pillar Diagnostic Audit 1-Klik**: Audit menyeluruh mencakup:
  1. `storage_io`: Verifikasi integritas atomic write/read zero-database.
  2. `browser_engine`: Verifikasi status browser Camoufox / Playwright & driver URL resilience.
  3. `ai_gateway`: Pengecekan koneksi & latensi gateway provider AI aktif.
  4. `fleet_readiness`: Evaluasi kesiapan autentikasi sesi armada akun.
  5. `stealth_cadence`: Verifikasi human typing jitter & kurva mouse Bezier biologis.
  6. `scheduler_engine`: Verifikasi loop daemon cron scheduler background.

### 5. 📜 Forensic Audit Ledger, Filter & Maintenance

- **GraphQL Tweet URL Interceptor**: Menangkap URL postingan baru secara presisi dari respon jaringan X (`https://x.com/[user]/status/[id]`).
- **RFC-4180 Escaped CSV Export**: Ekspor riwayat audit ke format CSV yang sepenuhnya aman dari error pemisah koma atau baris baru.
- **Detail Event Inspector Modal**: Periksa payload teks lengkap, respons error, target URL, dan timestamp presisi dari setiap interaksi.
- **📅 Filter Tanggal Numerik & Preset Cepat**: Cari riwayat berdasarkan rentang tanggal (`DD/MM/YYYY`) atau preset _Hari Ini, 7 Hari, 30 Hari_.
- **🧹 Ledger Maintenance**: Pangkas log riwayat lama (>30 hari, >7 hari, status GAGAL, atau Reset total).

---

## 📁 Struktur Arsitektur Modular

```
x-sentinel/
├── client/src/                     # Frontend Cockpit (React 19, TypeScript, Tailwind CSS, shadcn/ui)
│   ├── components/cockpit/         # Modular Cockpit Surfaces
│   │   ├── about/                  # LiveTelemetryHUD, SystemDiagnosticsCard, Capabilities, DocsCatalog
│   │   ├── ai/                     # AiModelConfigCard, AiPersonaPresets, AiGuardrails, AiSandbox
│   │   ├── analytics/              # Recharts Velocity & Leaderboard
│   │   ├── audit/                  # AuditMetricsBar, AuditFiltersBar, AuditTable, AuditDetailModal
│   │   ├── payloadBank/            # PayloadBankHeader, PayloadMetrics, PayloadTable, BulkImportModal
│   │   ├── postStudio/             # PostComposerForm, TweetMockupPreview, DraftsStashDrawer, FleetDispatch
│   │   ├── NodesGrid.tsx           # Multi-Node Fleet Management
│   │   ├── TargetWorkbench.tsx     # Batch Target Engagement
│   │   ├── FeedHunter.tsx          # Feed Hunter Radar
│   │   ├── AISettingsDeck.tsx      # Modular AI & Webhook Container
│   │   ├── PayloadBank.tsx         # Modular Payload Bank Container
│   │   ├── PostStudio.tsx          # Modular Post Studio Container
│   │   ├── AuditLedger.tsx         # Modular Forensic Audit Container
│   │   ├── AboutDeck.tsx           # Modular About & Diagnostics Container
│   │   ├── DefenseProtocol.tsx     # Dual Engine Selector & Defense Protocol
│   │   └── TerminalConsole.tsx     # Live Realtime SSE Stream
│   └── services/apiClient.ts       # Type-safe REST & SSE Client
├── server/                         # Backend Automation Engine (Express 5, Playwright, Camoufox)
│   ├── automation/
│   │   ├── bot/                    # Modularized Automation Logic
│   │   │   ├── browserFactory.js   # Dual Engine Contexts (Chromium + Camoufox) & Mouse Humanization
│   │   │   ├── healthRunner.js     # Diagnostic & 7-Day Warmup Sequence
│   │   │   ├── humanCadence.js     # Human Jitter, Typing & Scrolling
│   │   │   ├── interactionEngine.js# Resilient Like, Repost, Comment Processors
│   │   │   ├── patchPlaywright.js  # Driver URL & PageError Location Resilience Patch
│   │   │   └── tweetComposer.js    # Post Composer & Media Uploader
│   │   ├── aiService.js            # Multi-Provider AI Inference
│   │   ├── scheduler.js            # Background Cron & Post Queue
│   │   ├── notifier.js             # Telegram & Discord Webhooks
│   │   └── twitterBot.js           # Bot Orchestrator Facade
│   ├── routes/                     # Express Sub-Routers
│   │   ├── systemRouter.js         # Realtime Telemetry & 6-Pillar Diagnostics Audit
│   │   ├── accountsRouter.js       # Fleet CRUD, Proxy Testing & Bulk Import
│   │   ├── tasksRouter.js          # Automation Task Runners
│   │   ├── aiRouter.js             # AI Post/Payload Generator & Safe Comments Vault
│   │   ├── schedulesRouter.js      # Cron Queue Routes
│   │   ├── historyRouter.js        # Audit History & Pruning
│   │   └── api.js                  # Master Router Mount
│   ├── db.js                       # Atomic JSON Storage Engine
│   └── index.js                    # Server Entry & SSE Hub
├── data/                           # Local JSON Storage (Git-Ignored)
│   ├── comments/                   # Isolated Per-Node & Payload JSON Storage
│   └── media/                      # Uploaded Images Cache
└── docs/                           # Official Engineering Documentation
```

---

## 📚 Dokumentasi Lengkap (Engineering Docs)

| Dokumen | Deskripsi |
| :--- | :--- |
| [📘 Architecture Topology](docs/ARCHITECTURE.md) | Diagram topologi Mermaid, arsitektur 4-layer, dan pemisahan modul cockpit. |
| [⚡ API Reference](docs/API_REFERENCE.md) | Spesifikasi lengkap endpoint REST API, system diagnostics, dan SSE stream. |
| [🛡️ Automation Protocols](docs/AUTOMATION_PROTOCOLS.md) | Mekanisme Camoufox stealth, driver URL resilience patch, dan GraphQL interceptor. |
| [🛠️ Development Guide](docs/DEVELOPMENT_GUIDE.md) | Panduan setup lokal, pengujian modul, verifikasi driver, dan standar kode. |
| [🤖 AI Agent Guide](docs/AI_AGENT_PROMPT_GUIDE.md) | Aturan panduan khusus AI coding agents (_atomic writes, path traversal shield_). |
| [📜 Changelog](docs/CHANGELOG.md) | Catatan rilis SemVer v1.0.0 s/d v1.3.5. |
| [🤝 Contributing](docs/CONTRIBUTING.md) | Panduan kontribusi dan etika otomatisasi media sosial. |

---

## 🔒 Keamanan & Lisensi

- **100% On-Premise Data Sovereignty**: Seluruh data akun, token sesi, dan riwayat interaksi disimpan secara lokal di folder `data/` pada komputer Anda tanpa pernah dikirim ke server pihak ketiga.
- **Local-Only Cockpit (v1.3.1+)**: Server bind ke `127.0.0.1`, menolak request lintas-origin (anti drive-by exfiltration & DNS rebinding), dan menyamarkan seluruh secret (`auth_token`, `ct0`, kredensial proxy, API key, webhook token) di setiap response GET — lihat [API Reference](docs/API_REFERENCE.md#-security-model-v131).
- **Safe File Storage**: Path traversal shield memblokir akses file di luar direktori aman `data/comments/`.
- **Lisensi**: Didistribusikan di bawah **[MIT License](LICENSE)**.

