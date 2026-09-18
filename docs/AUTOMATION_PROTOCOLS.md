# 🛡️ X-SENTINEL Automation Protocols & Stealth Hardening

This document explains the security, anti-ban mechanisms, session management, and browser automation protocols employed by **X-SENTINEL**.

---

## 🔒 1. Zero-Password Session Architecture

X-SENTINEL avoids fragile and risky username/password logins. Instead, it utilizes direct session cookie injection:

1. **`auth_token`**: Primary authentication cookie representing the authenticated session in X.
2. **`ct0`**: CSRF protection token required for valid API mutations and state operations.

### Cookie Injection Mechanism (`server/automation/cookieManager.js`)

When a node begins an automated task:

- An isolated Chromium `BrowserContext` is instantiated.
- Cookies are formatted with appropriate `domain: ".x.com"`, `path: "/"`, `secure: true`, and `sameSite: "Lax"`.
- Injected via `await context.addCookies(cookies)` prior to any navigation.

---

## 🕵️ 2. Stealth Evasion & Browser Spoofing

X (Twitter) utilizes sophisticated client-side fingerprinting. X-SENTINEL counters this through multiple stealth layers:

### A. Webdriver & Navigator Shielding

Every new page applies an initialization script before DOM content loads:

```javascript
await context.addInitScript(() => {
  // 1. Mask navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 2. Mock plugins & languages
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'id'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

  // 3. WebGL Vendor & Renderer Spoofing
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (parameter) {
    if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
    if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
    return getParameter.apply(this, arguments);
  };
});
```

### B. Per-Node Dedicated Proxy Isolation

- Each account node routes traffic exclusively through its configured proxy server (`http`, `https`, or `socks5`).
- If an account has no proxy, it connects directly.
- **Auto-Pause on Proxy Failure**: If a proxy becomes unreachable, the node is immediately paused to prevent leaking the host's direct residential/datacenter IP address.

---

## ⏱️ 3. Human Cadence & Behavioral Emulation

Automated scripts that type at constant speeds or click instantly are easily flagged. X-SENTINEL enforces humanized execution:

1. **Human Typing Simulation (`humanType`)**:
   - Types character by character with randomized keypress delays ($25\text{ms} - 90\text{ms}$).
   - Occasional pauses before punctuation ($150\text{ms} - 300\text{ms}$).
2. **Randomized Action Delays (`randomDelay`)**:
   - Enforces configurable minimum and maximum delays (e.g., $15\text{s} - 35\text{s}$) between interactions.
3. **Natural Timeline Scrolling**:
   - Random wheel scrolling with velocity variation prior to interaction.
4. **Node Switch Cooldown**:
   - Delays ($10\text{s} - 30\text{s}$) when rotating to the next account node to emulate independent user sessions.

---

## 🐣 4. Account Warm-up Protocol

New or dormant accounts that immediately blast dozens of tweets are subject to shadowbans or account locks. The Warm-up Protocol gradually establishes trust:

| Warmup Day | Permitted Activities                                    | Target Actions                         |
| :--------- | :------------------------------------------------------ | :------------------------------------- |
| **Day 1**  | Timeline browsing, mouse scrolling ($30-60\text{s}$)    | $2-3$ organic likes                    |
| **Day 2**  | Timeline browsing, reading feeds                        | $3-5$ organic likes, $1$ retweet       |
| **Day 3**  | Timeline browsing, keyword search                       | $5-7$ likes, $1-2$ retweets            |
| **Day 4**  | Timeline browsing + 1 manual comment                    | $6-8$ likes, $2$ retweets, $1$ comment |
| **Day 5+** | Full automation enabled (Fleet Publisher / Feed Hunter) | Standard operational quotas            |

---

## 🔗 5. GraphQL Response Interception for Tweet URLs

When publishing a post, Twitter generates dynamic alphanumeric IDs (`rest_id`). X-SENTINEL intercepts the background GraphQL mutation response (`CreateTweet`):

```javascript
page.on('response', async (response) => {
  if (response.url().includes('CreateTweet') || response.url().includes('/graphql/')) {
    const json = await response.json().catch(() => null);
    const tweetId = json?.data?.create_tweet?.tweet_results?.result?.rest_id;
    if (tweetId) {
      capturedTweetUrl = `https://x.com/${account.username}/status/${tweetId}`;
    }
  }
});
```

This ensures every published tweet has an exact clickable status link stored in `history.json` and sent via webhooks.

---

## ⏰ 6. Cron Scheduler & Background Execution Loop

- Managed by `server/automation/scheduler.js`.
- Evaluates `data/schedules.json` every 15 seconds.
- Checks if `twitterBot.isRunning` is `false` before acquiring execution locks.
- Automatically handles `POST_QUEUE` and `RECURRING_HUNTER` triggers.
- Dispatches webhook alerts upon task completion or unexpected failure.

---

## 🦊 7. Dual Browser Engine Architecture (Chromium & Camoufox Anti-Detect)

X-SENTINEL features a switchable dual-engine runtime architecture (`server/automation/bot/browserFactory.js`):

### A. Chromium Core (Standard)

- Built on standard Playwright Chromium.
- Enhanced with client-side stealth overrides: masking `navigator.webdriver`, mocking `window.chrome`, realistic hardware concurrency/memory, WebGL GPU vendor/renderer spoofing, and disabled WebRTC non-proxied UDP.
- Fast startup times, low footprint, and ideal for standard automation environments.

### B. Camoufox Stealth (C++ Modified Firefox)

- Built on **Camoufox** (`camoufox@0.1.19`), a custom C++ stealth Firefox browser specifically engineered to resist modern browser fingerprinting and bot probes.
- **Native C++ Mouse Trajectory Humanization (`humanize: 0.5`)**: All Playwright pointer events and clicks are mapped to biological human Bezier curves with micro-jitter at the browser engine level, evading behavioral ML detectors.
- **WebRTC STUN Leak Protection (`block_webrtc: Boolean(account.proxy)`)**: Prevents WebRTC STUN requests from bypassing proxy tunnels and exposing the host machine's residential/datacenter IP address.
- **Dynamic Timezone & Locale Matching**: Context timezone is resolved dynamically from the host environment or allowed to follow proxy network headers without hardcoded city overrides, preventing IP vs client timezone mismatch flags.
- **Viewport Protocol Compliance (`viewport: null`)**: Configured to let Camoufox handle screen geometry spoofing natively without triggering Playwright Juggler protocol schema errors.
- **Process Tree Watchdog on Windows**: Cleanly terminates Firefox content subprocesses (`taskkill /pid ${pid} /T /F`) during abrupt task teardown to eliminate background zombie processes.
- **Transparent Fallback**: If Camoufox encounters an OS-level binary incompatibility, `launchAccountBrowser` logs a warning and transparently falls back to Chromium so active automation batches continue uninterrupted.

---

## 🎯 8. Resilient Multi-Layer Engagement Vectors (Like, Repost, Reply)

The interaction engine (`server/automation/bot/interactionEngine.js`) employs multi-layer fallback strategies to prevent selector timeouts or false-negative failures on dynamic X web interfaces:

1. **Canonical URL Normalization**:
   - Strips lightbox modal segments (`/photo/1`, `/video/1`) and tracking query parameters (`?s=20&t=xyz`).
   - Normalizes URLs to `https://x.com/i/status/${tweetId}` to guarantee deterministic page layouts.
2. **Interstitials & Overlay Auto-Dismissal**:
   - Automatically dismisses cookie consent dialogs, bottom sheets, and promotional modals.
   - Handles sensitive content warnings (_"View"_ button) and detects deleted/unavailable posts immediately without hanging.
3. **Multi-Lingual DOM & SVG Signature Fallbacks**:
   - Evaluates standard `data-testid` attributes (`like`, `unlike`, `retweet`) alongside English and Indonesian aria-labels (`Suka`, `Disukai`, `Diposting ulang`).
   - Structural SVG path signatures locate action buttons even when testids and labels are completely obfuscated:
     - **❤️ Heart SVG Signature**: Path string containing `16.697` / `20.884` / `12 4.24`.
     - **🔁 Retweet SVG Signature**: Path string containing `4.5 3.88` / `4.432` / `16.5 6`.
     - **💬 Reply Speech Bubble Signature**: Path string containing `1.751 10` / `8.005`.
4. **Composer Multi-Step Activation & Restrictions**:
   - Detects author-level reply restrictions (_"Who can reply" / "Siapa yang dapat membalas"_) and reports `RESTRICTED` status immediately.
   - Activates inline reply placeholders or clicks the tweet reply icon to mount the contenteditable editor.
   - Supports 12 textarea selectors and dual input strategies (humanized keystrokes with `document.execCommand('insertText')` fallback).

---

## 🛡️ 9. Driver Resilience & Playwright Location Crash Guard

Target web pages frequently run third-party telemetry scripts or ads that emit unhandled window errors lacking source location stacks. In upstream Playwright Core (`playwright-core/lib/coreBundle.js`), reading `pageError.location.url` caused fatal process crashes: `TypeError: Cannot read properties of undefined (reading 'url')`.

### Automated Driver Patch (`server/automation/bot/patchPlaywright.js`)

X-SENTINEL executes an automatic patch during `postinstall` (and server startup fallback):

```javascript
// Upstream vulnerable line in playwright-core/lib/coreBundle.js:
// url: pageError.location.url

// Patched resilient line:
// url: pageError.location?.url || ''
```

- **Runtime Verification**: `node test/verify_url_resilience.js` tests both driver patch integrity and URL edge cases (`null`, `undefined`, lightbox paths `/photo/1`, and legacy `twitter.com` status parameters).
- **Graceful Error Handling**: Even when target pages execute malformed scripts, the automation loop intercepts and ignores non-fatal page exceptions without terminating the batch runner.

---

## 🚀 10. Staggered Fleet Broadcasting & Anti-Burst Timing

Simultaneous post publishing across dozens of nodes from the same host or proxy subnet triggers immediate behavioral velocity alerts on Twitter. X-SENTINEL implements staggered cadence:

1. **Inter-Node Jitter Delays**:
   - Post Studio fleet dispatcher enforces a configurable inter-account rotation delay ($5\text{s} - 60\text{s}$, default $10\text{s}$).
   - Injects a $\pm 20\%$ micro-jitter to prevent periodic clock detection.
2. **Draft Variation Distribution**:
   - Distributes distinct draft items from the generated variations deck or **Drafts Stash Drawer** to each active node.
   - Eliminates duplicate content penalties across node clusters.
3. **Atomic Task Queue Execution**:
   - Tasks queued via Cron Scheduler evaluate concurrency locks (`twitterBot.isRunning === false`) before executing sequentially, ensuring no two automation routines compete for browser context resources.

---

## 🦊 11. Camoufox Persistent Profiles & Profile Lifecycle

To eliminate repetitive identity verification checks and session invalidation caused by spinning up fresh browser contexts, X-SENTINEL supports **node-isolated persistent profiles** for Camoufox:

### A. Directory Isolation

- Each account node with a persistent profile stores its browser state in `data/camoufox_profiles/<accountId>/`.
- Isolates cookies, `localStorage`, `IndexedDB`, session storage, and cache partitions per node account.
- Configured through `camoufoxLoginManager.js` and initialized dynamically during browser launch.

### B. Auto-Routing for Health & Verification

- When executing health checks or verification routines, nodes configured with persistent Camoufox profiles are automatically routed to the Camoufox engine regardless of global default settings, preventing session collisions between Chromium and Firefox engines.

### C. 1-Click Session Reset

- If a browser session becomes desynchronized or corrupted, the operator can trigger a clean profile reset via `ResetCamoufoxDialog.tsx` or `DELETE /api/accounts/:id/camoufox-profile`.
- The reset purges `data/camoufox_profiles/<accountId>/` while preserving account credentials (`auth_token`, `ct0`, proxy configuration) and audit history intact.

---

## 🛑 12. Rate Limit (Error 344 & 185) & Anti-Automation Defense

X-SENTINEL actively intercepts background network responses and DOM overlays to prevent burning accounts when rate limits or challenge walls are encountered:

### A. GraphQL Error Code Interception

During engagement tasks (`CreateRetweet`, `CreateTweet`, `FavoriteTweet`), `interactionEngine.js` intercepts raw GraphQL response codes:

- **Error 344**: Daily Tweet Limit reached (`isDailyLimit: true`). Halts further publishing actions on the node immediately.
- **Error 185**: User is over daily status update limit.
- **Error 226**: Anti-automation flag (`isAutomated: true`).
- **Error 327 / 139**: Already Retweeted / Already Liked (`isAlreadyDone: true`). Handled idempotently without counting as failures.
- **Error 385**: Target post author has restricted replies.

### B. DOM Challenge & Toast Detection

- **Challenge Modal Interception**: Identifies "Add a phone / Daily limit" modal dialogs on X web interfaces, logging a clear warning and halting tasks before account locking escalates.
- **Toast Alert Monitoring**: Scans for anti-automation toast notifications in multiple languages (_"This request looks like it might be automated" / "Permintaan ini tampaknya diotomatiskan"_).

---

## ⌨️ 13. Lexical Editor Typing & Modal-Scoped Reply Submission

Modern X web interfaces use Meta's Lexical contenteditable framework, which frequently desynchronizes when standard `element.type()` methods simulate keystrokes.

### A. Single-Focus `page.keyboard` Typing

- In `humanCadence.js`, `humanType` focuses the target input element once and routes subsequent keystrokes strictly through `page.keyboard.type(char)`.
- Prevents focus bounce, cursor resets, and dropped characters during humanized typing delays ($25\text{ms} - 90\text{ms}$).

### B. Scoped Submit Button Targeting

- Reply submission buttons are strictly scoped to the active modal dialog container (`[role="dialog"] [data-testid="tweetButton"]`) or thread inline container.
- Eliminates misfired clicks against hidden or background feed tweet buttons.

### C. Keystroke State Verification & Recovery

- Verifies that the submit button's `aria-disabled` attribute transitions to `"false"`.
- If Lexical fails to recognize typed text due to delayed state reconciliation, recovery keystrokes (space + backspace) are applied to force the DOM to synchronize before clicking.

### D. History Engine Tracking

- The active browser engine (`chromium` or `camoufox`) is tagged in every recorded interaction event in `history.json` (`browser_engine` field) for comprehensive forensic auditing.
