# 📡 X-SENTINEL REST API & SSE Stream Reference

Base URL: `http://localhost:3000/api`

All JSON requests should include the header `Content-Type: application/json`.

## 🔒 Security Model (v1.3.1+)

- The server binds to `127.0.0.1` only and rejects any request whose `Origin` or `Host` header is not the local dashboard (anti drive-by exfiltration & DNS rebinding). There is no CORS wildcard.
- **Secret masking**: GET responses never contain raw `auth_token`, `ct0`, proxy credentials, AI API keys, or webhook tokens — they are returned as `••••xxxx`. Echoing a masked value back on POST/PUT is safe: the server restores the stored original. Send a fresh raw value to replace a secret.
- **Endpoint exceptions**: `GET /api/accounts/export` (fleet backup download) intentionally contains raw session cookies — it is a full backup file.

---

## 📑 Table of Contents

1. [System Status & Telemetry](#1-system-status--telemetry)
2. [Multi-Node Account Management](#2-multi-node-account-management)
3. [Fleet Health & Session Validation](#3-fleet-health--session-validation)
4. [Account Warm-up Protocol](#4-account-warm-up-protocol)
5. [Engagement & Publishing Tasks](#5-engagement--publishing-tasks)
6. [AI Post Studio & Contextual Inference](#6-ai-post-studio--contextual-inference)
7. [Cron Scheduler & Post Queue](#7-cron-scheduler--post-queue)
8. [Media & Image Uploads](#8-media--image-uploads)
9. [Webhooks & Settings](#9-webhooks--settings)
10. [Audit Ledger & Maintenance](#10-audit-ledger--maintenance)
11. [Proxy & Spintax Utilities](#11-proxy--spintax-utilities)

---

## 1. System Status & Telemetry

### `GET /api/status`

Returns current automation runner state, active task progress, and system statistics.

**Response (200 OK):**

```json
{
  "success": true,
  "isRunning": false,
  "currentTask": null,
  "accounts": [...],
  "activeAccountsCount": 5,
  "stats": {
    "totalLikes": 142,
    "totalRetweets": 38,
    "totalComments": 51,
    "totalPosts": 19,
    "todayLikes": 14,
    "todayRetweets": 4,
    "todayComments": 6,
    "todayPosts": 2
  }
}
```

### `GET /api/logs/stream` (SSE)

Establishes a Server-Sent Events stream for real-time log messages.

**Event Format:**

```
data: {"id":"1724749200000","timestamp":"16:07:53","level":"success","message":"Berhasil memposting tweet..."}
```

---

## 2. Multi-Node Account Management

### `GET /api/accounts`

Lists all registered node accounts. `auth_token` / `ct0` / `proxy` credentials are **masked** (`••••`).

### `POST /api/accounts`

Registers a new node account.

**Request Body:**

```json
{
  "label": "Alpha Trader Node",
  "auth_token": "a1b2c3d4e5f6...",
  "ct0": "f6e5d4c3b2a1...",
  "proxy": "user:pass@123.45.67.89:8080"
}
```

### `PUT /api/accounts/:id`

Updates an existing node account configuration.

### `DELETE /api/accounts/:id`

Deletes a node account.

### `POST /api/accounts/:id/toggle`

Toggles account status between enabled (`ONLINE`) and paused (`PAUSED`).

### `POST /api/accounts/bulk-import`

Imports multiple accounts via multi-line text or JSON array. Duplicate `auth_token` values are skipped.

**Request Body:**

```json
{
  "rawText": "token1:ct0_1:proxy1:Node 1\ntoken2:ct0_2:proxy2:Node 2"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "addedCount": 2,
  "importedCount": 2,
  "total": 7,
  "accounts": ["...masked account list..."]
}
```

Supported per-line formats: `auth_token:ct0:proxy:Label`, `auth_token:ct0:Label`, `auth_token:ct0:proxy`, `auth_token|ct0|proxy|Label`, `#` comment lines, or a JSON array of `{ auth_token, ct0, proxy, label }` objects.

### `GET /api/accounts/export`

Downloads a JSON backup file of all registered accounts.

---

## 3. Fleet Health & Session Validation

### `POST /api/accounts/check-health`

Runs a mass validation check on all registered accounts (checks proxy alive + probes X home page).

**Response (200 OK):**

```json
{
  "success": true,
  "total": 5,
  "healthy": 4,
  "results": [
    {
      "accountId": "acc_1",
      "label": "Node 1",
      "success": true,
      "healthStatus": "HEALTHY",
      "username": "cryptonative",
      "message": "Sesi aktif dan terverifikasi sehat!"
    }
  ]
}
```

### `POST /api/accounts/:id/check-health`

Checks health and session validity of a specific node.

### `POST /api/accounts/:id/test-proxy`

Runs a live latency & GeoIP test against this node's configured proxy.

**Response (200 OK):**

```json
{
  "success": true,
  "latency": 240,
  "ip": "31.56.70.92",
  "country": "Iran",
  "city": "Tehran",
  "isp": "TIC",
  "status": "ALIVE"
}
```

A dead proxy returns `200` with `success: false`, `status: "DEAD"` and a human-readable `message`; a node without a configured proxy returns `400`.

---

## 4. Account Warm-up Protocol

### `POST /api/accounts/:id/warmup`

Triggers an automated warmup routine (timeline browsing and organic likes based on `warmupDay` 1-7).

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Memulai rutinitas pemanasan untuk @cryptonative (Hari 1/7)..."
}
```

---

## 5. Engagement & Publishing Tasks

### `POST /api/tasks/post`

Publishes a post or broadcasts unique posts across target accounts.

**Request Body:**

```json
{
  "accountIds": "all",
  "posts": ["First tweet content", "Second unique variation"],
  "delaySeconds": 15,
  "mediaPaths": ["D:\\Work\\projects\\x-sentinel\\data\\media\\1724749_chart.png"]
}
```

### `POST /api/tasks/batch`

Executes targeted engagement on a batch of tweet URLs.

**Request Body:**

```json
{
  "urls": ["https://x.com/elonmusk/status/1890000000000000000"],
  "vectors": ["LIKE", "RETWEET", "COMMENT"],
  "replyMatrix": {
    "topic": "Solana Velocity",
    "replies": ["Great insight!", "Bullish on this development!"]
  },
  "delaySeconds": 20
}
```

### `POST /api/tasks/hunter`

Executes autonomous Feed Hunter keyword search and engagement.

**Request Body:**

```json
{
  "keywords": ["solana defi", "arbitrum l2"],
  "vectors": ["LIKE", "RETWEET", "COMMENT"],
  "maxTweets": 5,
  "delaySeconds": 15
}
```

### `POST /api/tasks/stop`

Sends an abort signal to terminate any active automation task immediately.

---

## 6. AI Post Studio & Contextual Inference

### `POST /api/ai/generate-post`

Generates high-engagement X posts based on a topic and persona style.

**Request Body:**

```json
{
  "keyword": "Solana throughput and Firedancer",
  "style": "viral_hook",
  "language": "en",
  "count": 3,
  "customPrompt": "Keep it punchy"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "provider": "Groq (llama-3.3-70b-versatile)",
  "posts": [
    "Most people are sleeping on Firedancer, but 1M TPS changes the entire throughput equation for Solana DeFi."
  ]
}
```

---

## 7. Cron Scheduler & Post Queue

### `GET /api/schedules`

Lists all scheduled post queues and recurring tasks.

### `POST /api/schedules`

Creates or updates a scheduled task.

**Request Body:**

```json
{
  "type": "POST_QUEUE",
  "title": "Crypto Morning Post",
  "scheduledAt": "2026-08-28T09:00:00.000Z",
  "accountIds": "all",
  "posts": ["Scheduled tweet content..."],
  "mediaPaths": [],
  "delaySeconds": 15,
  "enabled": true
}
```

### `DELETE /api/schedules/:id`

Deletes a scheduled task.

### `POST /api/schedules/:id/toggle`

Toggles active state of a scheduled task.

---

## 8. Media & Image Uploads

### `POST /api/media/upload`

Uploads an image file (Base64) to the server's local storage (`data/media/`).

**Request Body:**

```json
{
  "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "filename": "chart.png"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "filename": "1724749000_chart.png",
  "localPath": "d:\\Work\\projects\\x-sentinel\\data\\media\\1724749000_chart.png",
  "sizeKb": "142.5"
}
```

---

## 9. Webhooks & Settings

### `GET /api/settings`

Retrieves defense and webhook settings.

### `POST /api/settings`

Saves updated defense protocol and webhook settings.

### `POST /api/settings/test-webhook`

Sends a test notification to Telegram or Discord. Masked token values (`••••…`) are automatically restored from stored settings.

**Request Body:**

```json
{
  "type": "telegram",
  "telegramBotToken": "123456789:ABC...",
  "telegramChatId": "987654321"
}
```

### `POST /api/settings/test-ai`

Quick provider connectivity & credential check. If `aiApiKey` is masked, the stored key is used.

**Request Body:**

```json
{
  "aiProvider": "groq",
  "aiApiKey": "gsk_...",
  "aiModel": "llama-3.3-70b-versatile"
}
```

### `POST /api/settings/generate-ai-test`

Renders one live contextual AI reply for a sample tweet using the given provider overrides.

**Request Body:**

```json
{
  "tweetText": "Just shipped a new feature...",
  "aiProvider": "groq",
  "aiApiKey": "gsk_...",
  "aiPrompt": "Be concise"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Balasan AI berhasil dirender.",
  "sampleOutput": "Solid progress — the interesting part is ..."
}
```

### `GET /api/templates` / `POST /api/templates`

Read / save the global spintax template bank (also aliased as `GET/POST /api/comments`). POST body: `{ "templates": ["{Keren|Mantap} banget!", "..."] }`.

---

## 10. Audit Ledger & Maintenance

### `GET /api/history?limit=100`

Retrieves engagement history records and cumulative stats.

### `POST /api/history/prune`

Prunes interaction history records based on age or status.

**Request Body:**

```json
{
  "olderThanDays": 30,
  "status": "FAILED"
}
```

### `POST /api/history/clear-all`

Clears 100% of interaction audit history records.

---

## 11. Proxy & Spintax Utilities

### `POST /api/proxy/test`

Performs a live latency and GeoIP ping check for any proxy string.

**Request Body:**

```json
{
  "proxy": "user:pass@123.45.67.89:8080"
}
```

### `POST /api/spintax/preview`

Generates live permutations for a Spintax string.

**Request Body:**

```json
{
  "text": "{Keren|Mantap|Luar biasa} {banget|sekali}!",
  "count": 3
}
```
