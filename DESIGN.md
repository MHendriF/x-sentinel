# X-SENTINEL — Design & Architecture Specification (`DESIGN.md`)

**Version:** 2.0.0-draft (Migration Target from v1.3.5)  
**Approved Architecture Profile:** `1A + 2A + 3A + 4A + 5A`  
**Stack:** Rust + Axum (Backend) · Askama + HTMX + Alpine.js CSP (Frontend) · `/design-taste-frontend` (`tasteskill 2.5.1`) Visual & Copy System

---

## 1. Confirmed Architecture Decisions (`1A + 2A + 3A + 4A + 5A`)

| Code | Decision Area | Confirmed Choice | Architectural Summary |
|---|---|---|---|
| **1A** | Browser Automation | **Rust Orchestrator + Local Node Sidecar (`bot-worker`)** | Rust/Axum handles HTTP, Auth, DB, RateGovernor, TargetLock, Scheduler, AI Gateway, Proxy Tester, Notifier, Spintax, SSE, and SSR HTML; a minimal stdio JSON-RPC Node child process runs `playwright` (`^1.62.1`) and `camoufox` (`^0.1.19`) with zero stealth regression. |
| **2A** | UI/UX System | **Scoped `/design-taste-frontend` (`tasteskill 2.5.1`)** | Full `tasteskill` compliance on entry/overview pages + strict design tokens, neutral obsidian surface ladder, single `#f59e0b` accent, zero violet/lavender, `>= 13px` type floor, `technical-dry` anti-slop copy, max 2-box nesting, and 150/120/90ms motion across all 10 cockpit surfaces. |
| **3A** | Analytics Charts | **Askama Server-Rendered SVG + Alpine.js Tooltips** | Zero external charting library. Rust computes exact SVG paths, bars, and donut arcs server-side; HTMX swaps chart partials; Alpine handles crosshair/hover tooltips. |
| **4A** | CSS & Bundling | **Pure Modular CSS (`tokens`, `layout`, `components`, `motion`)** | Zero Node/Vite/Tailwind build step for frontend UI. `cargo build` compiles Askama templates and serves static assets directly. |
| **5A** | Migration & Cutover | **Parallel Workspace with Shared `data/` Compatibility** | Rust server runs against existing `data/*.json`, `data/comments/`, `data/media/`, `data/logs/`, and `data/camoufox_profiles/` until parity & verification gates pass, then retires `server/` and `client/`. |

---

## 2. System Topology & Runtime Boundaries

### 2.1 High-Level Architecture

```text
+-----------------------------------------------------------------------------+
| Browser (Localhost Loopback: http://127.0.0.1:3000)                         |
|  Askama SSR HTML + HTMX 2.x (partials/SSE) + Alpine.js CSP + Modular CSS    |
+--------------------------------------+--------------------------------------+
                                       | HTTP/1.1 + SSE (HttpOnly SameSite=Lax)
                                       v
+-----------------------------------------------------------------------------+
| Rust + Axum Server (Tokio Async Runtime, 127.0.0.1:3000..3030)              |
|  - Security Middleware: originGuard (Origin/Referer/Host/Sec-Fetch-Site)    |
|  - Auth & TOTP: scrypt/SHA-256 verify, HMAC-SHA256 sessionEpoch, RFC 6238   |
|  - Routes: / (SSR Shell), /ui/<tab>, /partials/* (HTMX), /api/* (REST+SSE)  |
|  - Domain Engines: LocalDb, RateGovernor, TargetLock, Spintax, AIService,   |
|                    ProxyHelper (HTTP/SOCKS5), TweetExtractor, Notifier,     |
|                    Scheduler (15s tick), LogHub (Broadcast + 30d rotation)  |
+------------------+-----------------------------------+----------------------+
                   | Atomic JSON (.tmp+fsync+rename)   | Stdio JSON-RPC (1A)
                   v                                   v
+----------------------------------+  +---------------------------------------+
| Local Sovereign Storage (data/)  |  | Node Browser Worker (bot_worker.js)   |
|  accounts.json, settings.json,   |  |  playwright ^1.62.1 + camoufox ^0.1.19|
|  history.json, schedules.json,   |  |  patchPlaywright.js, Lexical typing,  |
|  stats.json, templates.json,     |  |  GraphQL CreateTweet interceptor,     |
|  auth_config.json, lastMission,  |  |  humanize: 0.5 Bezier mouse curves    |
|  comments/, media/, logs/        |  |  profiles: data/camoufox_profiles/    |
+----------------------------------+  +---------------------------------------+
```

### 2.2 Workspace Directory Layout (5A Parallel Structure)

```text
x-sentinel/
├── Cargo.toml                  # Rust crate manifest (parallel alongside server/ & client/ until cutover)
├── build.rs                    # Injects APP_VERSION & build metadata
├── src/
│   ├── main.rs                 # Tokio entrypoint, CLI --port/-p parsing, 127.0.0.1 bind + 30-port fallback, graceful shutdown
│   ├── config.rs               # Loopback host, paths (DATA_DIR, media, comments, logs, camoufox_profiles), defaults
│   ├── state.rs                # Shared AppState (LocalDb, RateGovernor, TargetLock, LogHub, BotBridge, Scheduler)
│   ├── error.rs                # AppError -> JSON (/api/*) or inline HTML alert fragment (HX-Request)
│   ├── security.rs             # originGuard, Host regex, secret masking (••••), proxy masking (••••@host:port), restore helpers
│   ├── auth.rs                 # scrypt + SHA-256 fallback, HMAC cookie + sessionEpoch, RFC 6238 TOTP, IP rate limiter (5/60s)
│   ├── db.rs                   # RwLock in-memory cache + atomic .tmp/sync_all/rename (3x retry) + .corrupt.<ts> quarantine
│   ├── logger.rs               # 300-entry ring buffer, tokio::sync::broadcast SSE hub, daily logs with 30-day retention
│   ├── domain/
│   │   ├── models.rs           # Serde structs with #[serde(flatten)] extra map to preserve unknown fields across runtimes
│   │   ├── spintax.rs          # Recursive {a|b|{c|d}} parser
│   │   ├── rate_governor.rs    # Gaussian pacing, hourly/daily windows, 7-day warmup caps, TZ quiet hours, strike cooldowns
│   │   ├── target_lock.rs      # Cross-node lock (5m engage / 15m reply TTL)
│   │   ├── proxy.rs            # HTTP/SOCKS5 parser, live latency ping, GeoIP resolver
│   │   ├── tweet_extractor.rs  # Tweet URL normalization + FxTwitter/VxTwitter fallback resolver
│   │   ├── ai_service.rs       # 7 providers (9router, OpenRouter, OpenAI, Groq, Gemini, Ollama, Custom) + resilient JSON/SSE parser
│   │   ├── notifier.rs         # Telegram Bot API + Discord Webhook dispatcher
│   │   ├── analytics.rs        # Timeframe filtering, velocity buckets, 24h histogram, leaderboard, failure categorization, SVG geometry
│   │   └── scheduler.rs        # 15s Tokio tick (POST_QUEUE, BATCH_ENGAGEMENT, RECURRING_HUNTER) + 24h media prune
│   ├── bot_bridge/
│   │   ├── mod.rs              # Manages worker subprocess lifecycle, CancellationToken abort, pause/resume signals
│   │   └── protocol.rs         # Typed JSON-RPC requests/events between Rust and worker/bot_worker.js
│   └── routes/
│       ├── mod.rs              # Axum Router composition, static asset serving, CSP headers, auth layers
│       ├── ui.rs               # Askama full-page & HTMX partial handlers for shell, login, 10 tabs, modals
│       ├── auth.rs             # /api/auth/* + HTMX login/2FA handlers
│       ├── accounts.rs         # /api/accounts/* + HTMX node grid/table/modal partials
│       ├── tasks.rs            # /api/tasks/* + ribbon/monitor partials
│       ├── ai.rs               # /api/ai/* + path-traversal canonicalization guard + payload partials
│       ├── schedules.rs        # /api/schedules/*
│       ├── history.rs          # /api/history/* + RFC-4180 CSV export + filtered table partials
│       ├── media.rs            # /api/media/* (25MB base64/multipart route cap, 8MB per image)
│       ├── settings.rs         # /api/settings/*, /api/proxy/test, /api/spintax/preview, /api/templates, /api/stats
│       └── system.rs           # /api/status, /api/system/health, /api/system/diagnostics, /api/logs/stream, /api/logs/files, /api/logs/file
├── worker/
│   └── bot_worker.js           # Thin Node JSON-RPC adapter reusing existing server/automation/bot/* modules
├── templates/
│   ├── layouts/
│   │   ├── base.html           # <head>, meta tags, CSP-safe scripts, self-hosted fonts & CSS
│   │   └── cockpit.html        # Sidebar nav + workspace shell + telemetry ribbon + modal portal + toast region
│   ├── pages/
│   │   ├── login.html          # Unauthenticated entry gate
│   │   ├── not_found.html      # 404 fallback
│   │   └── tabs/               # accounts, composer, batch, hunter, analytics, ai, spintax, safety, history, about
│   └── partials/               # Swappable fragments: nodes_list, task_ribbon, analytics_charts, audit_table, modals, svg_charts/*
└── static/
    ├── css/                    # tokens.css, layout.css, components.css, motion.css
    ├── js/cockpit.js           # Alpine.data() CSP registrations, keyboard shortcuts (1-9, /, [), clipboard, OOB toast listener
    ├── fonts/                  # Space Grotesk, Plus Jakarta Sans, JetBrains Mono (WOFF2 self-hosted)
    ├── icons/                  # Self-hosted Lucide UI & brand SVG icons (no external CDN)
    └── vendor/                 # htmx.min.js, htmx-ext-sse.js, alpine-csp.min.js
```

### 2.3 Content Security Policy & Browser Security Contract
- **Loopback Binding & Guards:** `127.0.0.1` only; `originGuard` rejects non-local `Origin`, `Referer`, external `Host` headers, and `Sec-Fetch-Site: cross-site` with `403`.
- **Strict CSP (`script-src 'self'`):** By using **`@alpinejs/csp`** (`alpine-csp.min.js`) instead of standard Alpine.js, all Alpine expressions are pre-registered in `static/js/cockpit.js` via `Alpine.data(...)` — eliminating `'unsafe-inline'` and `'unsafe-eval'` from `script-src`:
  ```text
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://pbs.twimg.com https://abs.twimg.com;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  ```
- **HTML & Secret Hygiene:** Askama auto-escapes all interpolated variables by default. Masked values (`••••`) are emitted in both JSON API responses and Askama HTML inputs; raw secrets never appear in DOM attributes except inside `GET /api/accounts/export`.

---

## 3. Design System & `/design-taste-frontend` Adaptation (`2A`)

### 3.1 Classification & Scope Rules
- **Page Kind (`<html data-type="software">`, `<meta name="site-kind" content="software">`):** Dark technical operational software.
- **How `tasteskill 2.5.1` Maps to X-SENTINEL:**
  - **Entry (`login.html`) & Overview (`about.html`):** Strictly honor clean composition, single focal work frame, zero glow halos/blur backdrops, factual headline + concrete number, `48px` labeled inputs, and `44px` primary CTA.
  - **10 Operational Cockpit Views:** Apply the exact **palette tokens, surface contrast rules, typography floor, anti-slop copy register, max 2-box nesting depth, `44px` mobile tap targets, and `motion.css` physics**, while keeping a productive fixed-sidebar + dense workspace shell rather than forcing `100svh` marketing scroll pacing onto tables and log streams.

### 3.2 Audit of Current UI Slop Being Eliminated
Review of `client/src/` identified concrete violations that this redesign fixes:
1. **Violet/Purple Leakage (Banned by `tasteskill` Section 6):**
   - `DefenseProfilePresets.tsx` (`ghost` preset uses `border-purple-500/40 bg-purple-950/40 text-purple-400`)
   - `SystemDiagnosticModal.tsx` (`ai_gateway` icon uses `text-purple-400`)
   - `useAnalyticsData.ts` (`NODE_PALETTE` includes `#a855f7` and `#8b5cf6`)
   - **Fix:** Replace all violet/purple tokens with cobalt (`#3b82f6`), cyan (`#06b6d4`), teal (`#14b8a6`), amber (`#f59e0b`), emerald (`#10b981`), or rose (`#f43f5e`).
2. **Sub-13px Micro-Typography:**
   - Current codebase uses `text-[9px]`, `text-[10px]`, and `text-[11px]` across `NavDeck.tsx`, `TelemetryRibbon.tsx`, `LoginDeck.tsx`, `AuditTable.tsx`, `TweetMockupCard.tsx`, and `SystemDiagnosticModal.tsx`.
   - **Fix:** Strict **`13px` (`--t-label`) hard floor** for every visible character across labels, badges, timestamps, table headers, and terminal logs.
3. **Perpetual Decorative Animations:**
   - Current `index.css` defines `reticle-spin` and 9 infinite `DeckHeader` keyframe animations (`icon-layers-float`, `icon-sparkle-twinkle`, `icon-crosshair-lock`, `icon-radar-sweep`, `icon-barchart-wave`, `icon-bot-nod`, `icon-sliders-adjust`, `icon-shield-pulse`, `icon-file-scan`), plus `animate-ping` / `animate-pulse` dots in `NavDeck.tsx`, `LoginDeck.tsx`, and `TelemetryRibbon.tsx`.
   - **Fix:** Remove all perpetual/idle animations. Status indicators are still colored dots (`6px`). Motion responds strictly to pointer/keyboard interaction, active tab indicator travel, or live progress bars while a task is executing.
4. **Decorative Glow Halos & 3-Level Box Nesting:**
   - `LoginDeck.tsx` uses a blurred outer glow (`blur-xl`), grid pattern overlay, and nested header strips. `NavDeck.tsx` nests cards inside bordered telemetry cards inside the sidebar.
   - **Fix:** Flat `1px` surface hierarchy (`--g-main` -> `--g-alt` -> `--card`), max 2 boxes deep (`card > table/panel`), `1px` inner top highlight on dark cards (`rgba(255,255,255,0.05)`), zero `backdrop-blur` or ambient blurs.

---

## 4. Visual Design Tokens (`static/css/tokens.css`, `4A`)

### 4.1 Color System (90–95% Neutral Obsidian, Single Amber Accent)

```css
:root {
  /* Neutral dark surfaces (1 clear step between tiers; zero violet) */
  --g-main: #070708;      /* Page canvas */
  --g-alt:  #0e1014;      /* Sidebar rail & alternating panel band */
  --card:   #151517;      /* Elevated card / modal / drawer surface */
  --frag:   #1c1d21;      /* Nested interactive surface (2nd and final box tier) */
  --input-bg: #0b0c0f;    /* Recessed form controls */

  /* Ink & contrast hierarchy (WCAG AAA/AA verified on #070708 and #151517) */
  --ink:       #f1f3f7;   /* Primary text (>= 14:1 on #070708) */
  --ink-soft:  #cdd3de;   /* Card body text (~85% ink, >= 10:1) */
  --muted:     #949dab;   /* Labels, timestamps, meta (>= 6.2:1) */

  /* Hairlines & dark inner highlights (cards.md) */
  --line:        rgba(241, 243, 247, 0.10);
  --line-strong: rgba(241, 243, 247, 0.20);
  --hi-top:      rgba(255, 255, 255, 0.05);

  /* Single primary brand accent (Buttons, active indicator, focus ring, primary series) */
  --action:     #f59e0b;
  --action-hov: #fbbf24;
  --action-dim: rgba(245, 158, 11, 0.12);
  --action-ink: #090b0f;  /* >= 9.5:1 contrast on #f59e0b */

  /* Functional semantic states (status-only, never decorative) */
  --st-ok:      #10b981;
  --st-ok-dim:  rgba(16, 185, 129, 0.12);
  --st-warn:    #f59e0b;
  --st-warn-dim:rgba(245, 158, 11, 0.12);
  --st-err:     #ef4444;
  --st-err-dim: rgba(239, 68, 68, 0.12);
  --st-info:    #3b82f6;
  --st-info-dim:rgba(59, 130, 246, 0.12);

  /* Non-violet categorical chart palette (for SVG analytics) */
  --chart-1: #f59e0b; /* Amber */
  --chart-2: #3b82f6; /* Cobalt */
  --chart-3: #10b981; /* Emerald */
  --chart-4: #06b6d4; /* Cyan */
  --chart-5: #f43f5e; /* Rose */
  --chart-6: #84cc16; /* Lime */
  --chart-7: #f97316; /* Orange */
  --chart-8: #64748b; /* Slate / Others */
}
```

### 4.2 Typography, Spacing, Radii & Control Dimensions

```css
:root {
  /* Self-hosted font families */
  --font-display: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  --font-text:    'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

  /* Strict type scale (13px minimum floor; no 9px/10px/11px text) */
  --t-label: 13px;  /* Labels, table headers, badges, log timestamps, meta */
  --t-small: 14px;  /* Dense table cells, form helper text, secondary nav */
  --t-body:  15px;  /* Primary operational prose & controls (16px on long reading blocks) */
  --t-lead:  18px;  /* Page subtitle / lead description */
  --t-card:  18px;  /* Card / section title (weight 600) */
  --t-h2:    22px;  /* Section heading */
  --t-h1:    clamp(24px, 1.2vw + 18px, 30px); /* Page title */
  --t-stat:  clamp(24px, 0.9vw + 20px, 32px); /* Metric figure (tabular-nums) */

  /* 4/8 spacing scale */
  --s-1: 4px;   --s-2: 8px;   --s-3: 12px;  --s-4: 16px;
  --s-5: 24px;  --s-6: 32px;  --s-7: 48px;  --s-8: 64px;

  /* Sharp/Operator radius scale (developer/fleet tool profile) */
  --r-sm:  4px;   /* Inputs, badges, inline chips */
  --r-md:  8px;   /* Panels, tables, toast, code boxes */
  --r-lg:  12px;  /* Cards, dialogs, login frame */
  --r-btn: 6px;   /* Buttons & segmented tabs */

  /* Touch & keyboard targets (all controls >= 44px on mobile; desktop standard 40-44px) */
  --btn-h:    44px;
  --btn-h-sm: 36px; /* Expands to 44px below 768px */
  --input-h:  44px; /* 48px on login gate */
  --sidebar-w: 256px;
  --sidebar-collapsed-w: 72px;
  --wrap-max: 1360px;
  --gut: 32px;
}

@media (max-width: 1023px) { :root { --gut: 24px; } }
@media (max-width: 639px)  { :root { --gut: 16px; --btn-h-sm: 44px; } }
```

---

## 5. Layout Shell, Grid & Responsive Behavior (`static/css/layout.css`)

### 5.1 Workspace Shell Geometry

```text
1440px Desktop Layout:
+----------------------+-------------------------------------------------------+
| Sidebar (256px)      | Main Workspace (.wrap max-width: 1360px, gut: 32px)   |
| --g-alt (#0e1014)    +-------------------------------------------------------+
| 1px right border     | Top Telemetry Ribbon                                  |
|                      |  <h1>Tab Title</h1> + [Engine Pill] | Likes|RP|Rep|Pst|
| [X] X-SENTINEL       |  (Optional Active Task Progress Strip when running)   |
|     v1.3.5           +-------------------------------------------------------+
|                      | Active Tab Surface (12-column CSS Grid, gap: 24px)    |
| Engine: Online       |                                                       |
| 15 nodes · 12 active |  - Cards: --card (#151517), 1px --line, 24px padding  |
|                      |  - Tables: open rows with 1px horizontal rules        |
| CONTROL              |  - Modals: <dialog> or Alpine portal over backdrop    |
|  > Nodes & Proxy     |                                                       |
|    Post Studio       |                                                       |
|    Target Workbench  |                                                       |
|    Feed Hunter       |                                                       |
|    Analytics         |                                                       |
|                      |                                                       |
| CONFIGURATION        |                                                       |
|    AI Providers      |                                                       |
|    Payload Bank      |                                                       |
|    Defense Protocol  |                                                       |
|    Audit Ledger      |                                                       |
|                      |                                                       |
| SYSTEM               |                                                       |
|    About & Specs     |                                                       |
|                      |                                                       |
| [Lock Cockpit]       |                                                       |
+----------------------+-------------------------------------------------------+
```

### 5.2 Responsive Breakpoint Contract (`1440`, `1024`, `820/768`, `390`, `320`)
1. **Desktop (`>= 1024px`):**
   - Sidebar sits in-flow (`256px` expanded or `72px` collapsed via `[` or `Ctrl+B`, persisted in cookie/localStorage).
   - 12-column grid (`.grid`) with `24px` column and row gap. Split workbenches (`PostStudio`, `TargetWorkbench`, `FeedHunter`, `Analytics`) use `6+6` or `5+7` column spans.
2. **Tablet (`640px – 1023px`, checked at `820x1180` & `768x1024`):**
   - Sidebar converts to an off-canvas slide drawer triggered by a `44x44` Menu button in the Top Telemetry Ribbon.
   - Multi-column split views stack cleanly (`grid-column: 1 / -1`), input/action controls come first, live console/preview sits directly below.
   - Telemetry counters wrap cleanly as a `2x2` grid (`1fr 1fr`) with `1px` grid dividers.
3. **Mobile (`390px` and `320px`):**
   - Equal `16px` horizontal gutter (`--gut: 16px`), zero horizontal scroll (`overflow-x: clip`, every `.table-wrap` handles horizontal table scroll internally without widening the page).
   - Every interactive button, toggle, tab, and icon control enforces `min-height: 44px; min-width: 44px` with at least `8px` gap between adjacent targets.
   - Form fields are `16px` font-size on mobile to prevent browser auto-zoom.
   - Primary action buttons inside forms and modals span `width: 100%`.

### 5.3 Box Nesting & Visual Discipline (`cards.md`)
- **Two-Box Ceiling:** Never stack `card > bordered panel > bordered sub-card > item`.
  - Allowed: `Section Ground (--g-main)` -> `Card (--card)` -> `Open List Row (1px bottom border)` or `Inset Interactive Fragment (--frag)`.
- **Open Tables & Rows:** Audit Ledger, Nodes Table, Scheduled Queue, and 6-Pillar Diagnostics use crisp `1px solid var(--line)` row dividers instead of individual rounded boxes per row.
- **No Fake Captions:** Never place explanatory captions below images, charts, or UI mockups. Headings and inline labels carry the full meaning.

---

## 6. Copywriting & Microcopy Specification (`copy.md`, `copy-voice.md`)

### 6.1 Voice Card
```text
Voice:   technical-dry (copy-registers.md #2: Technical and dry, with proof)
Tone:    Direct, exact, unhurried; never theatrical or promotional
Person:  Imperative verb+object on buttons; factual state in headers and logs
Sizes:   13px minimum label; sentence case everywhere (never ALL-CAPS tracked labels)
Facts:   Real counts and units only (15 nodes, 240 ms, 18/280 chars, Day 3/7)
Never:   Cyberpunk metaphors, exclamation-mark hype, AI-slop adjectives, emoji bullets
```

### 6.2 Copy Refactor Table (Before vs After)

| Location | Legacy v1.3.5 Copy (Replaced) | Redesigned `/design-taste-frontend` Copy |
|---|---|---|
| Login Badge | `SENTINEL-DEFENSE // V1.3.5` · `RESTRICTED NODE` | `X-SENTINEL v1.3.5 · Localhost 127.0.0.1` |
| Login Subtitle | `Autonomous Fleet Mission Control & Growth Studio` | `Manage X account nodes, scheduled posts, and engagement tasks.` |
| Login CTA | `Authenticate` / `Enter` | `Sign in to cockpit` |
| Sidebar Tagline | `AUTONOMOUS FLEET CONTROL` | `15 nodes · 12 active` (live telemetry facts) |
| Sidebar Sections | `CONTROL SURFACES`, `INTELLIGENCE & DEFENSE`, `SYSTEM & INTEL` | `Operations`, `Configuration`, `System` |
| Page Subtitles | `Autonomous keyword & hashtag radar sweep with coordinated multi-node engagement.` | `Search recent posts by keyword and run Like, Repost, or Reply actions.` |
| Action Buttons | `Launch Engagement`, `Save Protocol`, `Verify` | `Start engagement`, `Save settings`, `Check health` |
| Empty State | `[SYS] Awaiting telemetry stream from Playwright engine...` | `No log events yet. Start a task or health check to stream output.` |

---

## 7. Motion & Interaction Physics (`static/css/motion.css`, `motion.md`)

### 7.1 Motion Tokens & Rules
```css
:root {
  --m-in:    150ms;
  --m-out:   120ms;
  --m-press: 90ms;
  --m-panel: 200ms;
  --m-slide: 240ms;
  --m-ease:  cubic-bezier(0.2, 0.8, 0.2, 1);
  --m-ease-io: cubic-bezier(0.65, 0, 0.35, 1);
}
```
1. **Buttons (`.btn`):**
   - Hover (only `@media (hover: hover) and (pointer: fine)`): background steps toward ink/light (`color-mix`) and shifts `translateY(-1px)` in `150ms`.
   - Active press: `translateY(1px) scale(0.985)` in `90ms`.
2. **Interactive Cards (`.card--interactive`):**
   - Hover: `translateY(-2px)` + border steps from `--line` to `--line-strong` (`180ms in / 120ms out`). Non-clickable info cards use `.m-nolift` (zero lift).
3. **Focus Rings (`:focus-visible`):**
   - `2px solid var(--action)` with `2px` offset, rendered immediately (`transition: none`) so keyboard navigation is crisp and unmistakable.
4. **Segmented Tabs & Nav Indicator:**
   - Active indicator transitions via `transform` (`240ms var(--m-ease-io)`).
5. **HTMX Swap Settle:**
   - `.htmx-added` / `.htmx-settling` subtle opacity settle (`0 -> 1` in `150ms`), never sliding or bouncing rows.
6. **Reduced Motion (`@media (prefers-reduced-motion: reduce)`):**
   - Disables all `transform` moves while preserving color/border state changes and instant focus rings.

---

## 8. Askama + HTMX + Alpine.js CSP + SVG Chart Architecture (`3A` + `4A`)

### 8.1 Route & Partial Rendering Model
- **Dual-Purpose Backend:**
  - `/api/*`: Preserves 100% JSON & SSE contract for external tests (`smoke_api.js`) and programmatic tools.
  - `/`, `/login`, `/ui/<tab>`: Full Askama SSR HTML documents (deep-linkable URLs replacing fragile hash routing, while keeping `/#composer` redirect compatibility via tiny bootstrap script if needed).
  - `/partials/*`: Lightweight HTML fragment endpoints rendered by Askama for HTMX swaps (`hx-target`, `hx-swap="outerHTML"` or `"innerHTML"`).
- **Out-of-Band (OOB) Updates:**
  - Mutations (`POST /partials/accounts`, `POST /partials/settings`, `POST /partials/tasks/*`) return the updated fragment PLUS:
    - `<div id="toast-region" hx-swap-oob="beforeend">...</div>` for dismissible status notifications (with `role="status"` / `aria-live="polite"`).
    - `<div id="telemetry-ribbon" hx-swap-oob="outerHTML">...</div>` when counters or task status change.
- **SSE Integration (`htmx-ext-sse.js` + `EventSource`):**
  - Terminal Console connects once to `/partials/logs/stream` (or consumes JSON from `/api/logs/stream` via an Alpine CSP log buffer component capped at 300 entries with auto-scroll toggle and clipboard copy).
  - Top Telemetry Ribbon polls `/partials/task-ribbon` every `2.5s` **only while `is_running == true`** (and stops polling via conditional `hx-trigger` once completed).

### 8.2 Alpine.js CSP Scope (`@alpinejs/csp`)
Alpine handles strictly **ephemeral client-side UI state** (zero business logic duplication):
- `cockpitShell`: sidebar collapsed state (`localStorage`), mobile drawer open/close, keyboard shortcuts (`1–9` switches tab via HTMX/navigation, `/` focuses `#node-search`, `[` toggles sidebar).
- `composerPreview`: live binding between draft `<textarea>` and Tweet Mockup preview, 280-char headroom calculation (`remaining = 280 - len`), single-line whitespace cleaner, and `localStorage` Drafts Stash drawer.
- `targetParser`: live URL sanitizer & deduplicator for Target Workbench `<textarea>` + Spintax client previewer.
- `hunterQueryBuilder`: computes live `effectiveQuery` preview from keyword + filters (`-is:retweet`, `min_faves:`, `lang:`).
- `nodeBulkSelect`: tracks selected node IDs in Grid/Table view and toggles the bulk action bar visibility.
- `svgChartTooltip`: listens to `mouseenter`/`mousemove` on SVG `<circle>`/`<rect>`/`<path>` `data-*` attributes and positions a single floating numeric tooltip.

### 8.3 Askama Server-Rendered SVG Charts (`3A`)
`src/domain/analytics.rs` computes clean, deterministic SVG viewBox coordinates passed directly to Askama templates (`templates/partials/svg_charts/`):
1. **Daily Velocity Area Chart (`viewBox="0 0 640 240"`):**
   - Left-to-right chronological polyline + subtle bottom fill (`opacity: 0.14`, solid hue, zero complex gradients) per vector (`Likes`, `Reposts`, `Replies`, `Posts`), horizontal `1px` gridlines (`--line`), crisp axis labels (`>= 13px`), and transparent hit columns (`<rect data-tip="...">`) for Alpine tooltip inspection.
2. **24-Hour Density Histogram (`viewBox="0 0 640 220"`):**
   - 24 rounded-top `<rect>` bars (`00`..`23`), peak hour highlighted in `--action` (`#f59e0b`), baseline hours in neutral slate/blue, failure overlay tick if `failures > 0`.
3. **Node Share Donut Chart (`viewBox="0 0 220 220"`):**
   - Computed SVG `stroke-dasharray` / `stroke-dashoffset` `<circle>` arcs using `--chart-1..--chart-8` (strictly non-violet), center total displayed in `tabular-nums`, paired beside a sortable node leaderboard table.

---

## 9. Screen-by-Screen UI Blueprint

### 9.1 Authentication Gate (`pages/login.html`)
- **Layout:** Centered `420px` max-width `.card` on flat `--g-main` (`#070708`), `32px` padding.
- **Content:** Mark + `X-SENTINEL` heading (`h1`), factual status line (`Local instance · 127.0.0.1`), visible `<label for>` fields (`48px` height): `Operator username` (default `admin`), `Master passcode` with show/hide toggle (`44x44` hit target), and conditional `6-digit authenticator code` field injected via HTMX if `requireTotp` is returned.
- **Submit:** Full-width `44px` primary button `Sign in to cockpit` with HTMX inline error slot (`role="alert"`).

### 9.2 Multi-Node & Proxy Management (`tabs/accounts.html`)
- **Top Action Row:** `Add node`, `Bulk import`, `Test proxies` (`hx-post="/partials/accounts/test-proxies"`), `Check fleet health` (`hx-post="/partials/accounts/check-health"`), `Export JSON`, `Export CSV`.
- **Filter & View Strip:** Search input (`id="node-search"`, `hx-get="/partials/nodes"`, `hx-trigger="input changed delay:200ms"`), status filter (`All`, `Healthy`, `Paused`, `Expired`, `Cooldown`), sort select, Grid/Table switch, page size (`12 / 24 / 48`).
- **Node Card (Grid) / Row (Table):**
  - Displays Avatar/Initial, Label + `@handle`, clean status pill (`Healthy` / `Paused` / `Expired`), Proxy host masked (`••••@host:port`) + latency badge, Warmup progress (`Day 3/7`), Risk score (`0–100`), Camoufox persistent profile indicator (`Profile saved` / `None`), and compact action menu (`Toggle`, `Check health`, `Warmup`, `Camoufox login`, `Comments`, `Edit`, `Reset Camoufox`, `Delete`).
- **Modals (HTMX-loaded into `#modal-portal`):**
  - `AccountModal` (with Smart Cookie Extractor parser + Live Proxy Test), `BulkImportModal`, `CommentsModal`, `ResetCamoufoxDialog`, `DeleteNodeDialog`.

### 9.3 AI Post Studio (`tabs/composer.html`)
- **Sub-tabs:** `Studio`, `Drafts stash`, `Scheduled queue`.
- **2-Column Grid (`6 + 6`, stacks below `1024px`):**
  - **Left Column:** Topic/keyword input, persona preset selector (`Viral Hook`, `Alpha Insight`, `Mini Value-Drop`, `Founder Story`, `Global Tech Community`), language (`EN / ID`), variation count (`1–5`), mode (`Single / Thread`), `Generate drafts` button (`hx-post="/partials/composer/generate"`), clickable draft variations list with single-row `Regenerate` and Quick Polishers (`Hook`, `Punchline`, `Formalize`, `Slop purge`).
  - **Right Column:** Live true-size X post preview (`Avatar`, `Name`, `@handle`, editable draft textarea, 280-char headroom bar, media thumbnails up to 4 images via `POST /api/media/upload`) + Fleet Dispatcher (`Single node` or `All active nodes` with staggered delay `5–60s`, `Publish post`, `Save to stash`, `Schedule post`).

### 9.4 Target Engagement Workbench (`tabs/batch.html`)
- **2-Column Grid (`6 + 6`):**
  - **Left Column:** Target Tweet URLs `<textarea>` with live Alpine valid-URL counter, Engagement vector switches (`Like`, `Repost`, `Reply`), Node selector (`All active`, `Healthy only`, `Custom checklist modal`, single node), Cross-Node Target Lock switch, Reply Payload source (Per-node file / Global Spintax / Custom / AI), Spintax live preview button, and task controls (`Start engagement`, `Pause`, `Resume`, `Stop`, `Schedule batch`).
  - **Right Column:** Segmented tabs (`Live stream` SSE Terminal Console with `Copy` / `Clear` vs `Mission monitor` polled via HTMX).

### 9.5 Feed Hunter (`tabs/hunter.html`)
- **2-Column Grid (`6 + 6`):**
  - **Left Column:** Keyword/query input + niche preset chips, search filter controls (`Latest / Top`, `Exclude retweets`, `Min likes`, `Language`), Alpine live `effectiveQuery` preview strip, max tweets (`1–50`), vector toggles, and `Start radar sweep` + `Create recurring schedule`.
  - **Right Column:** Segmented tabs (`Live stream` vs `Active stations` recurring schedules CRUD vs `Discovered leads` history filter).

### 9.6 Analytics & Growth (`tabs/analytics.html`)
- **Toolbar:** Timeframe (`24h`, `7d`, `30d`, `All`), Node drilldown select, `Refresh data`, `Export CSV`.
- **KPI Strip (4-up `3+3+3+3`):** Total Likes, Total Reposts, Total Replies, Total Posts (with `+N today` deltas and overall Success Rate).
- **Charts Row (2-up `6+6`):** Daily Velocity SVG Area Chart + 24-Hour Density SVG Bar Chart.
- **Breakdown Row (`5+7`):** Node Workload Share SVG Donut + Interactive Node Leaderboard Table (click row filters dashboard to that node) + Failure Diagnostics summary card.

### 9.7 AI Provider Settings (`tabs/ai.html`)
- **Sub-tabs:** `Engine`, `Persona & Guardrails`, `Sandbox`.
- **Engine:** Provider card selector (`None`, `9Router`, `OpenRouter`, `OpenAI`, `Groq`, `Gemini`, `Ollama`, `Custom`), masked API key input, Base URL override, default model + multi-model registry list editor, `Test connection` button (`hx-post="/partials/ai/test"`), `Save settings`.
- **Persona & Guardrails:** 7 calibrated persona presets, custom system prompt `<textarea>`, anti-slop toggle switches (`No hashtags`, `No quotes`, `No generic praise`, `No buzzwords`, `1-sentence max`).
- **Sandbox:** Sample tweet `<textarea>` + `Run sandbox reply` (`hx-post="/partials/ai/sandbox"`).

### 9.8 Payload Bank & Spintax (`tabs/spintax.html`)
- **Sub-tabs:** `Reply generator`, `Spintax workbench`, `File vault`.
- **Reply generator:** Paste tweet URL (`hx-post="/api/ai/fetch-tweet"`) or post text, count (`1–50`), tone, language, generate anti-slop quote-free replies, per-row edit + `280` headroom bar + single-row `Regenerate`, `Save to file` modal (`data/comments/*.json`, optionally assign to node or global templates).
- **Spintax workbench:** Global templates stack editor + live permutation tester (`hx-post="/api/spintax/preview"`) + preset library modal.
- **File vault:** Safe `data/comments/*.json` listing with entry count, size, `Inspect` modal, and `Delete` confirmation.

### 9.9 Defense Protocol & Cockpit Access Security (`tabs/safety.html`)
- **Preset Strip (4-up):** `Turbo Velocity`, `Balanced Standard`, `Ghost Ultra-Stealth` (uses cobalt/emerald/amber semantic badges — zero purple), `Account Warmup`. Clicking populates form inputs via Alpine/HTMX.
- **Rate Limits & Dual Engine Form:** Min/Max action delay, Account switch delay, Hourly/Daily limits, Human typing jitter (`ms`), Scroll before action, Enforce warmup gate, Cross-node target lock + `Clear active locks` button, Headless mode toggle, Browser Engine (`Chromium` vs `Camoufox`) + `Test browser launch`.
- **Webhooks Card:** Telegram Bot Token + Chat ID + `Test Telegram`; Discord Webhook URL + `Test Discord`; notification trigger toggles.
- **Cockpit Access Security Card:** Change operator username/password, TOTP 2FA setup/QR (`otpauth://` URI + SVG QR generated cleanly in Rust via `qrcode` crate — zero external QR CDN!) + enable/disable 2FA, `Revoke all sessions`.

### 9.10 Audit Ledger (`tabs/history.html`)
- **Stats Strip:** Total Actions, Success Rate, Failure Count, Engine Split (`Chromium` vs `Camoufox`).
- **Filter Bar:** Search text, Action vector (`All / LIKE / RETWEET / COMMENT / POST`), Status (`All / SUCCESS / FAILED / ALREADY_DONE`), Node filter, Date range (`Start` / `End`), Limit (`100 / 250 / 500 / 1000`), Auto-refresh interval (`Off / 5s / 10s / 30s`).
- **Open Audit Table:** Columns: Timestamp, Node, Vector, Engine, Target URL (copy/open), Status, Action (`Inspect`). Clicking opens `AuditDetailModal`.
- **Log File Browser & Maintenance:** Select daily rotating log (`x-sentinel-YYYY-MM-DD.log`) to view or download, RFC-4180 CSV export, and `MaintenanceModal` (`Prune >30d`, `>7d`, `Failed only`, `Clear all`).

### 9.11 About & Diagnostics (`tabs/about.html`)
- **Sub-tabs:** `Overview`, `Live telemetry`, `Docs`.
- **Live Telemetry:** Rust runtime stats (`Uptime`, `PID`, `RSS Memory`, `Storage bytes`, `Active Nodes`, `Active Engine`, `AI Provider`) + `Run 6-pillar audit` button opening `SystemDiagnosticModal` (`storage_io`, `browser_engine`, `ai_gateway`, `fleet_readiness`, `stealth_cadence`, `scheduler_engine` with JSON dump export).
- **Architecture & Docs:** Crisp capability summary cards (max 2 boxes deep, zero slop) + documentation links + security guarantees (`127.0.0.1` loopback, masked secrets, local `data/`).

---

## 10. Verification & Acceptance Gates

Before Phase 7 cutover is declared complete, every gate below must run and pass with recorded output:
1. **Compile & Template Safety:** `cargo check` and `cargo test --release` pass (Askama validates all template variables/paths at compile time).
2. **Backend Parity:** `node test/smoke_api.js` and Rust integration tests pass against the Axum server (verifying `originGuard` `403`, auth/TOTP, secret masking `••••`, path traversal rejection, atomic JSON writes, rate governor, target lock, AI response parsing).
3. **Browser Automation Bridge:** End-to-end execution of `verify_url_resilience.js`, `verify_api_interceptor.js`, `verify_reply_interaction.js`, and `verify_camoufox_login_manager.js` via `bot_bridge` + `worker/bot_worker.js`.
4. **Design & Accessibility Audit (`/design-taste-frontend`):**
   - `copy-lint.mjs` passes on rendered `login.html` and `about.html` with zero banned slop words, zero residue, and valid heading hierarchy (`h1 -> h2 -> h3`).
   - Headless Chromium inspection across `1440x900`, `1024x768`, `820x1180`, `768x1024`, `390x844`, and `320x568`: zero horizontal overflow, zero violet/lavender colors in CSS/SVG, minimum computed font-size `>= 13px`, `>= 44px` tap targets on mobile, verified `:focus-visible` outlines, and `prefers-reduced-motion: reduce` compliance.
   - `perf.mjs` shows zero oversized assets or layout shifts (CLS).
