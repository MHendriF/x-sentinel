# 🛡️ X-SENTINEL

> **Autonomous Multi-Node Fleet Cockpit & AI Growth Studio for X (Twitter)**
> Platform kendali otomatisasi terpadu berbasis **Playwright Stealth**, **Multi-Node Cluster**, **AI Ghostwriter Studio**, dan **React 19 Cockpit**.

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.3.0-emerald.svg)](CHANGELOG.md)
[![Runtime](https://img.shields.io/badge/runtime-Bun%20%7C%20Node.js%2018%2B-blue.svg)](https://bun.sh)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-purple.svg)](https://react.dev)

---

## ⚡ Ringkasan Fitur Utama

| Modul                       | Deskripsi Utama                                                                                                                                   |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **✨ AI Post Studio**       | Generator postingan viral anti-AI-slop, upload gambar (PNG/JPG/GIF/WebP), format 1-baris mengalir, dan live tweet mockup.                         |
| **⏰ Cron Scheduler**       | Penjadwalan postingan dan radar pencarian dengan eksekusi background otomatis (loop 15 detik).                                                    |
| **🛡️ Multi-Node Cluster**   | Manajemen banyak akun tanpa password (via `auth_token`), isolasi proxy per node, health diagnostic, dan rutinitas warmup 7 hari.                  |
| **🤖 Contextual AI Engine** | Balasan tweet cerdas multi-provider (_OpenRouter, Groq, OpenAI, Gemini, Ollama_) + Webhook alerts ke Telegram & Discord.                          |
| **🎯 Target Workbench**     | Batch engagement (**Like**, **Repost**, **Comment**) dengan distribusi 1-to-1 balasan unik per akun.                                              |
| **📡 Feed Hunter Radar**    | Pencarian otomatis tweet trending berdasarkan kata kunci atau hashtag secara berkala.                                                             |
| **📊 Analytics & Audit**    | Grafik Recharts 4-vektor, ringkasan leaderboard armada, filter tanggal angka (`DD/MM/YYYY`), dan ekspor CSV.                                      |
| **🛰️ Live Fleet Telemetry** | Progress bar task global di semua tab, status engine nyata (`OFFLINE` / `BUSY` / `ONLINE`), skeleton loading, dan shortcut keyboard (`1-9`, `/`). |
| **🔒 Stealth Defense**      | Masking Playwright browser, WebRTC leak shield, penundaan human cadence (_jitter typing/scroll_), dan atomic database writes.                     |

---

## 🚀 Panduan Cepat (Quick Start)

### 1. Prasyarat

- **[Bun](https://bun.sh)** v1.0+ _(Direkomendasikan)_ atau **Node.js** v18+
- Browser Chromium (diunduh otomatis oleh Playwright)

### 2. Instalasi & Menjalankan

```bash
# 1. Clone repository
git clone https://github.com/MHendriF/x-sentinel.git
cd x-sentinel

# 2. Pasang dependensi
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

# Jalankan Test Suite Verifikasi
node test/verify.js

# Jalankan API Smoke Test (boot server + assert security guard & masking)
bun run smoke

# Lint Server Code (ESLint)
bun run lint

# Format & Lint Seluruh Kode (Prettier)
bun run format
```

---

## 💡 Fitur Unggulan

### 1. ✨ AI Post Studio & Multi-Media Dispatcher

- **5 Persona Siap Pakai**: _🔥 Viral Hook_, _💡 Alpha Insight_, _📊 Mini Value-Drop_, _🛠️ Founder Story_, dan _🇮🇩 Komunitas Indo Tech_.
- **Live WYSIWYG Tweet Mockup**: Pratinjau live avatar, handle, media thumbnails, dan indikator batas 280 karakter.
- **Strict Single-Line Output**: Merapikan teks menjadi 1 alur tulisan mengalir tanpa jeda baris kaku (`\n`).
- **Fleet Dispatcher**: Kirim ke 1 akun terpilih atau siarkan variasi draf berbeda ke seluruh armada.

### 2. 🛡️ Multi-Node Fleet, Proxy & Warmup Protocol

- **Zero-Password Authentication**: Cukup masukkan cookie `auth_token` & `ct0`.
- **🩺 Fleet Health Mass-Checker**: Diagnostic 1-klik untuk memeriksa keaktifan sesi cookie dan proxy seluruh akun.
- **🐣 7-Day Warmup Protocol**: Pemanasan bertahap (organic likes & timeline scrolling) untuk mengamankan akun baru dari shadowban.
- **Proxy Masking & Auto-Pause**: Melindungi kredensial proxy di UI dan otomatis menonaktifkan akun jika proxy mati.

### 3. 🤖 AI Contextual Engine & Webhooks

- **Multi-Provider Support**: Hubungkan API key **Groq**, **OpenRouter**, **OpenAI**, **Gemini**, atau gunakan **Ollama** lokal secara gratis.
- **🔔 Telegram & Discord Alerts**: Notifikasi instan saat tweet terbit, sesi expired, atau tugas batch selesai.
- **Smart Fallback**: Otomatis beralih ke database Spintax jika kuota AI habis atau koneksi terputus.

### 4. 📜 Audit Ledger, Filter Tanggal & Maintenance

- **GraphQL Tweet URL Interceptor**: Menangkap URL postingan baru secara presisi dari respon jaringan X.
- **📅 Filter Tanggal & Preset Cepat**: Cari riwayat berdasarkan rentang tanggal (`DD/MM/YYYY`) atau preset _Hari Ini, 7 Hari, 30 Hari_.
- **🧹 Ledger Maintenance**: Pangkas log riwayat lama (>30 hari, >7 hari, status GAGAL, atau Reset total).

---

## 📁 Struktur Arsitektur Modular

```
x-sentinel/
├── client/src/                     # Frontend Cockpit (React 19, TypeScript, Tailwind CSS, shadcn/ui)
│   ├── components/cockpit/         # Modular Cockpit Surfaces
│   │   ├── about/                  # About & System Specs Cards
│   │   ├── analytics/              # Recharts Velocity & Leaderboard
│   │   ├── audit/                  # Audit Ledger, Filters & Maintenance Dialog
│   │   ├── postStudio/             # Post Generator, Tweet Mockup & Media Dropzone
│   │   ├── NodesGrid.tsx           # Multi-Node Fleet Management
│   │   ├── TargetWorkbench.tsx     # Batch Target Engagement
│   │   ├── FeedHunter.tsx          # Feed Hunter Radar
│   │   ├── AISettingsDeck.tsx      # AI Provider & Webhook Settings
│   │   ├── DefenseProtocol.tsx     # Stealth & Timing Hardening
│   │   └── TerminalConsole.tsx     # Live Realtime SSE Stream
│   └── services/apiClient.ts       # Type-safe REST & SSE Client
├── server/                         # Backend Automation Engine (Express 5, Playwright)
│   ├── automation/
│   │   ├── bot/                    # Modularized Automation Logic
│   │   │   ├── browserFactory.js   # Isolated Playwright Contexts & Stealth
│   │   │   ├── healthRunner.js     # Diagnostic & 7-Day Warmup Sequence
│   │   │   ├── humanCadence.js     # Human Jitter, Typing & Scrolling
│   │   │   ├── interactionEngine.js# Like, Repost, Comment Processors
│   │   │   └── tweetComposer.js    # Post Composer & Media Uploader
│   │   ├── aiService.js            # Multi-Provider AI Inference
│   │   ├── scheduler.js            # Background Cron & Post Queue
│   │   ├── notifier.js             # Telegram & Discord Webhooks
│   │   └── twitterBot.js           # Bot Orchestrator Facade
│   ├── routes/                     # Express Sub-Routers
│   │   ├── accountsRouter.js       # Fleet CRUD & Bulk Import
│   │   ├── tasksRouter.js          # Automation Task Runners
│   │   ├── aiRouter.js             # AI Post Generator
│   │   ├── schedulesRouter.js      # Cron Queue Routes
│   │   ├── historyRouter.js        # Audit History & Pruning
│   │   └── api.js                  # Master Router Mount
│   ├── db.js                       # Atomic JSON Storage Engine
│   └── index.js                    # Server Entry & SSE Hub
├── data/                           # Local JSON Storage (Git-Ignored)
└── docs/                           # Official Engineering Documentation
```

---

## 📚 Dokumentasi Lengkap (Engineering Docs)

| Dokumen                                                 | Deskripsi                                                                        |
| :------------------------------------------------------ | :------------------------------------------------------------------------------- |
| [📘 Architecture Topology](docs/ARCHITECTURE.md)        | Diagram topologi Mermaid, arsitektur 4-layer, dan alur automasi.                 |
| [⚡ API Reference](docs/API_REFERENCE.md)               | Spesifikasi lengkap endpoint REST API dan SSE live stream.                       |
| [🛡️ Automation Protocols](docs/AUTOMATION_PROTOCOLS.md) | Mekanisme Playwright stealth, rotasi cookie, dan GraphQL interceptor.            |
| [🛠️ Development Guide](docs/DEVELOPMENT_GUIDE.md)       | Panduan setup lokal, pengujian modul, dan standar kode.                          |
| [🤖 AI Agent Guide](docs/AI_AGENT_PROMPT_GUIDE.md)      | Aturan panduan khusus untuk AI coding agents (_atomic writes, state hydration_). |
| [📜 Changelog](docs/CHANGELOG.md)                       | Catatan rilis SemVer v1.0.0 s/d v1.3.0.                                          |
| [🤝 Contributing](docs/CONTRIBUTING.md)                 | Panduan kontribusi dan etika otomatisasi media sosial.                           |

---

## 🔒 Keamanan & Lisensi

- **100% On-Premise Data Sovereignty**: Seluruh data akun, token sesi, dan riwayat interaksi disimpan secara lokal di folder `data/` pada komputer Anda tanpa pernah dikirim ke server pihak ketiga.
- **Local-Only Cockpit (v1.3.1+)**: Server bind ke `127.0.0.1`, menolak request lintas-origin (anti drive-by exfiltration & DNS rebinding), dan menyamarkan seluruh secret (`auth_token`, `ct0`, kredensial proxy, API key, webhook token) di setiap response GET — lihat [API Reference](docs/API_REFERENCE.md#-security-model-v131).
- **Lisensi**: Didistribusikan di bawah **[MIT License](LICENSE)**.
