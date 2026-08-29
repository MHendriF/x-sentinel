# 🏗️ X-SENTINEL Architecture & System Design

This document details the high-level architecture, module interactions, and data flow of **X-SENTINEL v1.3**.

---

## 🧭 System Topology Overview

```mermaid
graph TD
    subgraph Frontend ["Frontend Cockpit (React 19 + TypeScript + Zustand)"]
        UI[Modular Cockpit UI]
        Store[Zustand Central Store]
        Client[Type-safe API & SSE Client]
        UI --> Store
        Store --> Client
    end

    subgraph Backend ["Backend Engine (Bun / Express 5)"]
        Server[Express Server + SSE Stream]
        Sec[Local Security Guard<br/>Origin/Host Check + Secret Masking]
        Router[REST API Routes<br/>zod-validated]
        DB[Atomic LocalDB Engine]
        Scheduler[Cron Scheduler Service]
        Notifier[Telegram & Discord Notifier]
        Server --> Sec
        Server --> Router
        Router --> DB
        Router --> Scheduler
        Router --> Notifier
    end

    subgraph Automation ["Automation & Intelligence Layer"]
        Bot[Playwright Stealth Bot]
        AI[Multi-Provider AI Service]
        Proxy[Proxy Ping & GeoIP Resolver]
        Cookie[Cookie Manager & Formatter]
        Spintax[Spintax Permutation Engine]
        Bot --> Cookie
        Bot --> Proxy
        Bot --> Spintax
        Bot --> AI
    end

    subgraph Storage ["Persistent Local JSON Storage"]
        AccJSON[(accounts.json)]
        SetJSON[(settings.json)]
        HistJSON[(history.json)]
        SchJSON[(schedules.json)]
        MediaDir[(data/media/)]
        CommentsDir[(data/comments/)]
        DB --> AccJSON
        DB --> SetJSON
        DB --> HistJSON
        DB --> SchJSON
        DB --> MediaDir
        DB --> CommentsDir
    end

    subgraph External ["External Services"]
        TwitterPlatform[X / Twitter Platform]
        AIProviders[OpenRouter / Groq / OpenAI / Gemini / Ollama]
        Proxies[Dedicated HTTP/SOCKS5 Proxies]
        Webhooks[Telegram Bot / Discord Channels]
    end

    Client <-->|REST API & SSE Log Stream| Server
    Bot <-->|Playwright Automation| TwitterPlatform
    AI <-->|HTTP Inference| AIProviders
    Proxy <-->|Ping / Latency Check| Proxies
    Notifier -->|Alert Notifications| Webhooks
    Scheduler -->|Background Timer (15s)| Bot
```

---

## 🧩 Core Architectural Layers

### 1. Presentation Layer (`client/`)

- **Framework**: React 19 with TypeScript, bundled by Vite.
- **State Management**: Single centralized store in `client/src/store/useStore.ts` (Zustand), including connectivity (`apiOnline`) and dataset hydration flags.
- **Styling**: Vanilla Tailwind CSS + dark mode obsidian design system + shadcn/ui primitives. Self-hosted fonts via `@fontsource` (no CDN dependency).
- **UI Conventions**: flame/amber tokens for primary CTAs, Indonesian operational labels, skeleton loaders while datasets hydrate, and `__APP_VERSION__` injected from `package.json` by Vite.
- **Global Telemetry**: running-task progress strip + engine-offline banner in the ribbon; sidebar CORE status reflects real engine/task state; keyboard shortcuts (`1-9` tabs, `/` search).
- **Visual Telemetry**: Recharts dynamic visualizations (`AreaChart`, `PieChart`) in `AnalyticsDeck.tsx` (hourly bucketing for short ranges, left-to-right time axis).
- **Live Stream Terminal**: EventSource SSE stream connected to `/api/logs/stream` in `TerminalConsole.tsx`.

### 2. Application & Controller Layer (`server/`)

- **Web Server**: Express 5 on Bun/Node.js runtime, bound to loopback (`127.0.0.1`).
- **Local Security Guard** (`server/security.js`): rejects requests with foreign `Origin`/`Host` headers (anti drive-by exfiltration & DNS rebinding) and provides the secret-masking helpers used by every read endpoint.
- **Validation & Errors**: request bodies validated with zod schemas (`server/utils/http.js`); a centralized error handler in `server/index.js` maps `HttpError` to JSON responses.
- **Real-Time Streaming**: Server-Sent Events (SSE) broadcasting real-time logs from `server/logger.js`.
- **API Routing**: `server/routes/api.js` exposes structured endpoints for accounts, tasks, AI post generator, proxy testing, scheduling, webhooks, and history pruning.
- **Process Hardening**: Graceful shutdown handles `SIGINT`/`SIGTERM`, safely closing Chromium browser contexts and background timers.

### 3. Automation & Intelligence Layer (`server/automation/`)

- **`twitterBot.js`**: Core Playwright runner executing browser automation.
  - Multi-node isolated browser contexts with per-node proxy routing.
  - Natural human emulation: mouse jitter, typing delays, randomized action intervals.
  - GraphQL `CreateTweet` interception to capture exact status post URLs.
  - Fleet Health Validator & Session Probing.
  - Account Warmup Protocol (Tiered Day 1 to Day 7 routines).
- **`scheduler.js`**: Background cron loop evaluating pending schedules every 15 seconds.
- **`notifier.js`**: Instant webhook alert dispatcher for Telegram Bot and Discord channels.
- **`aiService.js`**: Contextual LLM inference with support for Groq, OpenRouter, OpenAI, Gemini, and Ollama, featuring automatic fallback to Spintax.
- **`proxyHelper.js`**: Realtime latency tester and GeoIP resolver (IP, Country, ISP).
- **`cookieManager.js`**: Formats and injects `auth_token` and `ct0` into Chromium contexts.
- **`spintax.js`**: Recursive parser for nested `{synonym1|synonym2}` templates.

### 4. Storage & Persistence Layer (`server/db.js`)

- **Atomic JSON Storage**: Uses in-memory caching combined with atomic file writes (writing to `.tmp`, `fsync`, then `fs.renameSync`, with transient-lock retries) to eliminate data corruption risks during sudden power loss or process termination. Direct non-atomic writes are never used as a fallback.
- **Corruption Quarantine**: If a JSON file fails to parse, it is renamed to `.corrupt.<timestamp>` instead of being silently overwritten — user data is preserved for manual recovery.
- **Zero External Database Dependency**: All data is self-contained in local `.json` files inside the `data/` folder (git-ignored for security).

---

## 🔄 Key Operational Workflows

### A. AI Post Generation & Publishing Flow

```
[User Input Keyword / Topic]
         │
         ▼
[apiClient.generateAIPost] ──> [aiService.js] ──> [LLM Inference / Spintax Fallback]
                                                           │
                                                           ▼
[User Edits / Attaches Media] <──────────────── [Single-Line Formatted Post]
         │
         ├───> [Publish Now] ──> [twitterBot.startPostTask] ──> [Attach Media & Playwright Post] ──> [Notifier Webhook]
         │
         └───> [Schedule] ───> [db.saveSchedule] ──> [scheduler.js (Background)] ──> [twitterBot.startPostTask]
```

### B. Fleet Health & Proxy Check Flow

```
[User Clicks "Fleet Health"]
         │
         ▼
[twitterBot.checkFleetHealth]
         │
         ├── Step 1: [proxyHelper.testProxy]
         │     ├── Success ──> Proceed to Step 2
         │     └── Dead ───> Auto-Pause Node (enabled: false) + Notify PROXY_DEAD
         │
         └── Step 2: [Playwright Headless Context]
               ├── Navigate to https://x.com/home
               ├── If redirected to /login ──> Mark EXPIRED + Notify SESSION_EXPIRED
               └── If valid ──> Extract screen_name + Mark HEALTHY
```
