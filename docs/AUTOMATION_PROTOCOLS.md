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
   - Handles sensitive content warnings (*"View"* button) and detects deleted/unavailable posts immediately without hanging.
3. **Multi-Lingual DOM & SVG Signature Fallbacks**:
   - Evaluates standard `data-testid` attributes (`like`, `unlike`, `retweet`) alongside English and Indonesian aria-labels (`Suka`, `Disukai`, `Diposting ulang`).
   - Structural SVG path signatures locate action buttons even when testids and labels are completely obfuscated:
     - **❤️ Heart SVG Signature**: Path string containing `16.697` / `20.884` / `12 4.24`.
     - **🔁 Retweet SVG Signature**: Path string containing `4.5 3.88` / `4.432` / `16.5 6`.
     - **💬 Reply Speech Bubble Signature**: Path string containing `1.751 10` / `8.005`.
4. **Composer Multi-Step Activation & Restrictions**:
   - Detects author-level reply restrictions (*"Who can reply" / "Siapa yang dapat membalas"*) and reports `RESTRICTED` status immediately.
   - Activates inline reply placeholders or clicks the tweet reply icon to mount the contenteditable editor.
   - Supports 12 textarea selectors and dual input strategies (humanized keystrokes with `document.execCommand('insertText')` fallback).

