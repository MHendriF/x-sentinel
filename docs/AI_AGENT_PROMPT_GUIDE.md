# 🤖 AI Agent Coding & Architecture Guide for X-SENTINEL

This document serves as high-context system guidelines for **AI coding assistants and autonomous agents** tasked with developing, refactoring, or extending the **X-SENTINEL** codebase.

---

## 📌 1. Project Identity & Architecture Tenets

- **Name**: X-SENTINEL v1.3.3
- **Domain**: Multi-Node X (Twitter) Automation Cockpit & Publishing Studio.
- **Runtime**: Bun (Preferred) / Node.js 18+.
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts.
- **Backend**: Express 5 on Node.js / Bun (zod-validated routes, centralized error handler).
- **Automation**: Playwright Chromium (Stealth Mode).
- **Database**: Zero external DB. Atomic JSON Engine (`server/db.js`).
- **Security model**: loopback-only server, Origin/Host guard, secret masking (`server/security.js`).

---

## ⚠️ 2. Critical Rules for AI Agents

### A. Atomic JSON Storage Safety

- **Rule**: Never use `fs.writeFileSync(path, ...)` directly on persistent database files (`accounts.json`, `settings.json`, `history.json`, `schedules.json`).
- **Reason**: A sudden interruption or error will truncate the file to 0 bytes, permanently destroying user data.
- **Pattern**: Always use the methods provided in `server/db.js` (`db.save(type)` or `db.writeFileAtomic(...)`).

### B. State Hydration in Zustand

- **Rule**: When adding new state to `client/src/store/useStore.ts`, always invoke its `loadX()` loader inside `App.tsx`'s root `useEffect` or the specific component's mount `useEffect`.
- **Reason**: Prevents "None", unhydrated states, or empty arrays when users navigate directly to tab hashes (e.g. `/#composer`, `/#history`).

### C. Single-Line Post Cadence in AI Post Studio

- **Rule**: Generated tweet drafts must always collapse newlines into single spaces (`.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()`).
- **Reason**: The user requires strict single-line text formatting for native high-velocity Twitter aesthetics.

### D. Date & Time Representation

- **Rule**: In UI tables, timestamps must follow standard Indonesian numeric format `DD/MM/YYYY` (e.g., `27/08/2026`) on line 1, and `HH:mm:ss` on line 2.

### E. Frontend Compilation Verification

- **Rule**: After editing any `.ts` or `.tsx` file in `client/`, always run:
  ```bash
  bun run --cwd client build
  ```
  to verify that TypeScript types and Vite build compile with **0 errors**.

### F. Tab Registry Sync (TelemetryRibbon)

- **Rule**: When adding or renaming a cockpit tab, always add a matching entry to `TAB_TITLES` in `client/src/components/cockpit/TelemetryRibbon.tsx` (Indonesian title + subtitle).
- **Reason**: Missing entries desync the page header from the active tab (historically it silently fell back to the Multi-Node title — a shipped bug).

### G. Secret Masking & Local API Security

- **Rule**: GET responses must never contain raw `auth_token`, `ct0`, proxy credentials, AI API keys, or webhook tokens — mask them via helpers in `server/security.js`. Masked values echoed back on write endpoints are restored from storage automatically.
- **Rule**: Never reintroduce wildcard CORS or non-loopback binding (`config.HOST` defaults to `127.0.0.1`; the Origin/Host guard in `server/security.js` rejects foreign browser requests).

### H. Route Validation & Error Handling

- **Rule**: All mutating routers validate `req.body` with a zod schema via `validateBody(schema)` from `server/utils/http.js`. Handlers may throw `httpError(status, message, code)` — Express 5 forwards everything to the centralized error handler in `server/index.js`. Do not add per-route try/catch boilerplate.

### I. UI Conventions

- **Colors**: primary/execution CTAs use the flame/amber tokens (`variant="default"` or `"execute"`); blue is reserved for informational Reply-vector accents; red for destructive.
- **Language**: operational UI labels are Indonesian; English is kept for technical terms (Feed Hunter, Spintax, Fleet, Webhook).
- **Data hydration**: datasets rendered from the store need a `*Hydrated` flag; render `Skeleton` placeholders until the first fetch completes so empty states never flash falsely.
- **Version**: never hardcode version strings in components — import `__APP_VERSION__` (injected from `package.json` by `client/vite.config.ts`).

---

## 🔍 3. Common Code Patterns

### Adding a New Cockpit Tab:

1. Create `client/src/components/cockpit/NewDeck.tsx`.
2. Add a nav item to `NAV_ITEMS` in `NavDeck.tsx`.
3. Add the tab to `VALID_TABS` in `App.tsx` **and** its render branch.
4. Add a `TAB_TITLES` entry in `TelemetryRibbon.tsx` (Indonesian title + subtitle) — required, see rule F.
5. Optionally add a URL slug alias in `matchSectorName` in `useStore.ts`.
6. Add state and fetcher in `useStore.ts` and `apiClient.ts`; if the deck renders a fetched dataset, add a hydration flag and render `Skeleton` placeholders during first load.
7. Add backend endpoints behind a zod schema (`server/utils/http.js`) and mask any secrets in GET responses (`server/security.js`).

### Triggering Realtime Log Messages:

```javascript
const logger = require('./logger');

logger.info('ℹ️ Informational message');
logger.action('👤 Active node action');
logger.success('✅ Success status message');
logger.warn('⚠️ Warning or delay status');
logger.error('❌ Error or failure message');
```

_Note: All `logger` calls are automatically broadcasted in real-time to the frontend terminal stream via Server-Sent Events (`/api/logs/stream`)._

### Triggering Instant Webhook Alerts:

```javascript
const notifier = require('./notifier');

notifier.notify('POST_PUBLISHED', {
  accountName: 'Node 1',
  text: 'Tweet content',
  tweetUrl: 'https://x.com/user/status/123',
});
```

---

## 📊 4. Git & Repository Etiquette

- Commit with concise, conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`.
- Ensure all temporary directories (`data/media/`, `data/schedules.json`, `dist/`) remain in `.gitignore`.
- Never commit `tsc -b` build artifacts (`client/vite.config.js`, `client/vite.config.d.ts`, `*.tsbuildinfo`) — they are gitignored; regenerate locally via the build.
