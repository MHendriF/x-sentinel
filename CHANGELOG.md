# 📜 Changelog

All notable changes to the **X-SENTINEL** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - 2026-08-27

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
  - Date range filtering with quick presets (*Hari Ini*, *7 Hari*, *30 Hari*) and filtered CSV export.
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

## [2.0.0] - 2026-08-27

### 🌟 Added
- **✨ AI Post Studio (Ghostwriter Engine)**:
  - Automated viral tweet generator with 5 persona presets (*Viral Hook*, *Alpha Insight*, *Mini Value-Drop*, *Founder Story*, *Indo Tech*).
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

## [1.2.0] - 2026-08-26

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
