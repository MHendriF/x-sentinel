# 🤖 AI Agent Coding & Architecture Guide for X-SENTINEL

This document serves as high-context system guidelines for **AI coding assistants and autonomous agents** tasked with developing, refactoring, or extending the **X-SENTINEL** codebase.

---

## 📌 1. Project Identity & Architecture Tenets

- **Name**: X-SENTINEL v3.0
- **Domain**: Multi-Node X (Twitter) Automation Cockpit & Publishing Studio.
- **Runtime**: Bun (Preferred) / Node.js 18+.
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts.
- **Backend**: Express 5 on Node.js / Bun.
- **Automation**: Playwright Chromium (Stealth Mode).
- **Database**: Zero external DB. Atomic JSON Engine (`server/db.js`).

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

---

## 🔍 3. Common Code Patterns

### Adding a New Cockpit Tab:
1. Create `client/src/components/cockpit/NewDeck.tsx`.
2. Add tab identifier to `NavDeck.tsx` and `App.tsx`.
3. Add hash route mapping in `useStore.ts` `getInitialTab` and `VALID_TABS`.
4. Add state and fetcher in `useStore.ts` and `apiClient.ts`.

### Triggering Realtime Log Messages:
```javascript
const logger = require('./logger');

logger.info('ℹ️ Informational message');
logger.action('👤 Active node action');
logger.success('✅ Success status message');
logger.warn('⚠️ Warning or delay status');
logger.error('❌ Error or failure message');
```
*Note: All `logger` calls are automatically broadcasted in real-time to the frontend terminal stream via Server-Sent Events (`/api/logs/stream`).*

### Triggering Instant Webhook Alerts:
```javascript
const notifier = require('./notifier');

notifier.notify('POST_PUBLISHED', {
  accountName: 'Node 1',
  text: 'Tweet content',
  tweetUrl: 'https://x.com/user/status/123'
});
```

---

## 📊 4. Git & Repository Etiquette
- Commit with concise, conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`.
- Ensure all temporary directories (`data/media/`, `data/schedules.json`, `dist/`) remain in `.gitignore`.
