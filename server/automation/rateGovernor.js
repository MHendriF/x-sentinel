/**
 * X-SENTINEL Rate Governor
 * Persistent per-account action budget, strike ledger, and cooldown gate.
 * Single source of truth for "may this node act right now?".
 */
const db = require('../db');
const logger = require('../logger');

const MIN = 60 * 1000;
const HOUR_MS = 60 * MIN;

// X error codes meaning: soft block / quota exhausted / flagged as automated
const FLAG_CODES = new Set([88, 185, 226, 326, 344, 403, 429]);

const DEFAULT_QUOTA = {
  hourly: 10, // total aksi apapun, rolling 60 menit
  daily: 45, // total aksi apapun, per hari kalender
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

/** Gaussian, bukan uniform — distribusi waktu aktivitas manusia terkumpul di sekitar median */
function gauss(median, sd, floor, ceil) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(ceil, Math.max(floor, Math.round(median + z * sd)));
}

class RateGovernor {
  /** Ambil / inisialisasi state waktu pada record account. */
  state(account) {
    if (!account.state || typeof account.state !== 'object') {
      account.state = {};
    }
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
    if (s.dayKey !== dayKey(now)) {
      s.dayKey = dayKey(now);
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
   * Determine if the account is currently within its biological sleep / quiet window.
   * Default quiet window: 23:00 to 07:00 (11 PM - 7 AM local time).
   */
  isQuietHour(account, date = new Date()) {
    const tz = account?.state?.timezoneId || account?.timezone || 'Asia/Jakarta';
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: tz,
      });
      const localHour = Number(formatter.format(date));
      const isQuiet = localHour >= 23 || localHour < 7;
      return { isQuiet, localHour, timezone: tz };
    } catch {
      const localHour = date.getHours();
      return { isQuiet: localHour >= 23 || localHour < 7, localHour, timezone: 'UTC' };
    }
  }

  /**
   * Calculate a composite Restriction Risk Score (0-100) for an account node.
   * Combines strikes, cooldown status, quota saturation, and warmup maturity.
   */
  calculateRiskScore(account) {
    if (!account) return 100;
    const s = this.prune(account);
    const now = Date.now();
    let score = 0;

    // 1. Strikes weight (up to 60 pts)
    const strikes = s.strikes || 0;
    score += Math.min(60, strikes * 25);

    // 2. Active Cooldown / Quarantine (20 pts)
    if (s.cooldownUntil && s.cooldownUntil > now) {
      score += 20;
    }

    // 3. Quota Saturation (up to 20 pts)
    const settings = typeof db.getSettings === 'function' ? db.getSettings() : {};
    const hourlyQuota = Math.min(settings.hourlyLimit || DEFAULT_QUOTA.hourly, DEFAULT_QUOTA.hourly);
    const dailyQuota = Math.min(settings.dailyLimit || DEFAULT_QUOTA.daily, DEFAULT_QUOTA.daily);

    const hourlyUsageRatio = Math.min(1, s.windowHourly.length / Math.max(1, hourlyQuota));
    const dailyUsageRatio = Math.min(1, s.dayCount / Math.max(1, dailyQuota));
    score += Math.round(hourlyUsageRatio * 10 + dailyUsageRatio * 10);

    // 4. Warmup penalty for immature nodes (Day 1-2: +10 pts, only if warmup gate enforced)
    const enforceWarmup = settings.enforceWarmupGate !== false;
    if (enforceWarmup) {
      const day = Number(account.warmupDay) || 1;
      if (day <= 2) {
        score += 10;
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Gate. Dipanggil SEBELUM setiap aksi.
   * @returns {{allowed: boolean, reason?: string, retryInMs?: number}}
   */
  canAct(account, action, options = {}) {
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

    if (!options.ignoreQuietHours) {
      const quiet = this.isQuietHour(account);
      if (quiet.isQuiet) {
        return {
          allowed: false,
          reason: 'QUIET_HOURS',
          localHour: quiet.localHour,
          timezone: quiet.timezone,
        };
      }
    }

    const settings = typeof db.getSettings === 'function' ? db.getSettings() : {};
    const hourlyQuota = Math.min(settings.hourlyLimit || DEFAULT_QUOTA.hourly, DEFAULT_QUOTA.hourly);
    const dailyQuota = Math.min(settings.dailyLimit || DEFAULT_QUOTA.daily, DEFAULT_QUOTA.daily);

    if (s.windowHourly.length >= hourlyQuota) {
      const oldest = s.windowHourly[0];
      return {
        allowed: false,
        reason: 'HOURLY_QUOTA',
        retryInMs: Math.max(0, oldest + HOUR_MS - now),
      };
    }

    if (s.dayCount >= dailyQuota) {
      return { allowed: false, reason: 'DAILY_QUOTA' };
    }

    const enforceWarmupGate =
      options.enforceWarmupGate !== undefined
        ? options.enforceWarmupGate
        : settings.enforceWarmupGate !== false;
    if (enforceWarmupGate) {
      const warmupDay = Number(account.warmupDay) || 1;
      if (warmupDay <= 7 && DEFAULT_QUOTA.warmup[warmupDay]) {
        const cap = DEFAULT_QUOTA.warmup[warmupDay][action] ?? 0;
        if ((s.dayByAction[action] || 0) >= cap) {
          return { allowed: false, reason: `WARMUP_DAY_${warmupDay}_${action}_CAP` };
        }
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
    if (typeof db.saveAccount === 'function') {
      db.saveAccount(account);
    }
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

    if (typeof db.saveAccount === 'function') {
      db.saveAccount(account);
    }

    logger.warn(
      `🛡️ [@${account.username || account.label}] FLAG ${code} — strike ${s.strikes}, ` +
        `cooldown ${(backoff / MIN).toFixed(0)}m${disabled ? ', NODE AUTO-DISABLED 48h' : ''}`
    );
    return { strikes: s.strikes, cooldownMs: backoff, disabled };
  }

  /** Status ringkas untuk UI / audit HUD. */
  snapshot(account) {
    const s = this.prune(account);
    const settings = typeof db.getSettings === 'function' ? db.getSettings() : {};
    const hourlyQuota = Math.min(settings.hourlyLimit || DEFAULT_QUOTA.hourly, DEFAULT_QUOTA.hourly);
    const dailyQuota = Math.min(settings.dailyLimit || DEFAULT_QUOTA.daily, DEFAULT_QUOTA.daily);
    const riskScore = this.calculateRiskScore(account);
    const quietHour = this.isQuietHour(account);

    return {
      strikes: s.strikes,
      cooldownUntil: s.cooldownUntil,
      coolingDown: s.cooldownUntil > Date.now(),
      usedThisHour: s.windowHourly.length,
      usedToday: s.dayCount,
      hourlyQuota,
      dailyQuota,
      riskScore,
      quietHour,
      dayByAction: { ...s.dayByAction },
    };
  }

  /**
   * Proses dan terapkan header resmi x-rate-limit-* dan retry-after dari X.
   */
  handleRateLimitHeaders(account, rateState) {
    if (!rateState || !account) return;
    const s = this.prune(account);
    const now = Date.now();
    let updated = false;

    // 1. Jika ada retry-after dari server, patuhi durasi backoff secara tepat
    if (typeof rateState.retryAfter === 'number' && rateState.retryAfter > 0) {
      const cooldownMs = rateState.retryAfter * 1000;
      s.cooldownUntil = Math.max(s.cooldownUntil || 0, now + cooldownMs);
      updated = true;
      logger.warn(
        `🛑 [@${account.username || account.label}] X retry-after diterima: ${rateState.retryAfter}s. Cooldown diset otomatis.`
      );
    }

    // 2. Jika kuota resmi X tersisa 0, node wajib tidur sampai waktu reset
    if (rateState.remaining === 0 && rateState.reset) {
      const resetMs =
        rateState.reset > 1e9
          ? rateState.reset * 1000
          : now + rateState.reset * 1000;
      // Berikan jitter 5-15 detik di atas reset epoch agar tidak serentak menabrak server di detik ke-0
      const safeResetMs = resetMs + Math.floor(5000 + Math.random() * 10000);
      s.cooldownUntil = Math.max(s.cooldownUntil || 0, safeResetMs);
      updated = true;
      const waitSec = Math.max(0, Math.round((safeResetMs - now) / 1000));
      logger.warn(
        `🛑 [@${account.username || account.label}] Sisa kuota X = 0! Node otomatis masuk cooldown hingga reset (~${waitSec}s).`
      );
    }

    s.lastRateState = {
      ...rateState,
      updatedAt: now,
    };

    if (updated && typeof db.saveAccount === 'function') {
      db.saveAccount(account);
    }
  }

  // --- pacing helpers: gaussian random delays ---

  /** Jeda antar-vector pada satu tweet. 45-180s (dapat dikalikan multiplier adaptif). */
  interVectorDelay(multiplier = 1) {
    const base = gauss(75_000, 30_000, 45_000, 180_000);
    const m = Math.max(1, Number(multiplier) || 1);
    return Math.round(base * m);
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
