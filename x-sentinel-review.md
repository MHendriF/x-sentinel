# X-SENTINEL — Code Review & Anti-Restriction Hardening

| | |
|---|---|
| **Target** | `github.com/MHendriF/x-sentinel` @ `main` (v1.3.5) |
| **Fokus** | Mengapa pemakaian program memicu *"account is temporarily restricted"* — dan apa yang harus diubah |
| **Disiapkan untuk** | Hendri Febriansyah |
| **Disiapkan oleh** | BazzB |
| **Tanggal** | 16 Oktober 2026 |
| **Scope review** | `server/automation/**`, `server/config.js`, `server/db.js`, `server/routes/**`, `client/src/components/cockpit/**`, hygiene `data/` |
| **Metode** | Static full-source review + grep-based evidence (setiap klaim di dokumen ini punya lokasi `file:line`) |

---

## 0. Executive Summary

Arsitekturnya bagus — modular, engine stealth dua lapis, audit ledger, telemetry. **Masalahnya bukan di fitur, tapi di absennya satu komponen: enforcement layer.**

Saat ini X-SENTINEL **mendeteksi** limit (error 344/185/226 sudah diparsing di `interactionEngine.js:169-193`) tetapi **tidak menindaklanjutinya**. Tidak ada ledger budget per-account, tidak ada cooldown, tidak ada quarantine. Setelah sebuah node kena soft-block, bot tetap melanjutkan ke target berikutnya dalam hitungan detik.

> **Diagnosis inti: sistem ini pandai membaca sinyal bahaya, tapi tidak punya saraf motorik untuk berhenti.**

Lima penyebab terbesar, berurutan berdasarkan dampak:

1. **`hourlyLimit` / `dailyLimit` didefinisikan lengkap di 4 tempat tapi NOL pemakaian di runtime.** Guard paling dasar tidak pernah jalan.
2. **`AUTOMATED_FLAG` dikembalikan oleh `processTweetWithAccount()` tapi tidak pernah dibaca oleh orchestrator** (`grep` = 0 hit di `twitterBot.js`). Node yang sudah di-flag tetap dipakai.
3. **Tidak ada cooldown / strike ledger per-account.** Soft-limit yang seharusnya sembuh dalam 15 menit berubah menjadi restriction berjam-jam karena di-poke berulang.
4. **Vector stacking terlalu rapat** — like + repost + reply ke tweet yang sama dalam ~5-9 detik (`interactionEngine.js:2117`, `2136`).
5. **Fingerprint Chromium kontradiksi diri sendiri** — UA klaim Windows 10 tapi `navigator.platform` / `navigator.userAgentData` / Client Hints tidak di-spoof → server lihat platform `Linux`. Mismatch Client Hints adalah sinyal bot paling instan.

Estimasi kerja untuk P0: **±6-10 jam developer**. Dampak: mengubah X-SENTINEL dari "harus dipantau manual tiap kali batch" menjadi "aman ditinggal".

---

## 1. Temuan Akar Masalah

### RC-01 — `hourlyLimit` & `dailyLimit` tidak pernah di-enforce
**Severity: Critical**

**Lokasi:**
- `server/config.js:71-72` → `hourlyLimit: 25`, `dailyLimit: 150`
- `server/db.js:53-54` → di-seed ke store settings
- `server/routes/settingsRouter.js:54-55` → divalidasi (cap sampai `1000` / `10000`)
- `client/src/components/cockpit/DefenseProtocol.tsx:37-41, 193-194` → ditampilkan di UI sebagai slider penuh

**Bukti:** `grep -rn "hourlyLimit\|dailyLimit" server/automation/` → **nol hasil**.

**Dampak:** operator men-set 25 aksi/jam, bot jalan tanpa batas. Ini mekanisme tunggal yang paling bertanggung jawab atas rate-limit 344/185. Selain itu, UI menciptakan **false sense of safety** — operator merasa sudah mengamankan akun padahal tidak ada satu baris kode pun yang membaca nilainya. Ini juga bug UX, bukan cuma bug logic.

**Rekomendasi:** implementasi `rateGovernor.js` (lihat §2.1) dan hapus ketergantungan pada field yang tidak fungsional sampai governor terpasang.

---

### RC-02 — `AUTOMATED_FLAG` dilempar, lalu dibuang
**Severity: Critical**

**Lokasi:**
- `server/automation/bot/interactionEngine.js:2106-2113` — `processTweetWithAccount()` membaca `results.like.status === 'AUTOMATED_FLAG'` dan menghentikan vector berikutnya *untuk tweet itu saja*
- `server/automation/bot/interactionEngine.js:2125-2133` — logika serupa untuk vector retweet
- `server/automation/twitterBot.js:554-566` (`runMultiAccountBatchTask`) dan `:761` (`runMultiAccountHunter`) — **nilai balik `processTweetWithAccount()` tidak diperiksa**

**Bukti:** `grep -n "AUTOMATED_FLAG\|DAILY_LIMIT_EXCEEDED" server/automation/twitterBot.js` → **nol hasil**.

**Dampak:** node yang baru saja ditolak X (kode 226 = "automated behavior") dipakai lagi untuk URL berikutnya setelah `accountSwitchDelaySec` (10 detik). Pola "poked while flagged" inilah yang mengeskalasi soft-block menjadi **"account is temporarily restricted"**. Logika di `interactionEngine.js` sudah benar — hanya saja tidak ada yang mendengarkannya.

**Rekomendasi:** lihat §2.3.

---

### RC-03 — Tidak ada cooldown, strike, atau quarantine ledger per-account
**Severity: Critical**

**Lokasi:** skema account (`data/accounts.example.json`, `server/db.js:266`) hanya punya `stats`, `warmupDay`, `lastChecked`, `isValid`. Tidak ada field state waktu.

**Bukti:** `grep -rn "cooldownUntil\|rateLimitUntil\|circuitBreaker\|pauseAccount\|strikes" server/` → **nol hasil**.

**Dampak:**
- Tidak ada memori lintas-task. Node bisa kena 226 di batch pagi, lalu ikut batch siang tanpa penalti.
- Tidak ada eskalasi. Pelanggaran ke-1 dan ke-5 mendapat perlakuan identik.
- Tidak ada auto-disable. Node yang sudah jelas bermasalah tetap masuk antrean "1-click bulk health check" dan "Fleet Dispatcher".

**Rekomendasi:** §2.1 + §2.2.

---

### RC-04 — Vector stacking: like + RT + reply dalam ±5-9 detik
**Severity: High**

**Lokasi:**
- `server/automation/bot/interactionEngine.js:2117` → `sleep(2000 + rand(2000))` antara LIKE → RETWEET
- `server/automation/bot/interactionEngine.js:2136` → `sleep(2500 + rand(2000))` antara RETWEET → REPLY

**Dampak:** tiga aksi berbeda pada satu tweet dalam rentang < 10 detik, dari satu akun, berulang di setiap target. Distribusi manusia untuk pola ini mendekati nol. Ditambah `grep getHours` → 0 hasil, artinya tidak ada modulasi jam sama sekali; aktivitas berjalan metronomik 24 jam.

**Rekomendasi:** naikkan jeda antar-vector ke **45-180 detik** (distribusi Gaussian, bukan uniform) dan pindahkan kendali jeda ke `rateGovernor.interVectorDelay()`. Jeda 45-180 detik tidak menurunkan throughput nyata karena bottleneck sebenarnya ada di quota harian, bukan di kecepatan per-target.

---

### RC-05 — Node rotation pakai delay fixed 10 detik tanpa jitter
**Severity: High**

**Lokasi:**
- `server/automation/twitterBot.js:605` dan `:796` → `db.getSettings().accountSwitchDelaySec || 10`
- `server/db.js:52` → default `accountSwitchDelaySec: 10`
- `server/automation/twitterBot.js:620`, `:806` → `randomDelay(options.minDelay, options.maxDelay)` — jeda antar-URL, tapi hanya di loop terluar

**Dampak:** konsekuensi aritmetiknya fatal. Dengan 10 node dan mode batch (loop URL di luar, loop account di dalam), **satu tweet yang sama akan di-engage oleh 10 akun dalam ±100 detik**. Itu pola *coordinated inauthentic behavior* yang paling mudah terdeteksi — tidak butuh ML, cukup hitung berapa akun menyentuh satu objek dalam satu jendela waktu. Ini lebih berbahaya daripada rate-limit per-akun, karena penaltinya bisa ke seluruh fleet sekaligus.

**Rekomendasi:** §2.5 (jitter + target lock).

---

### RC-06 — Fingerprint Chromium tidak konsisten (Windows UA, platform Linux)
**Severity: Critical**

**Lokasi & bukti:**
- `server/automation/bot/browserFactory.js:115-120` → `userAgent: config.USER_AGENT` + `locale: 'en-US'` + `timezoneId: 'Asia/Jakarta'`
- `server/config.js:80-81` → UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/126.0.0.0`
- `grep -rn "userAgentData\|navigator.platform\|sec-ch-ua" server/automation/bot/browserFactory.js` → **hanya ketemu `process.platform` (line 285)**

**Dampak:** ini yang paling sering saya lihat menyebabkan flag instan pada setup Playwright vanilla. UA string mengklaim Windows, tetapi:
- `navigator.platform` → `"Linux x86_64"`
- `navigator.userAgentData.platform` → `"Linux"`
- header `sec-ch-ua-platform` → `"Linux"`

Satu permintaan HTTP pertama sudah membawa kontradiksi. Tidak perlu perilaku bot untuk memicu restriction — fingerprint inkonsisten saja cukup.

Tambahan artefak di fungsi yang sama (`browserFactory.js:17-81`):
- `:58-59` → `hardwareConcurrency: 8` dan `deviceMemory: 8` **hardcoded**
- `:61-70` → WebGL di-spoof ke `NVIDIA GeForce RTX 3060` **hardcoded**
- `:26-31` → `window.chrome` di-mock dengan `loadTimes()` dan `csi()`, keduanya **sudah dihapus dari Chrome sejak v8x**. Memalsukan API yang sudah tidak ada di Chrome 126 justru menandai diri sendiri.
- `:52-55` → `navigator.languages = ['en-US','en','id']` hardcoded, tapi `locale` = `'en-US'` dan TZ = `Asia/Jakarta` → tidak sinkron dengan IP egress jika proxy dipakai ke negara lain.

**Konsekuensi fleet:** karena semua nilai di atas hardcoded, **seluruh node menghasilkan fingerprint identik**. Sepuluh akun dari satu mesin dengan `hardwareConcurrency: 8`, `deviceMemory: 8`, dan GPU string yang sama persis = cluster yang mudah di-cluster.

**Catatan:** jalur Camoufox justru sudah benar (`browserFactory.js:190-199` — TZ diambil dinamis dari host, dan hanya di-set saat non-proxy). Yang tertinggal adalah jalur Chromium, yang mana merupakan engine default (`config.js:74` → `browserEngine: 'chromium'`).

**Rekomendasi:** §3.1-§3.4.

---

### RC-07 — Injeksi cookie: jar tidak lengkap + duplikat lintas domain
**Severity: High**

**Lokasi:**
- `server/automation/cookieManager.js:26` → `['.x.com', 'x.com', '.twitter.com', 'twitter.com']`
- `server/automation/cookieManager.js:29-51` → hanya `auth_token` dan `ct0` yang di-inject, diulang untuk 4 domain

**Dampak:**
1. **Cookie duplikat.** `auth_token` dan `ct0` yang sama di-inject ke `x.com` **dan** `.x.com` dengan `path: '/'`. Untuk cookie sensitif sesi, ini bukan kondisi normal — browser asli menyimpan satu, host-scoped. Berbagai sistem anti-abuse membaca kondisi ini sebagai **session tampering**.
2. **Jar bolong.** Sesi X yang login normal membawa `twid`, `kdt`, `att`, `guest_id`, `_twitter_sess`, `personalization_id`. Sesi yang punya `auth_token` tapi tanpa `twid`/`kdt` adalah anomali yang gampang dikenali — dan pesan yang keluar persis di sekitar kasus ini adalah varian "temporarily restricted".
3. **Arah arsitektur salah.** Repo ini **sudah punya** persistent Camoufox profile (`data/camoufox_profiles/<account.id>`, lihat `browserFactory.js:162-170`) yang menyimpan seluruh state sesi secara alami. Cookie injection seharusnya jadi fallback terakhir, bukan jalur default.

**Rekomendasi:** §3.5.

---

### RC-08 — `x-rate-limit-*` header tidak pernah dibaca
**Severity: Medium**

**Lokasi:** `server/automation/bot/interactionEngine.js:307-360` (`createActionTracker`) — handler `page.on('response')` hanya memanggil `response.json()`, bukan `response.headers()`.

**Bukti:** `grep -rn "x-rate-limit\|retry-after" server/` → **nol hasil**.

**Dampak:** X mengirimkan `x-rate-limit-limit`, `x-rate-limit-remaining`, dan `x-rate-limit-reset` pada setiap response GraphQL, plus `retry-after` saat throttling. Itu **ground truth** — angka pasti, dari sumber otoritatif. Saat ini bot mengabaikannya dan menebak, sehingga selalu bereaksi setelah penolakan terjadi, bukan sebelumnya.

Ini adalah perbaikan dengan rasio effort/dampak terbaik di seluruh dokumen: kira-kira 20 baris kode.

**Rekomendasi:** §2.4.

---

### RC-09 — Warmup protocol tidak menggerbang apa pun
**Severity: High**

**Lokasi:**
- `server/automation/bot/healthRunner.js:270` → `executeWarmupProtocol()` — menaikkan `warmupDay` setiap run (`:329-334`)
- `grep -rn "warmupDay" server/automation/` → dibaca **hanya** di dalam health runner itu sendiri

**Dampak:** `warmupDay` tersimpan rapi di record account dan tidak pernah dikonsultasikan oleh task runner mana pun. Akun hari-1 yang baru di-import bisa langsung dimasukkan ke batch 20 URL. Seluruh protokol warmup 7 hari yang jadi nilai jual utama README menjadi **dekoratif** — tidak ada satu pun keputusan eksekusi yang bergantung padanya.

**Rekomendasi:** §2.6.

---

## 2. Rekomendasi P0 — Wajib Sebelum Skala Produksi

### 2.1. Buat `server/automation/rateGovernor.js`

Ini komponen yang hilang. Satu sumber kebenaran untuk pertanyaan "node ini boleh aksi sekarang?".

```js
/**
 * X-SENTINEL Rate Governor
 * Persistent per-account action budget, strike ledger, and cooldown gate.
 * Single source of truth for "may this node act right now?".
 */
const db = require('../../db');
const logger = require('../../logger');

const MIN = 60 * 1000;
const HOUR_MS = 60 * MIN;
const DAY_MS = 24 * HOUR_MS;

// X error codes meaning: soft block / quota exhausted / flagged as automated
const FLAG_CODES = new Set([88, 185, 226, 326, 344, 403, 429]);

const QUOTA = {
  hourly: 10,   // total aksi apapun, rolling 60 menit
  daily: 45,    // total aksi apapun, per hari kalender
  // cap per-vector selama warmup (hari 1-7)
  warmup: {
    1: { LIKE: 0, RETWEET: 0, REPLY: 0 },
    2: { LIKE: 0, RETWEET: 0, REPLY: 0 },
    3: { LIKE: 3, RETWEET: 0, REPLY: 0 },
    4: { LIKE: 6, RETWEET: 1, REPLY: 0 },
    5: { LIKE: 8, RETWEET: 2, REPLY: 0 },
    6: { LIKE: 12, RETWEET: 4, REPLY: 1 },
    7: { LIKE: 15, RETWEET: 5, REPLY: 2 },
  },
};

// Strike ke-N => durasi karantina (30m * 2^(N-1), cap 12 jam)
const BASE_COOLDOWN_MS = 30 * MIN;
const MAX_COOLDOWN_MS = 12 * HOUR_MS;
const STRIKE_WINDOW_MS = 24 * HOUR_MS;
const STRIKES_TO_DISABLE = 3;
const DISABLE_MS = 48 * HOUR_MS;

const dayKey = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

/** Gaussian, bukan uniform — manusia itu clustered, bukan spread rata. */
function gauss(median, sd, floor, ceil) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(ceil, Math.max(floor, Math.round(median + z * sd)));
}

class RateGovernor {
  /** Ambil / inisialisasi state waktu pada record account. */
  state(account) {
    if (!account.state || typeof account.state !== 'object') account.state = {};
    const s = account.state;
    if (!Array.isArray(s.windowHourly)) s.windowHourly = [];
    if (typeof s.dayCount !== 'number') s.dayCount = 0;
    if (typeof s.strikes !== 'number') s.strikes = 0;
    if (typeof s.cooldownUntil !== 'number') s.cooldownUntil = 0;
    if (!s.dayByAction || typeof s.dayByAction !== 'object') {
      s.dayByAction = { LIKE: 0, RETWEET: 0, REPLY: 0 };
    }
    if (!s.dayKey) s.dayKey = dayKey();
    return s;
  }

  /** Buang timestamp di luar window + reset counter harian bila ganti hari. */
  prune(account) {
    const s = this.state(account);
    const now = Date.now();
    s.windowHourly = s.windowHourly.filter((t) => now - t < HOUR_MS);
    if (s.dayKey !== dayKey()) {
      s.dayKey = dayKey();
      s.dayCount = 0;
      s.dayByAction = { LIKE: 0, RETWEET: 0, REPLY: 0 };
    }
    // strike dianggap bersih setelah 24 jam tanpa flag baru
    if (s.strikes > 0 && s.lastFlagAt && now - s.lastFlagAt > STRIKE_WINDOW_MS) {
      s.strikes = 0;
    }
    return s;
  }

  /**
   * Gate. Dipanggil SEBELUM setiap aksi.
   * @returns {{allowed: boolean, reason?: string, retryInMs?: number}}
   */
  canAct(account, action) {
    if (!account || account.enabled === false) {
      return { allowed: false, reason: 'NODE_DISABLED' };
    }
    const s = this.prune(account);
    const now = Date.now();

    if (s.cooldownUntil > now) {
      return {
        allowed: false,
        reason: 'COOLDOWN',
        retryInMs: s.cooldownUntil - now,
      };
    }
    if (s.windowHourly.length >= QUOTA.hourly) {
      const oldest = s.windowHourly[0];
      return {
        allowed: false,
        reason: 'HOURLY_QUOTA',
        retryInMs: oldest + HOUR_MS - now,
      };
    }
    if (s.dayCount >= QUOTA.daily) {
      return { allowed: false, reason: 'DAILY_QUOTA' };
    }
    const warmupDay = Number(account.warmupDay) || 1;
    if (warmupDay <= 7) {
      const cap = QUOTA.warmup[warmupDay]?.[action] ?? 0;
      if ((s.dayByAction[action] || 0) >= cap) {
        return { allowed: false, reason: `WARMUP_DAY_${warmupDay}_${action}_CAP` };
      }
    }
    return { allowed: true };
  }

  /** Catat aksi yang berhasil. Panggil SETELAH aksi diterima X. */
  registerAction(account, action) {
    const s = this.prune(account);
    s.windowHourly.push(Date.now());
    s.dayCount += 1;
    s.dayByAction[action] = (s.dayByAction[action] || 0) + 1;
    s.lastActionAt = new Date().toISOString();
    db.saveAccount(account);
  }

  /** Catat flag dari X. Eskalasi cooldown + auto-disable. */
  registerFlag(account, code) {
    if (!FLAG_CODES.has(Number(code))) return null;
    const s = this.prune(account);
    const now = Date.now();

    s.strikes = (s.strikes || 0) + 1;
    s.lastFlagAt = now;
    s.flagCodes = [...(s.flagCodes || []), Number(code)].slice(-10);

    const backoff = Math.min(
      BASE_COOLDOWN_MS * Math.pow(2, s.strikes - 1),
      MAX_COOLDOWN_MS
    );
    s.cooldownUntil = now + backoff;
    let disabled = false;

    if (s.strikes >= STRIKES_TO_DISABLE) {
      account.enabled = false;
      account.disabledUntil = now + DISABLE_MS;
      account.disabledReason = `Auto-quarantine: ${s.strikes} flags in 24h (codes: ${s.flagCodes.join(',')})`;
      disabled = true;
    }

    db.saveAccount(account);
    logger.warn(
      `🛡️ [@${account.username || account.label}] FLAG ${code} — strike ${s.strikes}, ` +
      `cooldown ${(backoff / MIN).toFixed(0)}m${disabled ? ', NODE AUTO-DISABLED 48h' : ''}`
    );
    return { strikes: s.strikes, cooldownMs: backoff, disabled };
  }

  /** Status ringkas untuk UI / audit HUD. */
  snapshot(account) {
    const s = this.prune(account);
    return {
      strikes: s.strikes,
      cooldownUntil: s.cooldownUntil,
      coolingDown: s.cooldownUntil > Date.now(),
      usedThisHour: s.windowHourly.length,
      usedToday: s.dayCount,
      hourlyQuota: QUOTA.hourly,
      dailyQuota: QUOTA.daily,
    };
  }

  // --- pacing helpers: jangan pakai angka fixed lagi ---

  /** Jeda antar-vector pada satu tweet. 45-180s, clustered. */
  interVectorDelay() {
    return gauss(75_000, 30_000, 45_000, 180_000);
  }

  /** Jeda rotasi antar-node. 20-180s, clustered. */
  accountSwitchDelay() {
    return gauss(60_000, 30_000, 20_000, 180_000);
  }

  /** Jeda antar-target. */
  interTargetDelay() {
    return gauss(150_000, 60_000, 60_000, 420_000);
  }
}

module.exports = new RateGovernor();
```

**Cara menyambungkan (4 titik saja):**

```js
// 1) interactionEngine.js — sebelum klik, di likeTweet / retweetTweet / commentTweet
const gov = require('../rateGovernor');
const gate = gov.canAct(account, 'LIKE');
if (!gate.allowed) {
  logger.warn(`⏸️ [@${account.username}] aksi ditahan: ${gate.reason}`);
  return { success: false, status: 'QUOTA_BLOCKED', message: gate.reason };
}
// ... klik ...
gov.registerAction(account, 'LIKE');   // hanya setelah X benar-benar menerima

// 2) interactionEngine.js:2117 & :2136 — ganti sleep fixed
await gov.interVectorDelay() ? await sleep(gov.interVectorDelay(), abortSignal) : null;
// (atau langsung: await sleep(gov.interVectorDelay(), abortSignal);)

// 3) twitterBot.js:605 & :796 — ganti accountSwitchDelaySec fixed
await this.interruptibleSleep(gov.accountSwitchDelay());

// 4) twitterBot.js — evaluasi ulang target lock + cooldown sebelum tiap iterasi akun
if (gov.snapshot(account).coolingDown) continue;
```

---

### 2.2. Quarantine node di level orchestrator, bukan di level vector

**File:** `server/automation/twitterBot.js`

Saat ini `interactionEngine.js` sudah benar menghentikan sisa vector *untuk satu tweet*. Yang kurang: menghentikan sisa **antrean URL** untuk node itu. Tanpa ini, node yang di-flag akan dicoba lagi di target berikutnya setelah 10 detik.

```js
// runMultiAccountBatchTask() ~ line 554 — ganti blok try
try {
  await this.checkPauseState();
  const res = await this.processTweetWithAccount(url, account, {
    ...options,
    commentText: accountSpecificCommentText,
    onAction: (act) => { if (this.currentTask) this.currentTask.currentAction = act; },
  });

  const flagged =
    ['AUTOMATED_FLAG', 'DAILY_LIMIT_EXCEEDED'].includes(res?.like?.status) ||
    ['AUTOMATED_FLAG', 'DAILY_LIMIT_EXCEEDED'].includes(res?.retweet?.status) ||
    res?.comment?.status === 'DAILY_LIMIT_EXCEEDED';

  if (flagged) {
    const code = res?.like?.code || res?.retweet?.code || 226;
    gov.registerFlag(account, code);

    // tandai node ini sebagai terkunci untuk sisa mission
    this.currentTask.quarantined = this.currentTask.quarantined || [];
    this.currentTask.quarantined.push(account.id);

    if (res?.like?.status === 'DAILY_LIMIT_EXCEEDED') {
      notifier.notify('TASK_FAILED', {
        taskType: 'Node quarantined',
        accountName: account.username || account.label,
        error: `Daily limit / phone challenge (${code}). Node dikeluarkan dari antrean.`,
      });
    }
    break; // keluar dari loop akun untuk mission ini
  }

  this.currentTask.completed++;
  if (this.currentTask) this.currentTask.currentAction = 'SUCCESS';
} catch (err) { /* ... tetap seperti semula ... */ }
```

Terapkan pola yang sama di `runMultiAccountHunter` (sekitar `:761`).

---

### 2.3. Baca `x-rate-limit-*` header dan pakai sebagai pacing adaptif

**File:** `server/automation/bot/interactionEngine.js:307` (`createActionTracker`)

Ini perbaikan dengan ROI tertinggi. Kira-kira 20 baris, dan mengubah pacing dari menebak menjadi berbasis data.

```js
function createActionTracker(page, targetAction) {
  let captured = null;
  let rateState = { limit: null, remaining: null, reset: null, retryAfter: null };

  if (!page || typeof page.on !== 'function') {
    return { cleanup: () => {}, getResult: () => null, waitForResult: async () => null };
  }

  const responseHandler = async (response) => {
    try {
      const url = typeof response?.url === 'function' ? response.url() : '';
      if (!url || !url.includes('/graphql/')) return;

      // --- BARU: baca ground truth dari header, bukan tebak-tebakan ---
      const h = typeof response.headers === 'function' ? response.headers() : {};
      if (h['x-rate-limit-remaining'] !== undefined) {
        rateState = {
          limit: Number(h['x-rate-limit-limit']),
          remaining: Number(h['x-rate-limit-remaining']),
          reset: Number(h['x-rate-limit-reset']),
          retryAfter: h['retry-after'] ? Number(h['retry-after']) : null,
        };
        const pct = rateState.limit ? rateState.remaining / rateState.limit : 1;
        if (rateState.remaining === 0) {
          logger.warn(
            `🛑 X rate limit HABIS. Reset dalam ${rateState.reset}s. ` +
            `Node harus diam sampai itu.`
          );
        } else if (pct < 0.2) {
          logger.warn(`⚠️ X rate limit tinggal ${rateState.remaining}/${rateState.limit} — delay harus 3x.`);
        }
      }

      const status = typeof response.status === 'function' ? response.status() : 200;
      const json = await response.json().catch(() => null);
      const parsed = parseGraphQLResponse(url, status, json);
      if (parsed) {
        if (!targetAction || parsed.actionType === targetAction ||
           (targetAction === 'REPLY' && parsed.actionType === 'TWEET')) {
          captured = parsed;
        }
      }
    } catch (e) { /* ignore interceptor errors */ }
  };

  page.on('response', responseHandler);
  return {
    cleanup: () => { /* ... sama seperti semula ... */ },
    getResult: () => captured,
    getRateState: () => rateState,        // <-- baru
    waitForResult: async (timeoutMs = 6000) => { /* ... sama ... */ },
  };
}
```

Lalu di `processTweetWithAccount`, pakai `tracker.getRateState()`:
- `remaining === 0` → jangan `sleep` biasa; tunggu `reset - now + jitter`. Tidak ada gunanya mencoba lebih cepat, dan setiap percobaan sia-sia menambah strike.
- `remaining / limit < 0.2` → kalikan `interVectorDelay()` dengan 3.
- `retry-after` ada → backoff **persis sebesar nilainya**. Jangan mengarang angka sendiri saat server sudah memberi tahu.

---

### 2.4. Target lock — larang fleet menyerbu satu tweet secara bersamaan

**File baru:** `server/automation/targetLock.js` — tabel `{ tweetId: [{ accountId, ts }] }` di store.

Aturan minimal:
- Satu tweet tidak boleh di-engage oleh dua account berbeda dalam **< 20 menit**.
- Untuk mode reply, kunci lebih panjang: **< 90 menit**.
- Selain itu, tiap node maksimum menyerang **1 target per 5-10 menit** (sudah ditangani `interTargetDelay()`).

```js
const lock = require('../targetLock');
const decision = lock.acquire(tweetId, account.id, { kind: 'ENGAGE', ttlMs: 20 * 60 * 1000 });
if (!decision.ok) {
  logger.info(
    `🔒 Target ${tweetId} masih terkunci oleh node lain (bebas ${Math.round(decision.freeInMs / 60000)}m). Skip.`
  );
  continue;
}
```

Ini menutup kelemahan struktural mode batch: loop URL di luar + loop account di dalam secara matematis menjamin **semua node menyentuh target yang sama dalam satu jendela waktu**. Target lock memutus jaminan itu tanpa menurunkan total throughput — cukup geser target ke node berikutnya.

---

### 2.5. Ganti semua delay fixed dengan Gaussian jitter

**Lokasi:** `server/automation/twitterBot.js:605`, `:796` (`accountSwitchDelaySec || 10`), `:438` (`delaySeconds || 15`).

Metronom adalah sinyal. Delay uniform juga sinyal (distribusi flat itu sendiri anomali untuk manusia). Pakai `gauss(median, sd, floor, ceil)` dari §2.1:

| Konteks | Sekarang | Usulan |
|---|---|---|
| Antar-vector (1 tweet) | 2-4 s / 2.5-4.5 s | `gauss(75s, 30s, 45s, 180s)` |
| Rotasi antar-node | fixed 10 s | `gauss(60s, 30s, 20s, 180s)` |
| Antar-target | 15-40 s uniform | `gauss(150s, 60s, 60s, 420s)` |

---

### 2.6. Gerbang warmup — bikin `warmupDay` akhirnya berfungsi

**File:** `server/automation/twitterBot.js` (semua task runner), `server/automation/bot/healthRunner.js:270`

Sebelum batch dijalankan, filter node:

```js
const gov = require('../rateGovernor');
const eligible = targetAccounts.filter((acc) => {
  if (gov.snapshot(acc).coolingDown) return false;
  const day = Number(acc.warmupDay) || 1;
  if (day <= 2) {
    logger.info(`🐣 @${acc.username || acc.label} masih warmup Day ${day} — 0 aksi. Skip batch.`);
    return false; // browse only, tidak boleh aksi
  }
  return true;
});
```

Cap per-vector per hari sudah ditangani `QUOTA.warmup` di §2.1 (Day 3 → maks 3 like / 0 RT / 0 reply, dst). Yang penting: **node di bawah Day 3 tidak boleh masuk batch sama sekali**, bukan cuma dibatasi.

---

## 3. Rekomendasi P1 — Fingerprint & Session

### 3.1. Satu identity object per akun, dan buat semuanya konsisten

**File:** `server/automation/bot/browserFactory.js` (`applyStealthScripts`, `launchChromiumBrowser`)

Akar masalah RC-06 adalah nilai-nilai fingerprint disetel dari **tiga tempat berbeda secara independen**: Playwright `userAgent`, konteks `locale`/`timezoneId`, dan `addInitScript` JS override. Ketiganya bisa tidak sinkron. Solusinya: satu objek, satu sumber.

```js
/**
 * Bangun satu identitas yang saling konsisten.
 * Setiap field HARUS berasal dari baris yang sama dan saling cocok.
 */
function buildIdentity(account, egressGeo) {
  // Pilih OS berdasarkan tempat program BENAR-BENAR berjalan.
  // Jangan klaim Windows kalau browser-nya jalan di Linux.
  const profiles = {
    win: {
      ua: (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      platform: 'Win32',
      uaPlatform: 'Windows',
      uaPlatformVersion: '15.0.0',
    },
    mac: {
      ua: (v) => `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      platform: 'MacIntel',
      uaPlatform: 'macOS',
      uaPlatformVersion: '14.5.0',
    },
    linux: {
      ua: (v) => `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      platform: 'Linux x86_64',
      uaPlatform: 'Linux',
      uaPlatformVersion: '',
    },
  };

  const os = detectHostOs();        // 'win' | 'mac' | 'linux' — HARUS host asli
  const ver = pickChromeVersion(account.id);  // seeded, ex: 126..131
  const core = profiles[os];

  return {
    ua: core.ua(ver),
    chromeVersion: ver,
    platform: core.platform,
    uaFullVersion: `${ver}.0.0.0`,
    uaPlatform: core.uaPlatform,
    uaPlatformVersion: core.uaPlatformVersion,
    // TZ + locale WAJIB ikut egress IP, bukan default host
    timezoneId: egressGeo?.timezone || 'UTC',
    locale: egressGeo?.locale || 'en-US',
    languages: egressGeo?.languages || ['en-US', 'en'],
    cores: pickCores(account.id),
    memory: pickMemory(account.id),
    gpuVendor: 'Google Inc. (NVIDIA)',
    gpuRenderer: pickRenderer(account.id),
  };
}
```

Lalu terapkan di ketiga lapisan sekaligus:

```js
const id = buildIdentity(account, await geoForAccount(account));

const context = await browser.newContext({
  userAgent: id.ua,
  locale: id.locale,
  timezoneId: id.timezoneId,
  viewport: { width: pickViewport(account.id).w, height: pickViewport(account.id).h },
  extraHTTPHeaders: {
    'sec-ch-ua': `"Chromium";v="${id.chromeVersion}", "Not.A/Brand";v="24", "Google Chrome";v="${id.chromeVersion}"`,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': `"${id.uaPlatform}"`,
  },
});
await context.addInitScript(injectIdentity, id);
```

Dan `injectIdentity` harus menimpa **semua** yang dibaca situs — bukan cuma `webdriver`:

```js
function injectIdentity(id) {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
  Object.defineProperty(navigator, 'platform', { get: () => id.platform, configurable: true });
  Object.defineProperty(navigator, 'languages', { get: () => id.languages, configurable: true });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => id.cores, configurable: true });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => id.memory, configurable: true });

  if (navigator.userAgentData) {
    Object.defineProperty(navigator, 'userAgentData', {
      get: () => ({
        brands: [
          { brand: 'Chromium', version: String(id.chromeVersion) },
          { brand: 'Not.A/Brand', version: '24' },
          { brand: 'Google Chrome', version: String(id.chromeVersion) },
        ],
        mobile: false,
        platform: id.uaPlatform,
        getHighEntropyValues: async () => ({
          platform: id.uaPlatform,
          platformVersion: id.uaPlatformVersion,
          uaFullVersion: id.uaFullVersion,
          architecture: 'x86',
          bitness: '64',
          model: '',
        }),
      }),
      configurable: true,
    });
  }
  // WebGL — pakai id.gpuVendor / id.gpuRenderer, bukan string hardcoded
  // ... patch WebGLRenderingContext & WebGL2RenderingContext.getParameter
}
```

**Prinsip yang harus dipegang:** klaim Windows → jalankan build Windows, atau setidaknya spoof Client Hints Windows secara konsisten. **Jangan pernah** kirim UA Windows sementara `sec-ch-ua-platform` bilang Linux.

---

### 3.2. Buang artefak Chrome yang sudah tidak ada

**File:** `server/automation/bot/browserFactory.js:26-31`

```js
window.chrome = { runtime: {}, loadTimes: function () {}, csi: function () {}, app: {} };
```

`chrome.loadTimes()` dan `chrome.csi()` sudah dihapus dari Chrome sejak v8x. Memalsukan API yang **tidak ada** di Chrome 126 lebih mencurigakan daripada tidak memalsukan sama sekali.

**Rekomendasi:** hapus keduanya. Untuk `window.chrome`, kalau memang perlu di-mock, bikin properti non-enumerable yang benar-benar eksis, atau lebih baik: launch Chrome asli dengan profile asli sehingga tidak perlu mock apa pun. Untuk jalur Camoufox, tidak perlu sama sekali.

---

### 3.3. Fingerprint unik per node (seeded, stabil)

**File:** `server/automation/bot/browserFactory.js:58-70`

`hardwareConcurrency: 8`, `deviceMemory: 8`, dan renderer `RTX 3060` hardcoded untuk **semua** node. Sepuluh akun dengan spesifikasi identik dari satu mesin adalah cluster.

```js
const crypto = require('crypto');
function seeded(seedStr) {
  const h = crypto.createHash('sha256').update(String(seedStr)).digest();
  return (n) => h[n % h.length];   // deterministik, stabil antar run
}

const pickCores = (accId) => [4, 6, 8, 12, 16][seeded(accId + ':cores')(0) % 5];
const pickMemory = (accId) => [4, 8, 16, 32][seeded(accId + ':mem')(1) % 4];
const pickChromeVersion = (accId) => 126 + (seeded(accId + ':ver')(2) % 6); // 126..131
const RENDERERS = [
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)',
];
const pickRenderer = (accId) => RENDERERS[seeded(accId + ':gpu')(3) % RENDERERS.length];
```

Kunci: **deterministik per `account.id`**. Satu node = satu fingerprint, sama di setiap run. Kalau random tiap launch, X melihat perangkat yang berubah-ubah dari akun yang sama — itu juga sinyal, hanya berbeda jenisnya.

---

### 3.4. Timezone / locale wajib sinkron dengan egress IP

**File:** `server/automation/bot/browserFactory.js:115-120`

Saat ini `timezoneId: 'Asia/Jakarta'` dan `locale: 'en-US'` di-hardcode, padahal proxy bisa keluar dari negara mana pun. UA + TZ + IP harus berasal dari satu negara — itu prinsip dasar, dan jalur Camoufox sudah melakukannya dengan benar (`browserFactory.js:190-199`).

**Rekomendasi:** `proxyHelper.testProxy()` (line 167) sudah mengambil `countryCode`, `country`, `city`, `isp` dari ip-api. Manfaatkan itu:
1. Cache hasil geo per akun (TTL 24 jam, cukup satu request per hari).
2. Petakan `countryCode` → `timezoneId` + `locale` + `languages`.
3. Set ke context, dan sekaligus ke header Client Hints.

Konsekuensinya: node dengan proxy Jerman harus jalan dengan TZ Eropa dan `de-DE`, bukan `Asia/Jakarta` + `en-US`. Mismatch ini sendiri sering cukup untuk memicu restriction tanpa perlu ada perilaku bot sama sekali.

---

### 3.5. Cookie: lengkapi jar, hentikan duplikasi, prioritaskan persistent profile

**File:** `server/automation/cookieManager.js:20-54`

**Prioritas arsitektur (dari paling aman):**
1. **Persistent Camoufox profile** — sudah ada, `data/camoufox_profiles/<account.id>` (`browserFactory.js:162-170`). Ini cara terbaik: seluruh state sesi tersimpan alami, tidak ada injeksi sintetis sama sekali.
2. **Import/export lengkap dari browser asli** — user login manual sekali, seluruh cookie jar disimpan ke profile. 
3. **Cookie injection sebagai fallback** — hanya kalau dua di atas tidak mungkin, dan **dengan jar lengkap**.

**Kalau memang harus inject, lakukan dengan benar:**

```js
getPlaywrightCookies(session, ct0) {
  // session = objek cookie lengkap hasil capture dari browser asli
  const wanted = [
    'auth_token', 'ct0', 'twid', 'kdt', 'att',
    'guest_id', 'guest_id_marketing', 'guest_id_ads',
    'personalization_id', '_twitter_sess', 'external_referer', 'd_prefs',
  ];
  const jar = [];
  for (const name of wanted) {
    const v = session[name];
    if (!v) continue;
    // auth_token & ct0 host-scoped ke .x.com — JANGAN diduplikasi ke 4 domain
    jar.push({
      name,
      value: this.sanitizeToken(v),
      domain: name === 'auth_token' || name === 'ct0' ? '.x.com' : '.x.com',
      path: '/',
      secure: true,
      httpOnly: name === 'auth_token' || name === '_twitter_sess',
      sameSite: 'Lax',
      expires: -1,   // session cookie, sesuai perilaku asli
    });
  }
  return jar;
}
```

**Yang harus dihindari:**
- Meng-inject cookie yang sama ke `x.com`, `.x.com`, `.twitter.com`, `twitter.com` (**`cookieManager.js:26`**) → cookie duplikat = session tampering.
- Sesi yang punya `auth_token` tanpa `twid` / `kdt` → anomali.
- `ct0` dengan `httpOnly: false` ke `.twitter.com` (**`cookieManager.js:46`**) — `ct0` adalah CSRF token dan perilaku aslinya bukan begitu.

---

## 4. Rekomendasi P2 — Fitur Baru

### 4.1. Restriction Early Warning
**Priority: tinggi, effort: rendah**

Saat ini hanya `/login` dan `/account/suspended` yang dideteksi (`interactionEngine.js:2060-2077`). Teks peringatan yang **sebenarnya** dipakai X untuk kasus ini belum tertangkap. Tambahkan deteksi:

- `"Your account is temporarily restricted"` / `"Akun Anda dibatasi sementara"`
- `"We've temporarily limited your account"` / `"Kami membatasi sementara akun Anda"`
- error code `326` (account restricted) — belum ada di `FLAG_CODES` mana pun
- banner `/account/access` **dengan** tombol verifikasi (bukan hanya redirect URL)
- challenge modal (phone / CAPTCHA) → di README disebut sudah ada, tapi verifikasi ulang implementasinya di `interactionEngine.js:275-281` (hanya cek teks toast)

Begitu terdeteksi: quarantine node + hentikan seluruh antrean node itu + kirim Telegram (infrastruktur `notifier.js` sudah siap). Ini mengubah restriction dari "ditemukan besok pagi" menjadi "diketahui dalam 3 detik".

### 4.2. Pre-flight standing probe
**Priority: tinggi, effort: rendah**

Sebelum batch dijalankan, lakukan satu request ringan yang otentik dan baca counter limit dari response header (`§2.3`). Kalau node sudah dalam status terbatas atau quota tersisa 0 — batalkan untuk node itu **sebelum** menyentuh apa pun. Lebih murah membatalkan satu request daripada membakar 3 strike.

### 4.3. Restriction Risk Score per node (0-100)
**Priority: sedang-tinggi, effort: sedang**

Skor komposit: `strikes` (bobot besar), aksi/jam terpakai vs quota, varians gap antar-aksi, skor konsistensi fingerprint, jumlah target-lock collision. Tampilkan di Audit HUD, dan **gerbang scheduler**: node dengan skor melewati ambang tidak dimasukkan batch. Ini yang mencegah tombol "1-click bulk" menjadi bumerang — UI saat ini memberi kesan "cek massal itu aman", padahal node yang sudah rusak ikut ter-sweep dan menambah strike.

### 4.4. Time-of-day profile per node
**Priority: sedang, effort: sedang**

`grep -rn "getHours\|quietHour\|timeOfDay" server/` → **nol hasil**. Aktivitas berjalan 24/7 dengan pola datar. Tambahkan:
- window aktif acak per node, mis. 08:00-23:00 waktu lokal node
- 3-6 sesi per hari, tiap sesi 8-25 menit, gap 30-90 menit
- satu hari penuh idle per node per minggu
- sesi di luar window → task ditunda, bukan dijalankan

### 4.5. Organic filler (rasio aksi vs non-aksi)
**Priority: sedang, effort: rendah**

Sisipkan aksi tanpa hasil (scroll timeline, buka profil, baca thread) di antara aksi nyata. Rasio minimal **1 aksi : 4 non-aksi**. `humanScroll()` sudah ada (`humanCadence.js:88`), tinggal dipanggil sebagai bagian alur, bukan hanya sebagai pembuka. Akun yang 100% aktivitasnya berupa like/RT/reply adalah pola paling mencolok.

### 4.6. Ganti retry instan dengan backoff
**File:** `server/automation/twitterBot.js:578-581` dan `:609` area

```js
if (this.isNetworkConnectionError(err)) {
  this.pauseTask(`Offline / Network Error: ${err.message}`);
  a--;                     // <-- retry instan, tanpa backoff
  await this.checkPauseState();
  continue;
}
```

`a--` lalu `continue` berarti node yang sama dicoba ulang **segera**. Kalau proxy mati, ini menjadi ketukan berulang tanpa jeda. Tambahkan backoff eksponensial (`2^n` detik, cap 5 menit) sebelum retry, dan batasi jumlah retry per node per mission (mis. 3).

---

## 5. Temuan Sampingan (Hygiene & Bug)

### H-01 — File runtime ke-track di git meski sudah ada di `.gitignore`
**Severity: Low (info disclosure)**

**Bukti:** `.gitignore` memuat `data/comments/`, tetapi **17 file** di bawah `data/comments/` tetap ada di repo:
```
data/comments/comments_acc_mt4fo6tgdztl.json  ... (15 file, satu per account ID)
data/comments/comments_account.example.json
data/comments/sample_tech_buzzer.json
data/templates.json        <-- TIDAK ada di .gitignore
```
`.gitignore` tidak berlaku retroaktif terhadap file yang sudah di-track.

**Isi:** berupa payload spintax komentar (contoh: `"{Setuju banget|Sepakat}! Ditunggu update selanjutnya 🚀"`). **Tidak ada kredensial atau token** — jadi ini bukan kebocoran kritis. Yang bocor: **15 ID account asli** (`acc_mt4fo6tgdztl`, dst.) dan strategi payload komentar.

**Rekomendasi:**
```bash
git rm -r --cached data/comments/ data/templates.json
echo "data/templates.json" >> .gitignore
git commit -m "chore: untrack runtime data"
# opsional kalau ingin bersih total dari history:
# git filter-repo --path data/comments/ --invert-paths
```

### H-02 — Default delay tidak konsisten antar modul
`server/config.js:70` → `maxDelaySeconds: 40`
`server/automation/bot/humanCadence.js:40` → fallback `35`
Dua nilai berbeda untuk konsep yang sama. Satukan supaya fallback tidak diam-diam berbeda dari default.

### H-03 — Cap validasi zod terlalu longgar
`server/routes/settingsRouter.js:54` mengizinkan `hourlyLimit` sampai **1000**. Begitu `rateGovernor` (§2.1) terpasang, cap ini harus diturunkan (mis. maks 60/jam) supaya operator tidak bisa mengesampingkan proteksi dengan satu slider. Proteksi yang bisa dimatikan dari UI bukan proteksi.

### H-04 — `x-rate-limit` tidak dibaca (duplikat RC-08, ditulis terpisah sebagai item aksi)
Sudah dibahas di §2.3. Disinggung di sini karena sekaligus merupakan **bug** (mengabaikan data yang sudah tersedia) dan **fitur** (pacing adaptif).

### H-05 — Klaim README tidak sesuai implementasi
README menyatakan: *"Automatic interception of X daily limits (error 344/185)"* — benar, parsing-nya ada (`interactionEngine.js:169-193`). Tetapi kata **"interception"** menyiratkan pencegahan, sedangkan implementasinya hanya **deteksi + abort satu target**. Setelah dokumen ini dieksekusi (§2.2), klaim README baru benar-benar akurat. Menyesuaikan klaim dokumentasi dengan realitas kode penting untuk kredibilitas repo.

---

## 6. Urutan Implementasi

**Fase 1 — Stopper (estimasi 3-4 jam).** Tanpa fase ini, semua fase lain sia-sia.
1. `rateGovernor.js` (§2.1)
2. Wiring 4 titik (§2.1, "cara menyambungkan")
3. Quarantine node di orchestrator (§2.2) — tambahkan `AUTOMATED_FLAG` ke `twitterBot.js`
4. Warmup gate (§2.6)

**Fase 2 — Pacing (estimasi 2-3 jam).**
5. Baca `x-rate-limit-*` header + pacing adaptif (§2.3)
6. Gaussian jitter untuk semua delay (§2.5)
7. Target lock (§2.4)

**Fase 3 — Fingerprint (estimasi 3-4 jam).**
8. `buildIdentity()` + Client Hints (§3.1)
9. Buang `loadTimes`/`csi` (§3.2)
10. Seeded per-node fingerprint (§3.3)
11. Geo sync dari proxy (§3.4)

**Fase 4 — Session (estimasi 2-3 jam).**
12. Perbaiki cookie jar, prioritaskan persistent profile (§3.5)

**Fase 5 — Observability & fitur (estimasi 6-8 jam).**
13. Restriction Early Warning (§4.1)
14. Pre-flight probe (§4.2)
15. Risk score + scheduler gate (§4.3)
16. Time-of-day profile (§4.4)
17. Organic filler (§4.5)
18. Backoff retry (§4.6)

**Cara mengukur keberhasilan:** jalankan fleet selama 2 minggu dengan `strikes` sebagai metrik utama. Target: **nol node mencapai `strikes >= 2`**. Kalau masih ada yang tercapai, berarti ada sinyal yang belum tertangkap — dan audit ledger sudah merekam cukup detail untuk menelusuri sinyal mana yang terlewat.

---

## 7. Lampiran A — Bukti (perintah grep)

Semua klaim di dokumen ini dapat diverifikasi ulang:

```bash
# RC-01: hourlyLimit/dailyLimit hanya didefinisikan, tidak pernah dipakai
grep -rn "hourlyLimit\|dailyLimit" server/automation/            # -> 0 hasil

# RC-02: AUTOMATED_FLAG tidak pernah dibaca orchestrator
grep -n "AUTOMATED_FLAG\|DAILY_LIMIT_EXCEEDED" server/automation/twitterBot.js   # -> 0 hasil

# RC-03: tidak ada ledger cooldown / strike
grep -rn "cooldownUntil\|rateLimitUntil\|circuitBreaker\|strikes" server/        # -> 0 hasil

# RC-06: navigator.platform & userAgentData tidak di-spoof
grep -rn "userAgentData\|navigator.platform\|sec-ch-ua" server/automation/bot/browserFactory.js
#   -> hanya ketemu process.platform (baris 285)

# RC-08: header rate limit diabaikan
grep -rn "x-rate-limit\|retry-after" server/                     # -> 0 hasil

# RC-09: warmupDay tidak menggerbang task apa pun
grep -rn "warmupDay" server/automation/                           # -> hanya di healthRunner.js

# §4.4: tidak ada modulasi jam
grep -rn "getHours\|quietHour\|timeOfDay" server/                 # -> 0 hasil
```

**Baris kode yang dikutip (referensi cepat):**

| Item | Lokasi |
|---|---|
| DEFAULTS quota & UA | `server/config.js:69-72`, `:80-81` |
| `accountSwitchDelaySec: 10` | `server/db.js:52` |
| Validasi quota zod | `server/routes/settingsRouter.js:51-55` |
| UI slider Defense Protocol | `client/src/components/cockpit/DefenseProtocol.tsx:37-41` |
| Stealth scripts Chromium | `server/automation/bot/browserFactory.js:17-81` |
| Artefak `loadTimes`/`csi` | `server/automation/bot/browserFactory.js:26-31` |
| cores/mem hardcoded | `server/automation/bot/browserFactory.js:58-59` |
| WebGL hardcoded | `server/automation/bot/browserFactory.js:61-70` |
| Context Chromium (TZ/locale) | `server/automation/bot/browserFactory.js:115-120` |
| TZ dinamis Camoufox (benar) | `server/automation/bot/browserFactory.js:190-199` |
| Cookie domains | `server/automation/cookieManager.js:26` |
| `ct0` httpOnly:false | `server/automation/cookieManager.js:46` |
| Parsing error 344/185/226 | `server/automation/bot/interactionEngine.js:169-193` |
| Checkpoint detection | `server/automation/bot/interactionEngine.js:2060-2077` |
| Abort vector setelah flag | `server/automation/bot/interactionEngine.js:2106-2113` |
| Jeda inter-vector (2-4s, 2.5-4.5s) | `server/automation/bot/interactionEngine.js:2117`, `:2136` |
| `createActionTracker` (tanpa header) | `server/automation/bot/interactionEngine.js:307-360` |
| Node rotation fixed 10s | `server/automation/twitterBot.js:605`, `:796` |
| Retry instan tanpa backoff | `server/automation/twitterBot.js:578-581` |
| `executeWarmupProtocol` | `server/automation/bot/healthRunner.js:270` |
| Default delay tidak konsisten | `server/config.js:70` vs `server/automation/bot/humanCadence.js:40` |

---

## 8. Lampiran B — Profil Konfigurasi Quick-Win

Kalau belum ingin menyentuh kode, ini setelan paling aman yang bisa dilakukan **sekarang** dari UI (sambil menunggu Fase 1):

- `minDelaySeconds`: **90**
- `maxDelaySeconds`: **240**
- `accountSwitchDelaySec`: **120**
- `hourlyLimit`: **8** — (diingat: belum di-enforce sampai §2.1 jadi; ini hanya dokumentasi niat)
- `dailyLimit`: **40**
- `browserEngine`: **camoufox** — ini penting. Jalur Chromium punya masalah fingerprint (§3.1-§3.4), sementara jalur Camoufox sudah menangani TZ dinamis dengan benar. Untuk saat ini, Camoufox jelas lebih aman.
- `headless`: **false**

Dan kebiasaan operasional:
- Maksimum **1 batch per node per hari** sampai Fase 1 selesai.
- Setelah batch, cek Audit Ledger untuk kode `226`, `344`, `185` — kalau ada satu saja, **istirahatkan node itu 24 jam** manual.
- Hindari mode batch lebih dari **5 URL** sampai target lock (§2.4) terpasang.
- Jangan jalankan "Fleet Dispatcher" broadcast ke seluruh node untuk konten yang sama dalam satu jam.

---

*Dokumen ini berdasarkan review source statis terhadap `MHendriF/x-sentinel` @ `main` (v1.3.5). Setiap temuan disertai lokasi `file:line` yang dapat diverifikasi ulang dengan perintah di Lampiran A.*
