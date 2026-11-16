# X-SENTINEL Migration & UI/UX Redesign Plan

**Target Stack:** Rust + Axum (Backend) · Askama + HTMX + Alpine.js (Frontend) · `/design-taste-frontend` (`tasteskill 2.5.1`) Visual & Copy System  
**Status:** Draft for Review & Decision Approval (No code changes executed yet)

---

## 1. What We Understand

Based on a full audit of `d:\Work\projects\x-sentinel` (v1.3.5), the current system consists of:

1. **Backend (`server/` — 34 files, ~10,492 LOC, Node.js/Bun + Express 5)**:
   - **Core Runtime & Security (`server/index.js`, `config.js`, `auth.js`, `security.js`, `logger.js`, `db.js`, `utils/http.js`)**:
     - Loopback-only HTTP server (`127.0.0.1:3000` with automatic port fallback up to +30 retries) and CSP / security headers.
     - `originGuard` rejecting external `Origin`, `Referer`, `Host` (DNS rebinding regex), and `Sec-Fetch-Site: cross-site`.
     - Session auth (`x_sentinel_session` HMAC-SHA256 signed token with `sessionEpoch` invalidation), scrypt/SHA-256 password verification, RFC 6238 TOTP 2FA, and per-IP rate limiting (5 failures / 60s lockout).
     - Secret masking (`••••` / `••••xxxx`, proxy `••••@host:port`) on read endpoints and secret restoration on writes.
     - Atomic JSON persistence (`db.js`) in `data/` (`accounts.json`, `settings.json`, `history.json`, `templates.json`, `stats.json`, `schedules.json`, `lastMission.json`, `auth_config.json`, `comments/*.json`, `media/*`) using `.tmp` + `fsync` + `rename` with retry and `.corrupt.<ts>` quarantine.
     - Daily rotating log files (`data/logs/x-sentinel-YYYY-MM-DD.log`, 30-day retention), 300-entry in-memory ring buffer, and SSE log streaming (`/api/logs/stream`).
   - **REST API Surface (`server/routes/`, 10 router files)**:
     - `/api/auth/*` (session, login, logout, revoke-all, credentials, 2FA setup/enable/disable)
     - `/api/status`, `/api/system/health`, `/api/system/diagnostics` (6-pillar audit)
     - `/api/accounts/*` (CRUD, export JSON/CSV, bulk import, batch toggle/delete, proxy test, health check, verify, warmup, comments, Camoufox login/status/profile reset/batch delete)
     - `/api/tasks/*` (post, batch, hunter, pause, resume, stop, locks, clear-locks)
     - `/api/ai/*` (fetch-tweet, generate-post, generate-payload-replies, payload-files CRUD with path-traversal shield, test-connection)
     - `/api/schedules/*`, `/api/history/*` (with prune/clear), `/api/media/*` (base64 upload up to 25MB/8MB per image, prune), `/api/settings/*`, `/api/templates`, `/api/comments`, `/api/stats`, `/api/proxy/test`, `/api/spintax/preview`.
   - **Automation & Intelligence (`server/automation/` & `server/automation/bot/`)**:
     - Pure logic / HTTP services: `aiService.js` (1,034 LOC, 7 LLM provider presets + resilient JSON/SSE parser), `rateGovernor.js` (343 LOC, Gaussian pacing, rolling hourly/daily quotas, 7-day warmup caps, timezone quiet hours, strike escalation), `targetLock.js` (183 LOC), `spintax.js` (91 LOC), `tweetExtractor.js` (137 LOC, FxTwitter/VxTwitter fallback), `proxyHelper.js` (275 LOC), `cookieManager.js` (100 LOC), `notifier.js` (284 LOC, Telegram/Discord), `scheduler.js` (218 LOC, 15s tick loop + 24h media prune).
     - Browser Automation (`twitterBot.js` 1,128 LOC + `bot/*` 7 files ~3,939 LOC, including `interactionEngine.js` 2,317 LOC, `browserFactory.js` 534 LOC, `camoufoxLoginManager.js` 378 LOC, `healthRunner.js` 373 LOC, `tweetComposer.js` 218 LOC, `humanCadence.js` 150 LOC, `patchPlaywright.js` 72 LOC): heavily dependent on `playwright` (`^1.62.1`) and `camoufox` (`^0.1.19` C++ Firefox via Juggler protocol, native `humanize: 0.5` Bezier mouse trajectories, persistent profile directories, GraphQL `CreateTweet` response interception, Lexical single-focus typing).

2. **Frontend (`client/src/` — 90 files, ~19k+ LOC, React 19 + TypeScript + Vite + Zustand + Tailwind + shadcn/ui + Recharts + Lucide)**:
   - 10 cockpit tabs (`NodesGrid`, `PostStudio`, `TargetWorkbench`, `FeedHunter`, `AnalyticsDeck`, `AISettingsDeck`, `PayloadBank`, `DefenseProtocol`, `AuditLedger`, `AboutDeck`) + `LoginDeck` + `NotFoundDeck` + `NavDeck` + `TelemetryRibbon` + `TerminalConsole` + 14 modal dialogs.
   - All fonts self-hosted via `@fontsource` (`Space Grotesk`, `Plus Jakarta Sans`, `JetBrains Mono`).
   - Current UI issues relative to `/design-taste-frontend`:
     - Heavy use of perpetual decorative animations (`animate-ping`, `animate-pulse`, `reticle-spin`, and 9 infinite CSS icon loops in `client/src/index.css`).
     - Sub-13px micro-typography (`text-[9px]`, `text-[10px]`, `text-[11px]`), all-caps tracked badges, cyberpunk jargon (`RESTRICTED NODE`, `SENTINEL-DEFENSE`), and excessive nested card-inside-card boxes (`obsidian-950` / `900` / `850` / `800` / `750` + blur glow halos in `LoginDeck.tsx`).
     - Inconsistent visual hierarchy across the 10 tabs and heavy JS bundle footprint (React 19 + Recharts + Radix + Lucide) for what is primarily an operator control plane.

3. **Available Toolchain Verified on Host**:
   - `rustc 1.100.0` & `cargo 1.100.0`
   - `node v24.15.0`, `npm`, `bun`

---

## 2. Questions, Judgements, and Decisions Required Before Coding

Before any implementation begins, five architectural and design decisions must be confirmed:

### Decision 1 — Browser Automation Engine in Rust (`Playwright` + `Camoufox`)
- **Context:** Rust has no official Playwright SDK and **no native Camoufox crate**. Camoufox (`^0.1.19`) relies on Playwright's Firefox Juggler protocol, native `humanize: 0.5` C++ mouse curves, persistent `data_dir` contexts, and `patchPlaywright.js` fixes. Rewriting `interactionEngine.js` (2,317 LOC) + `browserFactory.js` (534 LOC) + `camoufoxLoginManager.js` (378 LOC) onto `chromiumoxide` (CDP) + `thirtyfour` (Geckodriver) breaks Camoufox stealth parity and drops GraphQL network response interception on Firefox.
- **Options:**
  - **Option 1A (Recommended): Rust Orchestrator + Local Playwright/Camoufox Sidecar Worker (`bot-worker`)** — Rust/Axum owns 100% of HTTP, Auth, DB, RateGovernor, TargetLock, Scheduler, AI Gateway, Proxy Tester, Notifier, Spintax, SSE Hub, and SSR UI, and spawns a minimal persistent/ephemeral Node.js child worker (`stdio` JSON-RPC) solely to execute `playwright` + `camoufox` browser actions.
  - **Option 1B: Pure Rust Rewrite (`chromiumoxide` + WebDriver)** — Zero Node runtime dependency, but loses Camoufox Juggler integration, C++ Bezier mouse humanization, and requires re-validating every X.com Lexical/GraphQL selector from scratch.
- **Need from you:** Confirm **Option 1A** (Sidecar Worker) vs **Option 1B** (Pure Rust CDP/WebDriver).

### Decision 2 — Scope of `/design-taste-frontend` (`tasteskill 2.5.1`) Adaptation for a Cockpit App
- **Context:** `/design-taste-frontend` (`SKILL.md`, `layout-v4.md`, `sections.md`, `cards.md`, `copy.md`, `motion.md`, `backgrounds.md`) was built primarily for **public marketing sites** (`100svh` scroll sections, `hero` fold checks, `footer.closing`, `consistency.mjs` / `gate.mjs` DOM geometry checks). X-SENTINEL is an **authenticated 10-tab operational cockpit** with data tables, forms, modals, and a live log terminal.
- **Options:**
  - **Option 2A (Recommended): Full `tasteskill 2.5.1` Compliance on Entry (`LoginDeck` / System Overview) + Strict Token/Copy/Motion/Card System Across All 10 Cockpit Views** — Apply the exact CSS design system (`system.css` tokens, neutral obsidian surface ladder `#070708` / `#0e1015` / `#151517`, single `#f59e0b` accent, zero violet, zero card-in-card-in-panel 3-level nesting, >= 13px font floor, `technical-dry` anti-slop copy, verb+object buttons, 150/120/90ms motion layer without infinite pings/spins, `44px` tap targets down to `320px`). Keep cockpit navigation as a fixed sidebar + workspace shell rather than forcing `100svh` marketing scroll bands onto operational CRUD tables. Run `copy-lint.mjs`, `perf.mjs`, and adapted Playwright viewport checks (`1440`, `1024`, `768`, `390`, `320`).
  - **Option 2B: Strict `gate.mjs` Marketing-Style Sections Inside Cockpit** — Enforce `100svh` section pacing on tabs (`Overview`, `About`), which may introduce vertical scrolling friction on dense operational workflows.
- **Need from you:** Confirm **Option 2A** vs **Option 2B**.

### Decision 3 — Analytics Charting in Askama + HTMX + Alpine.js
- **Context:** `AnalyticsDeck.tsx` currently uses Recharts (`VelocityChart` area/line trend, `HourlyActivityChart` 24-hour density bars, `NodeShareChart` donut).
- **Options:**
  - **Option 3A (Recommended): Server-Rendered Askama SVG Charts + Alpine.js Interactive Crosshair/Tooltips** — Zero third-party JS chart dependency; HTMX swaps `/partials/analytics/charts?timeframe=7d&node=all` cleanly and Rust computes exact SVG `<path>` / `<rect>` / `<circle>` geometry server-side.
  - **Option 3B: Self-Hosted `Chart.js` or `uPlot` in `static/vendor/`** — Smooth canvas animations and zoom/pan, adds ~65KB vendored JS and Alpine `x-init` hydration bridges.
- **Need from you:** Confirm **Option 3A** (Pure Askama SVG + Alpine) vs **Option 3B** (Self-hosted Chart.js).

### Decision 4 — CSS Architecture & Build Tooling
- **Options:**
  - **Option 4A (Recommended): Pure Modular CSS (`static/css/tokens.css`, `layout.css`, `components.css`, `motion.css`)** — Zero Node/npm frontend build step. `cargo build` / `cargo run` compiles and serves everything in one binary (with `rust-embed` optional). Matches `/design-taste-frontend`'s `system.css` + `motion.css` architecture directly.
  - **Option 4B: Tailwind CSS v4 Standalone CLI** — Compiles utility classes to `static/css/app.css` without Node, adds a CSS watcher during dev.
- **Need from you:** Confirm **Option 4A** vs **Option 4B**.

### Decision 5 — Migration Topology & Cutover Strategy
- **Options:**
  - **Option 5A (Recommended): Parallel Workspace (`x-sentinel-rs/` or `crates/` alongside `server/` & `client/`) with Shared `data/` Compatibility, Then Atomic Cutover** — Keep current Node app runnable while each phase of Rust+Axum+Askama reaches parity and passes `smoke_api.js` + `verify*.js` compatibility; retire `server/` and `client/` only after full verification.
  - **Option 5B: In-Place Replacement** — Replace root `server/` & `client/` immediately on a feature branch.
- **Need from you:** Confirm **Option 5A** vs **Option 5B**.

---

## 3. Order of Tasks (Phased Execution Plan)

| Phase | Scope | Key Deliverables | Exit Gate |
|---|---|---|---|
| **Phase 0** | Bootstrap, Tooling & Contracts | Cargo project scaffold (`Cargo.toml`, config, tracing), vendor HTMX + Alpine.js + local `@fontsource` fonts + SVG icons, capture baseline API/JSON fixtures from existing `data/` schemas | `cargo check` passes; baseline `npm test` & `smoke_api.js` recorded |
| **Phase 1** | Core Storage, Security & Auth in Rust | `db.rs` (atomic temp+fsync+rename JSON + `.corrupt` quarantine), `security.rs` (`originGuard`, host/fetch-site guard, secret/proxy masking & restore), `auth.rs` (scrypt/SHA-256, HMAC session cookie + epoch, RFC 6238 TOTP, rate limiter), `logger.rs` (daily log files + 30d cleanup + broadcast channel) | Unit tests for atomic DB, masking, auth/TOTP, path-traversal shield, and `originGuard` pass |
| **Phase 2** | Pure Domain Services & Schedulers | `spintax.rs`, `rate_governor.rs` (Gaussian pacing, quotas, warmup, quiet hours, strikes), `target_lock.rs`, `proxy.rs` (HTTP/SOCKS5 ping + GeoIP), `tweet_extractor.rs` (FxTwitter/VxTwitter), `ai_service.rs` (7 providers + SSE/JSON parser), `notifier.rs` (Telegram/Discord), `scheduler.rs` (15s Tokio interval + 24h media prune) | Ported unit tests match `test_rate_governor.js`, `test_phase*.js`, `verify_ai_service.js`, `verify_proxy_formats.js` |
| **Phase 3** | Axum HTTP/SSE Core & REST API Parity | Axum router (`127.0.0.1` + dynamic port retry), `/api/auth/*`, `/api/accounts/*`, `/api/ai/*`, `/api/schedules/*`, `/api/history/*`, `/api/media/*`, `/api/settings/*`, `/api/system/*`, `/api/logs/stream` (SSE), `/api/logs/files` & `/file` | Existing `test/smoke_api.js` passes 100% against Axum server on `127.0.0.1:3000` |
| **Phase 4** | Browser Automation Bridge (`bot-worker` + `tasksRouter`) | Bidirectional JSON-RPC stdio worker manager in Rust (`bot_bridge.rs`) driving `playwright` + `camoufox` (or pure Rust if Option 1B chosen), pause/resume/abort via `CancellationToken`, `POST /api/tasks/*`, `check-health`, `verify`, `warmup`, `camoufox-login`, `test-browser` | End-to-end verification of `verify_url_resilience.js`, `verify_api_interceptor.js`, `verify_camoufox_login_manager.js`, pause/resume/abort |
| **Phase 5** | `/design-taste-frontend` Design System & Shell | Author `tokens.css`, `layout.css`, `components.css`, `motion.css` (1-step obsidian surface hierarchy, single `#f59e0b` accent, zero violet, >=13px floor, 150/120/90ms hover/press, `44px` tap targets), `base.html`, `login.html`, `shell.html` (sidebar, header ribbon, SSE log bar, keyboard shortcuts `1-9`, `/`, `[`) | `copy-lint` clean; visual + responsive inspection at `1440`, `1024`, `768`, `390`, `320` with zero horizontal overflow or clipping |
| **Phase 6** | Askama + HTMX + Alpine.js Cockpit Views (10 Tabs + Modals) | Port all 10 cockpit surfaces & modals as Askama templates + HTMX partial fragments (`hx-get`, `hx-post`, `hx-swap`, `HX-Trigger` toasts, `sse-connect="/api/logs/stream"`) + Alpine.js local UI state (multi-select, filters, character counter, tweet mockup, spintax preview, drafts stash) | Full functional parity walkthrough across every tab, modal, CSV/JSON export, media upload, and live SSE task progress |
| **Phase 7** | Hardening, Perf Audit & Cutover | Run full Rust test suite (`cargo test --release`), API smoke tests, `/design-taste-frontend` checks (`copy-lint`, `perf`, headless viewport screenshots at 1440/1024/820/768/390/320), documentation update, and cutover script | All tests & visual gates green; legacy `server/` & `client/` archived or removed per Decision 5 |

---

## 4. Recommendation + Why + Impact

### Recommended Architecture
1. **Rust + Axum + Tokio Core + Node Playwright/Camoufox Sidecar Worker (Option 1A)**
2. **Scoped `/design-taste-frontend` System (Option 2A)**: Full `tasteskill 2.5.1` layout/gate discipline on entry surfaces + strict design-token, typography, anti-slop copy, 2-box-depth, and restrained-motion discipline across every cockpit view.
3. **Askama Server-Rendered SVG Charts + Alpine.js Interactivity (Option 3A)**
4. **Hand-Crafted Modular CSS Tokens (`system.css` + `motion.css` style, Option 4A)** — zero frontend bundler.
5. **Parallel Cargo Workspace (`rust-cockpit/` or `src/` + `templates/` + `static/`) with Shared `data/` Compatibility, Cutover After Parity (Option 5A)**.

### Why This Is the Strongest Path
- **Stealth & Browser Parity Without Rewriting 3,900 LOC of Fragile Selectors:** `camoufox` and `playwright` depend on Playwright's Juggler protocol and C++ patches (`patchPlaywright.js`) that do not exist natively in Rust crates. Isolating Playwright/Camoufox behind a Rust-managed worker gives you Rust's rock-solid concurrency, memory safety, fast HTTP/JSON/SSE handling, and instant UI rendering **without sacrificing Camoufox anti-detect fidelity**.
- **True Zero-Bundler Frontend Simplicity:** Askama + HTMX + Alpine.js + plain modular CSS eliminates `vite`, `react`, `recharts`, `radix-ui`, `zustand`, and `client/node_modules` completely. Every HTML view renders server-side in microseconds from Rust memory with zero hydration mismatch and zero CORS surface.
- **UI/UX Elevation Without Breaking Operator Ergonomics:** Applying `/design-taste-frontend` tokens (1-step obsidian surface contrast `#070708 -> #111318 -> #151517`, `>= 13px` readable body/label scale, removal of noisy pulsing/spinning icons, verb+object controls, `44px` tap targets, max 2-box nesting) directly solves the current UI's visual clutter and micro-text readability issues while keeping dense fleet operations fast.

### Impact
- **Runtime Footprint:** Server RAM drops from Node+V8+Express baseline (~116 MB RSS idle per `API_REFERENCE.md`) to ~10–25 MB RSS for the Axum web/API/scheduler process (with browser worker memory allocated only while a browser task is actively running).
- **Frontend Payload:** Eliminates multi-hundred-KB React + Recharts + Radix JS bundles; total client JS shrinks to vendored `htmx.min.js` (~16 KB gzipped) + `alpine.min.js` (~15 KB gzipped) + tiny SSE/clipboard helpers (~2 KB).
- **Data Continuity:** 100% backward compatible with existing `data/*.json`, `data/comments/*.json`, `data/media/*`, `data/logs/*`, and `data/camoufox_profiles/*` — existing accounts, warmup days, rate limits, and audit history migrate seamlessly with zero manual conversion.
- **Maintainability:** Strong compile-time typing across Askama templates (`cargo check` catches missing template variables at compile time) and Axum handlers, eliminating silent schema drift between backend and frontend.

---

## 5. Detailed Technical Blueprint

### 5.1 Proposed Workspace Structure (Parallel Until Cutover)

```text
x-sentinel/
├── Cargo.toml                  # Rust binary crate (or workspace)
├── build.rs                    # Injects APP_VERSION from Cargo.toml / package.json
├── src/
│   ├── main.rs                 # Tokio entrypoint, port fallback (3000..3030), graceful SIGINT/SIGTERM
│   ├── config.rs               # Env/CLI port parsing, paths, defaults
│   ├── state.rs                # AppState (Arc<LocalDb>, Arc<RateGovernor>, Arc<TargetLock>, LogHub, BotManager)
│   ├── error.rs                # Unified AppError -> JSON (for /api/*) or HTML alert fragment (for HX-Request)
│   ├── security.rs             # originGuard middleware, Host regex, sec-fetch-site, secret/proxy masking & restore
│   ├── auth.rs                 # scrypt + SHA-256 fallback, HMAC cookie + epoch, RFC 6238 TOTP, IP rate limiter
│   ├── db.rs                   # Atomic .tmp + fsync + rename JSON persistence + .corrupt quarantine + caching
│   ├── logger.rs               # Broadcast SSE channel + 300-entry ring buffer + daily log rotation (30d retention)
│   ├── domain/
│   │   ├── mod.rs
│   │   ├── models.rs           # Account, Settings, HistoryItem, ScheduleItem, Stats, LastMission, TaskProgress
│   │   ├── spintax.rs          # Recursive {a|b|{c|d}} parser
│   │   ├── rate_governor.rs    # Gaussian delays, hourly/daily windows, 7-day warmup, quiet hours, strikes
│   │   ├── target_lock.rs      # Cross-node 5m engage / 15m reply TTL locks
│   │   ├── proxy.rs            # Multi-format proxy parser + Reqwest HTTP/SOCKS5 latency & GeoIP check
│   │   ├── tweet_extractor.rs  # FxTwitter / VxTwitter async resolver + URL canonicalizer
│   │   ├── ai_service.rs       # 7 providers + resilient JSON/SSE parser + anti-slop guardrails
│   │   ├── notifier.rs         # Telegram & Discord webhook dispatcher
│   │   └── scheduler.rs        # 15s Tokio background tick + 24h media pruning
│   ├── bot_bridge/
│   │   ├── mod.rs              # Manages bot-worker subprocess, task queue, pause/resume/abort CancellationToken
│   │   └── protocol.rs         # Typed JSON-RPC messages (verify, check_health, warmup, post, batch, hunter, camoufox_login, test_browser)
│   └── routes/
│       ├── mod.rs              # Master Axum Router (static assets, auth gate, UI routes, /api/* routes)
│       ├── ui.rs               # Askama full-page & HTMX partial handlers for all 10 tabs + modals + SVG chart builders
│       ├── auth.rs             # /api/auth/* & /login form handlers
│       ├── accounts.rs         # /api/accounts/* & HTMX node partials
│       ├── tasks.rs            # /api/tasks/* & task control partials
│       ├── ai.rs               # /api/ai/* (generate, payload files CRUD with path-traversal canonicalization)
│       ├── schedules.rs        # /api/schedules/*
│       ├── history.rs          # /api/history/* (JSON + RFC-4180 CSV)
│       ├── media.rs            # /api/media/* (base64 + multipart upload, 25MB/8MB limits)
│       ├── settings.rs         # /api/settings/*, /api/proxy/test, /api/spintax/preview, /api/templates
│       └── system.rs           # /api/status, /api/system/health, /api/system/diagnostics, /api/logs/*
├── worker/                     # Minimal Node.js Playwright + Camoufox execution worker (Option 1A)
│   └── bot_worker.js           # Thin JSON-RPC stdin/stdout adapter calling existing automation/bot/* modules
├── templates/                  # Askama compile-time checked HTML templates
│   ├── layouts/
│   │   ├── base.html           # <head>, theme tokens, self-hosted fonts, HTMX + Alpine + motion.js
│   │   └── cockpit.html        # Sidebar nav + top status bar + SSE log banner + main workspace + modal portal
│   ├── pages/
│   │   ├── login.html          # Clean obsidian auth gate (2FA step via HTMX/Alpine)
│   │   ├── not_found.html      # 404 route fallback
│   │   └── tabs/
│   │       ├── accounts.html   # Multi-Node & Proxy Management
│   │       ├── composer.html   # AI Post Studio & Fleet Publisher
│   │       ├── batch.html      # Target Engagement Workbench
│   │       ├── hunter.html     # Feed Hunter Intelligence
│   │       ├── analytics.html  # Analytics & Growth (Askama SVG charts)
│   │       ├── ai.html         # AI Provider Settings & Sandbox
│   │       ├── spintax.html    # Payload Bank & Spintax Vault
│   │       ├── safety.html     # Defense Protocol & Cockpit Access Security
│   │       ├── history.html    # Audit Ledger & Log Maintenance
│   │       └── about.html      # System Telemetry, 6-Pillar Diagnostics & Docs
│   └── partials/               # Granular HTMX swap targets (node cards/rows, progress strip, modals, toast OOB, charts)
└── static/
    ├── css/
    │   ├── tokens.css          # Palette, spacing (--s-1..10), typography (--t-*), radius (--r-*)
    │   ├── layout.css          # Shell grid, equal edges, responsive 1440/1024/768/390/320 rules
    │   ├── components.css      # 1-level cards, 1px hairline tables, buttons, forms, modals, tweet mockup
    │   └── motion.css          # 150/120/90ms hover/press, 2px card lift, focus ring, reduced-motion
    ├── js/
    │   └── cockpit.js          # Minimal glue: keyboard shortcuts (1-9, /, [), toast OOB listener, clipboard, draft stash sync
    ├── fonts/                  # Self-hosted Space Grotesk, Plus Jakarta Sans, JetBrains Mono (copied from @fontsource)
    ├── icons/                  # Self-hosted SVG icons (no external CDN)
    └── vendor/
        ├── htmx.min.js         # HTMX 2.x + sse extension (local vendored file)
        └── alpine.min.js       # Alpine.js 3.x (local vendored file)
```

---

### 5.2 Backend Parity & Rust Implementation Details

1. **Data Compatibility (`src/db.rs`)**:
   - Read/write exact existing JSON shapes in `data/*.json` using `serde(rename_all = "camelCase")` + explicit field `#[serde(rename = "...")]` (e.g., `auth_token`, `browser_engine` vs `browserEngine` where both exist in current JSON).
   - Keep unknown JSON fields via `#[serde(flatten)] extra: HashMap<String, Value>` on `Account` and `Settings` so migrating back and forth during testing never drops fields.
   - Atomic write pattern on Windows & POSIX: write `.tmp.<pid>.<ts>` -> `file.sync_all()` -> `fs::rename()` with 3-attempt backoff (50ms, 100ms, 150ms) for Windows `EBUSY`/antivirus locks. Corrupt JSON triggers `.corrupt.<ts>` rename before fallback.

2. **Authentication & Security Middleware (`src/security.rs`, `src/auth.rs`)**:
   - Enforce `originGuard` on all routes (`Origin`, `Referer`, `Host` matching `localhost`/`127.0.0.1`, `Sec-Fetch-Site != "cross-site"`).
   - **HTMX + Security Note:** HTMX sends same-origin requests with `HX-Request: true` and browser cookies (`HttpOnly; SameSite=Lax`). Because `originGuard` validates `Origin`/`Referer`/`Host` and `SameSite=Lax` cookie protects mutations, HTMX forms and buttons work natively without disabling security headers. Update CSP `script-src 'self'` (remove `'unsafe-inline'` if possible, or keep Alpine CSP-safe build `@alpinejs/csp`!). *Important detail:* Standard Alpine.js uses `new Function()` for expressions, which requires either `@alpinejs/csp` (recommended for strict `script-src 'self'`) or `'unsafe-eval'` in CSP. Planning `@alpinejs/csp` keeps CSP strict!
   - Password compatibility: verify existing Node `scrypt` (`salt:hex` 64-byte derived key using `scrypt` crate with Node's default `N=16384, r=8, p=1` parameters) and `SHA-256` fallback, plus constant-time comparison via `subtle::ConstantTimeEq`.
   - Session cookie compatibility: preserve `timestampBase36.nonce.epoch.hmacSha256` format so existing cookies remain interpretable, or cleanly invalidate on restart if desired.

3. **SSE Real-Time Logs & Live Progress (`src/logger.rs`, `src/routes/system.rs`)**:
   - `tokio::sync::broadcast::Sender<LogEntry>` feeds `GET /api/logs/stream` (`axum::response::sse::Sse`).
   - Support both JSON SSE payloads (for `/api/logs/stream` compatibility) and HTML SSE fragments (e.g., `GET /partials/logs/stream` or client-side Alpine append from `EventSource`) so Terminal Console updates smoothly with zero polling overhead.
   - Global running-task strip uses `hx-get="/partials/task-ribbon"` with `hx-trigger="every 3s"` (or SSE-triggered `HX-Trigger: task-updated` event) only while a task is active.

4. **Browser Automation Bridge (`src/bot_bridge/`)**:
   - Spawns `node worker/bot_worker.js` when a browser task, health check, warmup, or Camoufox login starts (or maintains a warm worker handle).
   - Commands over newline-delimited JSON-RPC (`stdin`/`stdout`):
     - `verify_account`, `check_health`, `check_fleet_health`, `warmup`, `run_post_task`, `run_batch_task`, `run_hunter_task`, `camoufox_login`, `test_browser`, `pause`, `resume`, `abort`.
   - Worker emits structured events back to Rust (`log`, `task_progress`, `history_record`, `account_update`, `rate_limit_header`, `flag_detected`, `mission_complete`). Rust remains the **single source of truth** writing to `db.rs`, updating `RateGovernor`, `TargetLock`, `Notifier`, and broadcasting to SSE!
   - Graceful shutdown (`SIGINT`/`SIGTERM`): Rust sends `abort`, closes worker child processes cleanly, stops Tokio scheduler, and exits.

---

### 5.3 UI/UX Redesign Specification (`/design-taste-frontend` Alignment)

1. **Classification & Voice Card (`copy.md`, `copy-voice.md`)**:
   - **Kind:** `software` (Dark Technical Cockpit)
   - **Voice Register:** `technical-dry` — concise, factual, zero marketing fluff, zero cyberpunk roleplay.
   - **Copy Rules Enforced:**
     - Replace generic or ornamental subtitles and all-caps eyebrow tags with concrete nouns and factual state (e.g., `15 nodes · 12 healthy · Camoufox` instead of `AUTONOMOUS FLEET CONTROL`).
     - Buttons use strict **Verb + Object** labels (`Add node`, `Run health check`, `Publish post`, `Start engagement`, `Save protocol`, `Export CSV`).
     - Minimum text size **13px** (`--t-label: 13px`) everywhere — eliminate all `9px`, `10px`, `11px` micro-text currently scattered in nav, metrics, and table headers.
     - One status wording per state across the whole app (`Healthy`, `Paused`, `Expired`, `Running`, `Queued`).

2. **Color & Surface Tokens (`system.md`, `backgrounds.md`)**:
   - **Neutral Surface Ladder (90–95% neutral, zero violet/lavender anywhere):**
     - `--g-main: #070708` (page ground)
     - `--g-alt: #0e1014` (sidebar & secondary band ground)
     - `--card: #151517` (card/panel fill — one clear step off page ground, 1px hairline border `rgba(241, 243, 247, 0.10)`, subtle 1px inner top highlight `rgba(255, 255, 255, 0.05)`)
     - `--frag: #1c1d21` (nested interactive surface — max 2 boxes deep, never 3)
     - `--ink: #f1f3f7` (>= 7:1 contrast for primary text)
     - `--muted: #9aa3b2` (>= 4.5:1 contrast for labels, timestamps, meta)
   - **Single Accent (`--action`):**
     - `--action: #f59e0b` (Amber, `--action-ink: #090b0f` >= 7:1 contrast on primary button). Used strictly for the primary action button in each view, active navigation bar/indicator, focus ring (`2px solid #f59e0b`, `2px` offset), and active progress/chart focus series.
   - **Semantic Status Colors (State-only, never decorative):**
     - Healthy / Success: `#10b981`
     - Warning / Cooldown: `#f59e0b`
     - Error / Expired: `#ef4444`
     - Informational / Proxy tunnel: `#3b82f6`

3. **Typography & Layout Grid (`layout-v4.md`, `system.md`)**:
   - **Font Pairing (Self-hosted):**
     - Display / Headings: `Space Grotesk` (weights 500, 600, 700, tight tracking `-0.02em`)
     - Body / Controls: `Plus Jakarta Sans` (weights 400, 500, 600, `15px–16px` body, `1.5–1.6` line height, `<= 62ch` prose width)
     - Telemetry / Handles / Logs / URLs: `JetBrains Mono` (`13px–14px`, `tabular-nums` for counters and timestamps)
   - **Spacing & Radius (`data-radius="soft"` or `"sharp"` for dev/operator tool):**
     - Strict spacing scale (`4, 8, 12, 16, 24, 32, 48px`) — cards `24px` apart (`12px` on mobile), card internal padding `24px–32px`.
     - Sharp/operator radius scale: `--r-lg: 12px` (cards/modals), `--r-md: 8px` (panels/tables), `--r-sm: 6px` (inputs), `--r-btn: 6px`.
   - **Shell Architecture & Equal Edges:**
     - Fixed-width collapsible sidebar (`248px` expanded / `72px` collapsed on desktop; slide-over sheet + `44x44` menu trigger below `1024px`) with flat `1px` right hairline — no drop shadows or frosted glass.
     - Single aligned `.wrap` container inside workspace (`max-width: 1360px`, equal left/right gutter `32px` desktop / `24px` tablet / `16px` mobile).
     - Top Telemetry Ribbon: page `<h1>` + subtle live engine badge + 4 crisp `tabular-nums` counter cells separated by `1px` rules (Likes, Reposts, Replies, Posts) + collapsible live task progress strip when running.

4. **Motion & Micro-Interactions (`motion.md`)**:
   - **Removed:** All infinite `animate-ping` dots, `animate-pulse` status icons, `reticle-spin`, and the 9 perpetual `DeckHeader` keyframe animations.
   - **Added (`motion.css`):**
     - Buttons: hover steps fill 14% toward ink and shifts `-1px` Y (`150ms cubic-bezier(.2,.8,.2,1)`), active press sinks `+1px` and `scale(0.985)` (`90ms`).
     - Interactive cards / node rows: `2px` lift + border brightness step (`180ms in / 120ms out`).
     - Active tab / segmented control pill: smooth `transform` transition (`240ms`).
     - HTMX swaps: subtle `150ms` opacity settle via `htmx-settling` / `htmx-added` classes (never scrolling reveals or staggered fade-ins).
     - `prefers-reduced-motion: reduce`: disables all transitions/transforms cleanly.

5. **Tab-by-Tab Askama + HTMX + Alpine Blueprint**:
   - **Login Gate (`pages/login.html`):** Clean centered obsidian surface (no radial blur halo), crisp shield mark, visible `<label for>` fields (`Operator username`, `Master passcode`, conditional `6-digit authenticator code` swapped via HTMX when `requireTotp: true`), `48px` high inputs, field-level inline validation errors, `44px`+ primary CTA (`Sign in to cockpit`).
   - **1. Nodes & Proxy (`tabs/accounts.html`):** Filter bar (`hx-get="/partials/nodes"` with `hx-trigger="input changed delay:200ms, change"`), Grid/Table toggle (Alpine), bulk selection bar, node cards/rows with clean 1px separation, proxy latency badge, Camoufox persistent badge, and HTMX modal triggers (`Add node`, `Bulk import`, `Node replies`, `Reset profile`, `Delete node`).
   - **2. Post Studio (`tabs/composer.html`):** Split 2-column grid (6+6): left = prompt form (`hx-post="/partials/composer/generate"`) + draft variations list + media dropzone (`POST /api/media/upload`); right = true-size X post preview mockup (Alpine live-bound to active draft + 280-char counter + attached thumbnails) + fleet dispatcher & schedule modal + localStorage draft stash drawer (Alpine).
   - **3. Target Workbench (`tabs/batch.html`):** Split 2-column grid: left = target URL validator (Alpine client-side parser + count) + vector switches (`Like`, `Repost`, `Reply`) + reply source + node selector + `Start engagement` (`hx-post="/api/tasks/batch"`); right = tabbed `Live stream` (SSE terminal) / `Mission monitor` (`hx-get="/partials/tasks/monitor"`).
   - **4. Feed Hunter (`tabs/hunter.html`):** Keyword builder + filter chips (Alpine `effectiveQuery` preview) + engagement vector selection + `Start radar sweep` right-aligned beside `Active stations` & `Discovered leads` HTMX tabs.
   - **5. Analytics (`tabs/analytics.html`):** Toolbar (`timeframe` + `node` filter driving `hx-get="/partials/analytics/dashboard"`), 4-up metric tiles, 2-up Askama SVG charts (Daily Velocity Area + 24h Activity Density) with Alpine hover tooltips, Node Share Donut + Leaderboard table, Failure Diagnostics list.
   - **6. AI Provider Settings (`tabs/ai.html`):** Segmented sub-tabs (`Engine`, `Persona & Guardrails`, `Sandbox Tester`) via Alpine/HTMX; provider selector cards, multi-model registry editor, live connection test (`hx-post="/partials/ai/test"`), live sample reply tester.
   - **7. Payload Bank (`tabs/spintax.html`):** Segmented sub-tabs (`Reply Generator`, `Spintax Workbench`, `File Vault`); tweet URL extractor + batch anti-slop reply generator with single-row regenerate (`hx-post="/partials/payloads/regenerate-row"`), 280-char indicator per row, live Spintax previewer, and `data/comments/*.json` inspector/deleter.
   - **8. Defense Protocol (`tabs/safety.html`):** Preset profile cards (2px hover lift, single active accent border), rate limits & human cadence form, Dual Engine selector (`Chromium` vs `Camoufox`) + live launch diagnostic (`hx-post="/partials/settings/test-browser"`), Telegram/Discord webhook config + test, and Cockpit Access Security (change username/password, 2FA QR/TOTP setup, revoke all sessions).
   - **9. Audit Ledger (`tabs/history.html`):** Stats strip, multi-filter bar (`hx-get="/partials/history/table"`), sortable paginated table with engine badge & detail drawer/modal, RFC-4180 CSV export, daily `.log` viewer/downloader, and prune modal.
   - **10. About & Diagnostics (`tabs/about.html`):** Live Rust runtime telemetry (`RSS`, `uptime`, `pid`, `storage`), 1-click 6-Pillar Diagnostic Audit modal (`hx-get="/partials/system/diagnostics"`), architecture summary, and security guarantees.

---

## 6. Risk Register & Verification Strategy

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Camoufox/Playwright incompatibility in pure Rust** | High | Critical | Keep `playwright` + `camoufox` isolated in `worker/bot_worker.js` controlled via Rust stdio JSON-RPC (Option 1A) until native Rust Juggler/Camoufox parity exists. |
| **CSP blocking Alpine.js expressions** | Medium | High | Use `@alpinejs/csp` build (`static/vendor/alpine-csp.min.js`) and write component logic via `Alpine.data(...)` in `static/js/cockpit.js`, preserving strict `script-src 'self'` without `'unsafe-eval'`. |
| **Windows file lock collisions on `data/*.json`** | Medium | Medium | Implement `.tmp` + `sync_all` + `rename` with 3-attempt exponential retry in `db.rs` plus `RwLock` synchronization inside `LocalDb` so concurrent requests never race on the same file. |
| **SSE connection drops / auth cookie handling** | Low | Medium | Use `SameSite=Lax; HttpOnly` session cookie sent automatically by browser `EventSource` and `htmx`, with clean `event: log` formatting and `Last-Event-ID` / client reconnect indicator. |
| **HTMX partial swap breaking focus or modal traps** | Medium | Medium | Enforce `hx-target` discipline, restore focus cleanly after modal close (`Escape` key + backdrop click), and bind `aria-live="polite"` on toast and task-progress containers. |

### Verification Checklist (Post-Build Gates)
1. **Rust Unit & Integration Suite (`cargo test`)**: Atomic DB writes + corruption quarantine, scrypt/SHA-256 + TOTP + session epoch, `originGuard`, secret/proxy masking, spintax, rate governor, target lock, AI response parser, path traversal shield.
2. **API Contract Parity (`node test/smoke_api.js` + expanded smoke checks)**: Verify exact status codes, JSON shapes, secret redaction, and `403` origin blocks against the running Axum binary.
3. **Browser Worker Integration**: Run `verify_url_resilience.js`, `verify_api_interceptor.js`, `verify_reply_interaction.js`, and `verify_camoufox_login_manager.js` through the Rust worker bridge.
4. **Design & Accessibility Gate**:
   - Run `copy-lint` checks on rendered HTML pages (`login`, `about`, primary views) ensuring zero slop words, zero residue, >= 13px minimum font size, and valid heading order (`h1 -> h2 -> h3`).
   - Headless browser audit across `1440x900`, `1024x768`, `820x1180`, `768x1024`, `390x844`, and `320x568`: zero horizontal overflow, >= `44px` interactive tap targets on mobile, verified `:focus-visible` rings, verified `prefers-reduced-motion: reduce`, and contrast >= `4.5:1` / `7:1`.
