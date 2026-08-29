# 📜 Changelog

All notable changes to the **X-SENTINEL** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.3] - 2026-08-30

### 🌟 Added (UI/UX)

- **Global running-task progress strip**: while a task executes, a flame progress strip is visible in the Telemetry Ribbon on every tab — task label (Fleet Publisher / Batch / Hunter / Warmup), `completed/total` with failed count, an indeterminate fallback for unbounded tasks, and `role="progressbar"` semantics. Clicking it jumps straight to the Live Telemetry Stream.
- **Truthful core status**: the sidebar CORE indicator is no longer a static green pulse — it now shows red **CORE OFFLINE** when the engine is unreachable, amber **TASK BERJALAN** while a task runs, and green **CORE ONLINE** when idle (`aria-live`).
- **Engine-offline banner**: when the `/api/status` poller cannot reach the engine, a global banner warns that displayed data is the last successfully loaded snapshot instead of failing silently.
- **Skeleton loaders**: new `Skeleton` component plus `accountsHydrated` / `historyHydrated` store flags — NodesGrid and AuditLedger shimmer while data loads, eliminating the misleading fake "empty fleet" flash.
- **First-run onboarding checklist**: the empty fleet state now shows a 3-step checklist (register node → connect AI provider → publish first post) with auto-checked progress driven by real state and jump actions.
- **Audit table sorting & relative time**: Date/Account/Vector/Status columns are sortable (`aria-sort`, direction toggle), and each row shows a relative timestamp ("2 jam lalu") beside `DD/MM/YYYY HH:mm:ss`.
- **Keyboard shortcuts**: `1`–`9` switch cockpit tabs, `/` focuses the node search box (suppressed while typing or when a dialog is open).
- Node grid page size persisted to localStorage; `prefers-reduced-motion` suppresses non-essential animations; filter pills get a right-edge scroll affordance on narrow viewports.

### ⚡ Changed (UI)

- Removed the duplicated page title in the AI Settings banner (the ribbon header is the single title), aligned the remaining purple/tri-gradient save buttons to the primary flame CTA rule, and completed the Indonesian label sweep (node badges "Sehat/Kadaluarsa/Proxy Mati", "Cek Kesehatan", "Hari X/7", deck titles, dropdown options).

---

## [1.3.2] - 2026-08-30

### 🐛 Fixed (UI)

- **Page header desync**: the AI Provider Settings tab showed the Multi-Node page title because `TAB_TITLES` in `TelemetryRibbon` had no `tab-ai` entry and silently fell back to the accounts title. All tabs (including 404) now have explicit titles, and unknown tabs fall back to a neutral cockpit title.
- **Inconsistent version display**: `v1.3` badge vs `v2.4.0` footer were hardcoded in `NavDeck` and `PostStudio`. The version is now injected from `package.json` via a Vite `__APP_VERSION__` define — single source of truth.
- **Analytics velocity chart**: time now flows left→right (previously newest-on-left), activity spanning ≤2 days is bucketed per hour so single-day bursts no longer collapse into an unreadable sliver, and an honest empty state replaces the blank axes when no activity exists.

### ⚡ Changed (UI)

- **Consistent page layout**: removed duplicated deck-level page titles (`Feed Hunter`, `Audit Ledger`, `Defense Protocol`, `Post Studio` banner) that repeated the top ribbon header; wide decks no longer float in a narrow centered column (`FeedHunter`, `DefenseProtocol`, `AISettingsDeck` now use the full-width grid like the other decks).
- **Primary action color rule**: the blue `execute` button variant is now flame/amber like every other primary CTA; blue remains reserved for informational Reply-vector accents.
- **Node status filter taxonomy**: filter pills now read `Semua · Aktif · Nonaktif · Sehat · Kadaluarsa · Belum Dicek`, separating the enablement dimension (Aktif/Nonaktif) from health-check results and exposing an explicit "not checked yet" state instead of a contradictory `Online 17 / Healthy 0`.
- **Operational labels unified to Indonesian** (page titles/subtitles, filter pills, chart titles, primary CTA); English kept for technical terms.

### ♿ Accessibility

- Navigation items expose `aria-current="page"`; filter pills expose `aria-pressed`; engagement vector cards are keyboard-operable switches (`role="switch"`, `aria-checked`, Enter/Space).
- Icon-only node actions (proxy ping, edit, delete) have `aria-label`s; mobile drawer buttons labeled.
- Page heading receives keyboard focus on tab change for screen-reader/keyboard users.
- Contrast bumps for low-emphasis text (`slate-500/600` → `slate-400/500`) and a visible custom checkbox style replacing the near-invisible native dark checkbox.
- Fonts are now self-hosted via `@fontsource` (bundled by Vite) instead of Google Fonts CDN — no external requests, fully offline cockpit.

---

## [1.3.1] - 2026-08-30

### 🔒 Security

- **Local-only API surface**: server now binds to `127.0.0.1` (override via `HOST` env) instead of all interfaces.
- **Removed wildcard CORS**: replaced `cors()` with a strict Origin/Host guard (`server/security.js`) that rejects cross-origin browser requests and DNS-rebinding Host headers — previously, any website opened in a browser could silently read the entire fleet's session cookies, proxy credentials, AI API keys, and webhook tokens from `localhost:3000/api/*`.
- **Secret masking on all read endpoints**: `GET /api/accounts`, `GET /api/accounts/:id`, `GET /api/status`, and `GET /api/settings` now return `auth_token`, `ct0`, proxy credentials, `aiApiKey`, `telegramBotToken`, and `discordWebhookUrl` masked as `••••xxxx`. Masked values echoed back on POST/PUT are safely restored from storage (`server/security.js`).
- **Media upload hardening**: MIME allowlist (PNG/JPG/GIF/WebP), 8 MB per-image size cap, and a raised `express.json` body limit (`25mb`) that also fixes base64 uploads failing on images larger than ~73 KB.
- Added `data/` corruption quarantine and removed the silent non-atomic write fallback (see Fixed).

### 🌟 Fixed

- **`POST /api/accounts/bulk-import` and `GET /api/accounts/export`** returned HTTP 500 because `db.bulkImportAccounts()` / `db.exportAccounts()` did not exist. Both are now implemented (colon/pipe/JSON parsing, duplicate skipping, `addedCount` response field matching the UI).
- **`GET/POST /api/comments`** returned 500 (`db.getComments()` / `db.saveComments()` missing) — now backed by the global spintax templates.
- **`GET/POST /api/templates`** returned 404 (route missing) — added, restoring the Payload Bank deck.
- **`POST /api/settings/test-ai` and `POST /api/settings/generate-ai-test`** returned 404 (routes missing) — added; AI connection and live generation tests in AI Settings now work, with masked-key fallback to stored keys.
- **`POST /api/accounts/:id/test-proxy`** returned 404 (route missing) — added per-node proxy latency/GeoIP testing.
- **`POST /api/ai/generate-post`** returned 500 on every request: the router called a non-existent `aiService.generatePostContent()`; rewired to the actual `generatePostFromKeyword()` (with `customOverrides` passthrough and `isFallback` in the response).
- **Atomic storage engine**: corrupted JSON files are now quarantined as `.corrupt.<timestamp>` instead of being silently overwritten with defaults; atomic writes (`.tmp` + `fsync` + rename) retry transient OS locks and never fall back to direct non-atomic writes.

### ⚡ Changed

- Centralized Express error handler; all routers validate bodies with **zod** schemas (`400 VALIDATION_ERROR` with field-level messages) instead of ad-hoc checks.
- All record IDs (`acc_*`, `sch_*`, history) now use `crypto.randomUUID()`.
- ESLint (flat config) added for `server/` + `test/` (`bun run lint`).
- Added GitHub Actions CI (`.github/workflows/ci.yml`): lint, prettier check, client build, verification tests, and a new API smoke suite (`test/smoke_api.js`) that boots the real server against a throwaway data dir and asserts the origin guard, secret masking, and all previously-broken endpoints.
- Aligned `package.json` license (MIT) with the LICENSE file and README badge; version bumped to 1.3.1 across root and client.
- Docs: `DEVELOPMENT_GUIDE` test commands corrected, `API_REFERENCE` documents the security model, masking, and the previously-undocumented endpoints.

## [1.3.0] - 2026-08-27

### 🌟 Added

- **⏰ Cron Auto-Scheduler & Post Queue**:
  - Background ticker loop in `server/automation/scheduler.js` evaluating pending tasks every 15 seconds.
  - Interactive "📅 Jadwalkan Post" modal in AI Post Studio with custom execution date/time picker and rotation delay.
  - Persistent queue deck showing pending, running, completed, and failed tasks with play/pause toggle and deletion.
  - Support for `RECURRING_HUNTER` periodic automated keyword radar runs.
- **🩺 Fleet Session Health & Proxy Mass-Checker**:
  - 1-click **"🩺 Fleet Health"** toolbar button in Multi-Node cluster to probe cookie validity and proxy latency across all nodes simultaneously.
  - Auto-pause defense protocol: automatically disables any node (`enabled: false`) whose proxy is dead to prevent host IP leakage.
  - Interactive status badges: `🟢 SESSION HEALTHY`, `🟡 SESSION EXPIRED`, `🔴 PROXY DEAD`.
- **🖼️ Media & Image Attachment Support**:
  - `POST /api/media/upload` endpoint supporting PNG, JPEG, GIF, and WebP uploads up to 4 images per post.
  - Image dropzone & file picker with thumbnail previews and removal buttons in WYSIWYG Tweet Mockup.
  - Playwright automated file upload handler attaching media directly to Twitter composer before posting.
- **🔔 Telegram & Discord Webhook Alerts**:
  - `server/automation/notifier.js` integrating Telegram Bot API and Discord Webhook embeds.
  - Real-time alert dispatches for `POST_PUBLISHED`, `TASK_COMPLETED`, `TASK_FAILED`, `SESSION_EXPIRED`, `PROXY_DEAD`, and `WARMUP_DAY_COMPLETED`.
  - Configuration panel with live "⚡ Test Alert" buttons in Defense Protocol deck.
- **🐣 Account Warm-up Protocol (Anti-Shadowban)**:
  - 7-day tiered warm-up routine: organic home timeline scrolling and progressive daily likes/retweets.
  - Interactive "Warmup: Day X/7" badge and 1-click warmup launcher on each node card.
- **🧹 Audit Ledger Maintenance & Pruning Tools**:
  - `POST /api/history/prune` and `POST /api/history/clear-all` endpoints.
  - Maintenance modal in Audit Ledger: prune logs older than 30 days, 7 days, failed only, or clear all.
  - Date range filtering with quick presets (_Hari Ini_, _7 Hari_, _30 Hari_) and filtered CSV export.
  - Indonesian standard numeric date formatting (`DD/MM/YYYY`) on primary line and time (`HH:mm:ss`) on secondary line.
- **📚 Comprehensive Engineering & AI Agent Docs**:
  - Added `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`, `docs/AUTOMATION_PROTOCOLS.md`, `docs/DEVELOPMENT_GUIDE.md`, and `docs/AI_AGENT_PROMPT_GUIDE.md`.

### ⚡ Changed

- Upgraded **About Deck** and `README.md` to reflect all 8 modular cockpit decks, system specifications, and full directory tree.
- Simplified Cumulative Vector Badges in Analytics Deck into compact font-mono tags (`❤️ Likes`, `🔁 Reposts`, `💬 Replies`, `✨ Posts`, `⚡ Total`).
- Refactored `createPost` GraphQL interceptor to extract tweet status links (`https://x.com/[user]/status/[id]`) for audit history.

### 🔒 Security

- Added `data/schedules.json` and `data/media/` to `.gitignore` to prevent committing operational data.
- Enforced atomic temporary file writes (`.tmp` + `fs.renameSync`) for database operations.

---

## [1.2.0] - 2026-08-27

### 🌟 Added

- **✨ AI Post Studio (Ghostwriter Engine)**:
  - Automated viral tweet generator with 5 persona presets (_Viral Hook_, _Alpha Insight_, _Mini Value-Drop_, _Founder Story_, _Indo Tech_).
  - Strict single-line text formatting removing newlines for native Twitter pacing.
  - Interactive WYSIWYG Tweet Mockup with 280-character limit meter and avatar preview.
  - Fleet Dispatcher broadcasting unique draft variations across multiple active nodes.
- **📡 Live Telemetry Stream**:
  - Server-Sent Events (SSE) `/api/logs/stream` broadcasting real-time automation logs to `TerminalConsole.tsx`.
- **4-Vector Metric Tracking**:
  - Integrated `POST` vector alongside `LIKE`, `RETWEET`, and `COMMENT` across all analytics charts.

### ⚡ Changed

- Migrated frontend cockpit to React 19, TypeScript, Tailwind CSS, and Vite.
- Implemented Zustand state management for instant cross-tab synchronization.

---

## [1.1.0] - 2026-08-26

### 🌟 Added

- **🤖 AI Contextual Replies Engine**:
  - Integrated OpenRouter, Groq, OpenAI GPT-4o, Google Gemini, and Ollama.
  - Automatic sentiment analysis and contextual response generation from target tweet text.
  - Graceful fallback to Spintax when AI quotas expire.
- **🎯 Target Engagement Workbench**:
  - Batch target URL execution with modular vector toggles (`LIKE`, `RETWEET`, `COMMENT`).
  - 1-to-1 unique JSON reply matrix distribution.
- **📡 Feed Hunter Radar**:
  - Keyword and hashtag discovery engine with dynamic sorting (Top vs Latest).

---

## [1.0.0] - 2026-08-25

### 🌟 Initial Release

- **Core Playwright Stealth Bot**: Chromium automation with browser fingerprint spoofing and human typing simulation.
- **Zero-Password Authentication**: Session injection via `auth_token` and `ct0` cookies.
- **Multi-Node Account Cluster**: Independent account nodes with dedicated proxy routing and proxy credential masking.
- **Curated Multi-Niche Spintax Library**: 5 niche presets with nested permutation tester.
- **Atomic LocalDB Storage**: Lightweight file-based JSON storage without external database requirements.
