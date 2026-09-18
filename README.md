# 🛡️ X-SENTINEL

> **Autonomous Multi-Node Fleet Cockpit & AI Growth Studio for X (Twitter)**
> Unified automation control platform powered by **Playwright Stealth**, **Camoufox C++ Anti-Detect**, **Multi-Node Cluster**, **AI Post & Payload Studio**, and **React 19 Cockpit**.

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.3.5-emerald.svg)](docs/CHANGELOG.md)
[![Runtime](https://img.shields.io/badge/runtime-Bun%20%7C%20Node.js%2018%2B-blue.svg)](https://bun.sh)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-purple.svg)](https://react.dev)

---

## ⚡ Core Feature Matrix

| Module                         | Key Capabilities                                                                                                                                                                                                                    |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **✨ AI Post Studio**          | Anti-AI-slop viral post generator, media uploader (PNG/JPG/GIF/WebP), persistent **Drafts Stash Drawer**, 4 Quick Polishers, single-row AI regenerate, and **Staggered Fleet Delay** broadcasting.                                  |
| **💬 Payload Bank Studio**     | Modular tweet replies & comments vault, anti-slop quote-free reply generator, 280-character barometer, single-row regeneration, and safe server file inspector/deleter with path-traversal shield.                                  |
| **🤖 Contextual AI Studio**    | Universal model registry (_Groq, OpenRouter, OpenAI, Gemini, Ollama, 9router_), 7 calibrated persona presets, anti-slop system prompt guardrails, and interactive live sandbox tester.                                              |
| **⏰ Cron Scheduler**          | Scheduled posting and radar search with automated background execution (15s polling loop), pause/resume, and queue status monitoring.                                                                                               |
| **🛡️ Multi-Node Cluster**      | Passwordless multi-account management (via `auth_token` & `ct0`), dedicated proxy isolation per node, 1-click bulk health checks, 7-day staged warmup routine, and isolated persistent Camoufox profiles with session reset dialog. |
| **🦊 Dual-Engine Stealth**     | Switchable architecture (Playwright Chromium & Camoufox Anti-Detect Firefox) with biological Bezier curve mouse movements (`humanize: 0.5`), WebRTC IP leak shield, and driver URL resilience patch.                                |
| **🎯 Target Workbench**        | High-resilience batch engagement (**Like**, **Repost**, **Comment**) with SVG signature selectors, author restriction checks, unique 1-to-1 reply distribution, Lexical single-focus keyboard typing, and modal-scoped submission.  |
| **📡 Feed Hunter Radar**       | Automated periodic search for trending tweets based on keywords or hashtags with Top / Latest filters.                                                                                                                              |
| **📊 Forensic Audit Ledger**   | Telemetry HUD, RFC-4180 CSV export with secure character escaping, payload/error detail inspector modal, numerical date filter (`DD/MM/YYYY`), browser engine tracking (`browser_engine`), and log pruning.                         |
| **🛰️ Live System Telemetry**   | Realtime server HUD (Heap/RSS RAM, Uptime, Active Nodes, Disk Storage), global task progress bar across all tabs, and 1-click **6-Pillar System Diagnostic Self-Audit** (`/api/system/diagnostics`).                                |
| **🔒 Anti-Automation Defense** | Automatic interception of X daily limits (error 344/185), phone challenge modal detection, typing jitter cadence, local loopback 127.0.0.1 binding, secret masking, and daily rotating logs with 30-day auto-retention.             |

---

## 🚀 Quick Start Guide

### 1. Prerequisites

- **[Bun](https://bun.sh)** v1.0+ _(Recommended)_ or **Node.js** v18+
- Chromium & Firefox browser binaries (installed automatically via Playwright & Camoufox)

### 2. Installation & Running

```bash
# 1. Clone repository
git clone https://github.com/MHendriF/x-sentinel.git
cd x-sentinel

# 2. Install dependencies (automatically runs patchPlaywright postinstall)
bun install

# 3. Build frontend client
bun run build

# 4. Start application
bun start
```

Access Web Cockpit at: **`http://localhost:3000`**

### 3. Developer & Verification Scripts

```bash
# Live Development Mode (Backend + Vite HMR)
bun run dev

# Core Verification Test Suite (DB, Spintax, Cookie, Masking)
node test/verify.js

# Driver URL Resilience & Location Patch Verification
node test/verify_url_resilience.js

# GraphQL API Interceptor & Anti-Automation Defense Verification (344/185/226)
node test/verify_api_interceptor.js

# Reply Interaction Engine & Lexical Keyboard Verification
node test/verify_reply_interaction.js

# API Smoke Test (boots server + asserts origin guard, schema & secret masking)
bun run smoke

# Lint Server Code (ESLint)
bun run lint

# Code Formatting Check (Prettier)
bun run format:check
```

---

## 💡 Feature Highlights

### 1. ✨ AI Post Studio, Drafts Stash & Fleet Dispatcher

- **5 Ready-to-Use Post Personas**: _🔥 Viral Hook_, _💡 Alpha Insight_, _📊 Mini Value-Drop_, _🛠️ Founder Story_, and _🌐 Global Tech Community_.
- **Persistent Drafts Stash Drawer**: Store unlimited post drafts in `localStorage` with topic tags and instant search filtering.
- **⚡ 4 Quick Polishers**: Polish drafts with 1 click: _Hook Booster_, _Punchline Polish_, _Formalize_, or _Slop Purge_.
- **Strict Single-Line Output**: Clean up generated copy into a single, cohesive reading flow without jarring artificial line breaks (`\n`).
- **Live WYSIWYG Tweet Mockup**: Real-time preview of avatar, handle, media thumbnails, and dynamic 280-character headroom barometer.
- **Fleet Dispatcher & Staggered Broadcast**: Send to a single chosen node or broadcast distinct draft variations across the entire fleet with safety rotation delays (5s – 60s).

### 2. 💬 Payload Bank Studio & Anti-Slop AI Replier

- **Anti-AI-Slop Reply Generator**: Generates high-signal, contextual tweet replies based on the target post text without artificial quotes (`"..."`).
- **Single-Row AI Regenerator**: Click refresh on any individual reply row to regenerate that specific item without discarding the rest of the batch.
- **280-Character Barometer**: Per-row visual limit indicator ensuring replies never truncate or exceed X platform bounds.
- **Safe Server File Vault**: Persist generated replies to server storage (`data/comments/*.json`) with strict path-traversal protection (`..`, `/`, `\`).
- **Inspector & Bulk Import/Export**: Inspect payload file contents, delete stale files, or import/export in JSON array and pipe Spintax formats.

### 3. 🛡️ Multi-Node Fleet, Persistent Profiles & Session Reset

- **Zero-Password Authentication**: Seamless login via session cookies (`auth_token` & `ct0`).
- **Camoufox Persistent Profiles**: Node-isolated browser profile directories preserving session storage, IndexedDB, and security tokens to prevent repetitive login verification challenges.
- **1-Click Camoufox Session Reset**: Interactive reset dialog (`ResetCamoufoxDialog.tsx`) and API endpoint (`POST /api/accounts/:id/reset-camoufox`) to purge corrupted local profile caches without deleting node records.
- **🩺 Fleet Health Mass-Checker**: Diagnostic 1-click check verifying session validity and proxy reachability across all accounts in parallel, auto-routing persistent nodes to Camoufox.
- **🐣 7-Day Warmup Protocol**: Staged organic activity (likes and timeline scrolling) protecting fresh accounts from sudden rate-limits or shadowbans.
- **Proxy Masking & Auto-Pause**: Mask proxy credentials in the UI (`••••@host:port`) and automatically pause account actions if the proxy tunnel fails.

### 4. 🦊 Resilient Interaction Engine & Anti-Automation Guard

- **Lexical Single-Focus Keyboard Typing**: Uses `page.keyboard` paired with element focus in `humanType` to eliminate cursor desynchronization and typing loss within X's Lexical rich text editor.
- **Context-Scoped Reply Submission**: Reply submission buttons are strictly scoped to active modal dialogs or thread inline containers, preventing misfired clicks against background feed buttons.
- **Rate Limit & Challenge Interception**: Automatically intercepts GraphQL error codes `344` and `185` (daily tweet limits) and detects "Add a phone / Daily limit" modal dialogs to safely abort tasks before triggering account flags.
- **Browser Engine Tracking**: Persists the active engine type (`chromium` or `camoufox`) directly into history records for forensic clarity.

### 5. 🛰️ Live Telemetry HUD & 6-Pillar System Diagnostics

- **Realtime Telemetry Stream**: Server health metrics polled every 5 seconds: Heap Memory, RSS, system uptime, active node fleet count, and storage usage.
- **6-Pillar Diagnostic Audit**: 1-click comprehensive self-test covering:
  1. `storage_io`: Atomic read/write operations and zero-database integrity.
  2. `browser_engine`: Status of Playwright/Camoufox binaries and driver URL resilience patch.
  3. `ai_gateway`: Connectivity and response latency of active AI provider gateway.
  4. `fleet_readiness`: Session authentication readiness evaluation across accounts.
  5. `stealth_cadence`: Human typing jitter and biological Bezier mouse trajectory calibration.
  6. `scheduler_engine`: Background cron scheduler loop health.

### 6. 📜 Forensic Audit Ledger, Daily Rotating Logs & Maintenance

- **GraphQL Tweet URL Interceptor**: Captures newly published tweet URLs accurately from network response payloads (`https://x.com/[user]/status/[id]`).
- **RFC-4180 Escaped CSV Export**: Cleanly exports audit history to CSV format with full quotation escaping for multiline comments.
- **Daily Rotating Logs**: Production-grade daily rotating log files (`data/logs/x-sentinel-YYYY-MM-DD.log`) with automated 30-day retention and log file browser endpoints (`GET /api/logs/files`, `GET /api/logs/file?date=YYYY-MM-DD`).
- **Detail Event Inspector Modal**: Inspect prompt payloads, error traces, target URLs, and exact event timestamps.
- **📅 Numeric Date Filtering**: Filter logs by exact date range (`DD/MM/YYYY`) or quick presets (_Today, 7 Days, 30 Days_).
- **🧹 Ledger Maintenance**: Prune historical entries (>30 days, >7 days, failed only, or full reset).

---

## 📁 Modular Architecture Structure

```
x-sentinel/
├── client/src/                     # Frontend Cockpit (React 19, TypeScript, Tailwind CSS, shadcn/ui)
│   ├── components/cockpit/         # Modular Cockpit Surfaces
│   │   ├── about/                  # LiveTelemetryHUD, SystemDiagnosticsCard, Capabilities, DocsCatalog
│   │   ├── ai/                     # AiModelConfigCard, AiPersonaPresets, AiGuardrails, AiSandbox
│   │   ├── analytics/              # Recharts Velocity & Fleet Leaderboard
│   │   ├── audit/                  # AuditMetricsBar, AuditFiltersBar, AuditTable, AuditDetailModal
│   │   ├── payloadBank/            # PayloadBankHeader, PayloadMetrics, PayloadTable, BulkImportModal
│   │   ├── postStudio/             # PostComposerForm, TweetMockupPreview, DraftsStashDrawer, FleetDispatch
│   │   ├── ResetCamoufoxDialog.tsx # Camoufox Persistent Session Reset Modal
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
│   │   │   ├── healthRunner.js     # Diagnostics & 7-Day Warmup Sequence
│   │   │   ├── humanCadence.js     # Human Jitter, Lexical Keyboard Typing & Scrolling
│   │   │   ├── interactionEngine.js# Resilient Like, Repost, Comment Processors & Limit Interceptors
│   │   │   ├── patchPlaywright.js  # Driver URL & PageError Location Resilience Patch
│   │   │   └── tweetComposer.js    # Post Composer & Media Uploader
│   │   ├── aiService.js            # Multi-Provider AI Inference Gateway
│   │   ├── scheduler.js            # Background Cron & Post Queue Loop
│   │   ├── notifier.js             # Telegram & Discord Webhook Dispatcher
│   │   └── twitterBot.js           # Bot Orchestrator Facade
│   ├── routes/                     # Express Sub-Routers
│   │   ├── systemRouter.js         # Realtime Telemetry & 6-Pillar Diagnostics Audit
│   │   ├── accountsRouter.js       # Fleet CRUD, Proxy Testing, Camoufox Reset & Bulk Import
│   │   ├── tasksRouter.js          # Automation Task Runners
│   │   ├── aiRouter.js             # AI Post/Payload Generator & Safe Comments Vault
│   │   ├── schedulesRouter.js      # Cron Queue Routes
│   │   ├── historyRouter.js        # Audit History & Pruning
│   │   └── api.js                  # Master Router Mount
│   ├── db.js                       # Atomic JSON Storage Engine
│   ├── logger.js                   # Daily Rotating Logger & Retention Engine
│   └── index.js                    # Server Entry, Security Guard & SSE Hub
├── data/                           # Local JSON & Profile Storage (Git-Ignored)
│   ├── comments/                   # Isolated Per-Node & Payload JSON Storage
│   ├── media/                      # Uploaded Images Cache
│   └── logs/                       # Daily Rotating Log Files (30-Day Auto Retention)
└── docs/                           # Official Engineering Documentation
```

---

## 📚 Complete Documentation Catalog

| Document                                                | Description                                                                                 |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------ |
| [📘 Architecture Topology](docs/ARCHITECTURE.md)        | Mermaid topology diagrams, 4-layer system architecture, and cockpit surface separation.     |
| [⚡ API Reference](docs/API_REFERENCE.md)               | Complete REST API endpoint specification, diagnostics, and SSE streaming channels.          |
| [🛡️ Automation Protocols](docs/AUTOMATION_PROTOCOLS.md) | Camoufox stealth mechanics, driver URL resilience patch, and GraphQL response interception. |
| [🛠️ Development Guide](docs/DEVELOPMENT_GUIDE.md)       | Local environment setup, test execution, driver verification, and code standards.           |
| [🤖 AI Agent Guide](docs/AI_AGENT_PROMPT_GUIDE.md)      | Operational guidelines for AI coding agents (_atomic writes, path traversal shields_).      |
| [📜 Changelog](docs/CHANGELOG.md)                       | Semantic version release history from v1.0.0 through v1.3.5.                                |
| [🤝 Contributing](docs/CONTRIBUTING.md)                 | Contribution guidelines and ethical social media automation principles.                     |

---

## 🔒 Security & Licensing

- **100% On-Premise Data Sovereignty**: All account credentials, session cookies, and activity logs remain stored locally in the `data/` directory on your machine, never transmitted to external third-party servers.
- **Local-Only Cockpit (v1.3.1+)**: Server binds strictly to `127.0.0.1`, rejecting cross-origin requests (guarding against drive-by exfiltration & DNS rebinding), and redacts all secrets (`auth_token`, `ct0`, proxy credentials, AI API keys, webhook tokens) in every `GET` response — see [API Reference](docs/API_REFERENCE.md#-security-model-v131).
- **Safe File Storage**: Path traversal protection enforces that file access remains strictly quarantined inside `data/comments/`.
- **License**: Distributed under the **[MIT License](LICENSE)**.
