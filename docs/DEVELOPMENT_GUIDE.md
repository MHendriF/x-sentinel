# 🛠️ X-SENTINEL Developer & Contributor Guide

A complete guide for software engineers and maintainers working on the **X-SENTINEL** codebase.

---

## 💻 1. Development Environment Prerequisites

- **Runtime**: [Bun](https://bun.sh/) (version 1.0 or newer) recommended, or Node.js 18+.
- **Browser Automation Engine**: Playwright Chromium.
- **Operating System**: Windows, macOS, or Linux.
- **Shell**: PowerShell (Windows) or Bash / Zsh (Unix).

---

## ⚡ 2. Setup & Installation

```bash
# 1. Clone the repository
git clone https://github.com/MHendriF/x-sentinel.git
cd x-sentinel

# 2. Install backend and root dependencies
bun install

# 3. Install frontend client dependencies
cd client
bun install
cd ..

# 4. Install Playwright browser binaries (if not already installed)
bunx playwright install chromium
```

---

## 🚀 3. Running Locally

### Development Mode (with Live Reload & Hot Reloading)

```bash
# Start backend server + Vite dev server concurrently
bun run dev
```

- Dashboard runs at `http://localhost:5173` (proxied to API on port 3000).
- Express backend runs at `http://localhost:3000`.

### Production Build Mode

```bash
# 1. Compile React 19 frontend
bun run build

# 2. Start Express Production Server
bun start
```

- Dashboard runs at `http://localhost:3000`.

---

## 📂 4. Project Structure Overview

```
x-sentinel/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── src/
│   │   ├── components/cockpit/ # Modular Cockpit Decks & Domain Subdirectories
│   │   │   ├── about/          # LiveTelemetryHUD, SystemDiagnosticsCard, Specs, DocsCatalog
│   │   │   ├── ai/             # AiModelConfigCard, AiPersonaPresets, AiGuardrails, AiSandbox
│   │   │   ├── audit/          # AuditMetricsBar, AuditFiltersBar, AuditTable, AuditDetailModal
│   │   │   ├── payloadBank/    # PayloadBankHeader, PayloadMetrics, PayloadTable, BulkImportModal
│   │   │   ├── postStudio/     # PostComposerForm, TweetMockupPreview, DraftsStashDrawer, FleetDispatch
│   │   │   ├── NodesGrid.tsx   # Fleet Cluster Management
│   │   │   ├── TargetWorkbench.tsx # Batch Engagement Workbench
│   │   │   ├── FeedHunter.tsx  # Feed Hunter Radar
│   │   │   ├── AISettingsDeck.tsx # AI Settings Container Deck
│   │   │   ├── PayloadBank.tsx # Modular Payload Bank Deck
│   │   │   ├── PostStudio.tsx  # Modular AI Post Studio Deck
│   │   │   ├── AuditLedger.tsx # Modular Forensic Audit Deck
│   │   │   ├── AboutDeck.tsx   # Modular About & Diagnostics Deck
│   │   │   └── DefenseProtocol.tsx # Dual Engine & Defense Protocol
│   │   ├── components/ui/      # shadcn/ui Base Component Library
│   │   ├── services/           # apiClient.ts (Type-safe REST & SSE Stream Client)
│   │   ├── store/              # useStore.ts (Zustand Central State Store)
│   │   ├── lib/                # Preset libraries, proxy validation & utility helpers
│   │   ├── App.tsx             # Root App Shell & Layout
│   │   └── main.tsx            # React 19 Entry Point
│   ├── vite.config.ts          # Vite Configuration & API Proxy
│   └── package.json
├── data/                       # Local JSON Persistence (Git Ignored)
│   ├── accounts.json           # Account Nodes & Health Status
│   ├── settings.json           # Security, Webhook & AI Settings
│   ├── schedules.json          # Scheduled Post & Hunter Queue
│   ├── history.json            # Immutable Interaction Audit Records
│   ├── stats.json              # Cumulative System Metrics
│   ├── comments/               # Isolated Per-Node & Payload JSON Storage
│   └── media/                  # Uploaded Image Storage
├── docs/                       # Engineering & AI Agent Documentation
├── server/                     # Backend Application (Express 5 on Bun/Node)
│   ├── automation/             # Playwright Bot, Camoufox, Scheduler, Notifier, AIService
│   │   ├── bot/                # Modularized Bot Logic
│   │   │   ├── browserFactory.js   # Dual Engine Contexts & Bezier Mouse Curves
│   │   │   ├── healthRunner.js     # Diagnostic & 7-Day Warmup Sequence
│   │   │   ├── humanCadence.js     # Human Jitter, Typing & Scrolling
│   │   │   ├── interactionEngine.js# Resilient Like, Repost, Comment Vectors
│   │   │   ├── patchPlaywright.js  # Automated Playwright Location Driver Patch
│   │   │   └── tweetComposer.js    # Post Composer & Media Uploader
│   │   ├── aiService.js        # Multi-Provider AI Inference Engine
│   │   ├── scheduler.js        # Background Cron Loop (15s evaluation)
│   │   ├── notifier.js         # Telegram & Discord Webhook Engine
│   │   ├── proxyHelper.js      # Proxy Ping & GeoIP Resolver
│   │   └── cookieManager.js    # Cookie Injector & Formatter
│   ├── routes/                 # Express Sub-Routers
│   │   ├── systemRouter.js     # Realtime Telemetry HUD & 6-Pillar Diagnostics
│   │   ├── accountsRouter.js   # Fleet CRUD, Proxy Testing & Bulk Import
│   │   ├── tasksRouter.js      # Automation Task Runners
│   │   ├── aiRouter.js         # AI Generator & Safe Comments Vault
│   │   ├── schedulesRouter.js  # Cron Queue Routes
│   │   ├── historyRouter.js    # Audit History & RFC-4180 Pruning
│   │   └── api.js              # Master Router Mount
│   ├── db.js                   # Atomic JSON Storage Engine & Safe Path Resolver
│   ├── security.js             # Local Origin Guard & Secret Masking
│   ├── logger.js               # Structured Logger with SSE Broadcaster
│   ├── config.js               # Configuration Constants & Defaults
│   └── index.js                # Server Entry Point & Lifecycle Teardown
├── package.json
└── README.md
```

---

## 🧪 5. Testing & Verification

### Build & Typecheck Verification

Always verify TypeScript compilation and bundle packaging before committing:

```bash
bun run --cwd client build
```

### Verification & Smoke Tests

Run the automated verification scripts located in the `test/` folder:

```bash
# Module verification suite (spintax, cookie manager, db, hardening, import, etc.)
node test/verify.js

# Driver & URL resilience suite (location patch check, null/photo URL edge cases)
node test/verify_url_resilience.js

# Bulk fleet import & export verification (uses an isolated temp data dir)
node test/verify_bulk_import.js

# Boots the real API server against a throwaway data dir and asserts the
# local origin/host guard, secret masking, and every previously-broken endpoint
node test/smoke_api.js
```

> Note: the package.json `test` script runs `node test/verify.js`. You can also execute `node test/verify_url_resilience.js` to assert browser engine driver integrity.

---

## 🛡️ 6. Code Guidelines & Standards

1. **State Management**:
   - Do not create fragmented local stores. Use `client/src/store/useStore.ts` for all shared application states.
2. **Atomic Storage**:
   - Never write directly to JSON files using raw `fs.writeFileSync(path, data)`. Always use `db.save(type)` or `db.writeFileAtomic(...)` to prevent file corruption.
3. **Date Formatting**:
   - In UI tables, display numeric date format (`DD/MM/YYYY`) on the primary line and time (`HH:mm:ss`) on the secondary line.
4. **Error Handling**:
   - Never crash the background scheduler or browser loop. Wrap automation actions in try/catch blocks, record `FAILED` status to `history.json`, and dispatch webhook alerts via `notifier.notify(...)`.
5. **Secret Masking**:
   - GET responses must never contain raw `auth_token`, `ct0`, proxy credentials, AI API keys, or webhook tokens. Mask secrets in read endpoints and restore masked values from storage on write endpoints (see `server/security.js`).
6. **Local API Security**:
   - The server binds to `127.0.0.1` and rejects requests with foreign `Origin`/`Host` headers (`server/security.js`). Do not reintroduce permissive CORS or `0.0.0.0` binding — the API has no authentication.
7. **Atomic Storage**:
   - Corrupt JSON files are quarantined (`.corrupt.<timestamp>`), never silently overwritten. Atomic writes (`.tmp` + `fsync` + rename) must never fall back to direct writes.
8. **New Cockpit Tabs**:
   - Register the tab in `App.tsx` (`VALID_TABS`), `NavDeck.tsx`, and **always add a `TAB_TITLES` entry in `TelemetryRibbon.tsx`** so the page header stays in sync. Validate request bodies with zod (`server/utils/http.js`) and mask secrets in GET responses (`server/security.js`).
9. **Path Traversal Shield**:
   - Never access or write files with raw user input filenames. Always sanitize filenames using `path.basename(fileName)` and verify with `getSafeCommentsFilePath(fileName)` to ensure paths never escape `data/comments/`.
10. **Anti-AI-Slop & Barometer Standards**:
    - AI-generated replies and tweets must be sanitized of enclosing double quotation marks (`"..."`), formatted for high signal density, and visually monitored with character limit barometers (280 max).

