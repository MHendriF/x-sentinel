/**
 * X-SENTINEL Target Lock
 * Cross-Node Coordination Lock to prevent fleet from engaging the same target simultaneously.
 * Single source of truth to eliminate Coordinated Inauthentic Behavior detection.
 */

class TargetLock {
  constructor() {
    // Map of tweetId => Array of { accountId, ts, kind, ttlMs }
    this.locks = new Map();
    // Default TTL: 20 minutes for general engagement, 90 minutes for replies
    this.DEFAULT_ENGAGE_TTL_MS = 20 * 60 * 1000;
    this.DEFAULT_REPLY_TTL_MS = 90 * 60 * 1000;
  }

  /**
   * Acquire a lock on a tweet for a specific account.
   * @param {string} tweetId
   * @param {string} accountId
   * @param {{kind?: 'ENGAGE'|'REPLY', ttlMs?: number}} options
   * @returns {{ok: boolean, reason?: string, freeInMs?: number, lockedBy?: string, kind?: string}}
   */
  acquire(tweetId, accountId, options = {}) {
    if (!tweetId || !accountId) return { ok: true };
    const id = String(tweetId).trim();
    const kind = options.kind || 'ENGAGE';
    const ttlMs =
      options.ttlMs ||
      (kind === 'REPLY' ? this.DEFAULT_REPLY_TTL_MS : this.DEFAULT_ENGAGE_TTL_MS);

    const now = Date.now();
    this.pruneTweet(id, now);

    const existingEntries = this.locks.get(id) || [];

    // Check if another node is currently engaging or recently engaged this target
    for (const entry of existingEntries) {
      if (entry.accountId !== accountId) {
        const remainingMs = entry.ts + entry.ttlMs - now;
        if (remainingMs > 0) {
          return {
            ok: false,
            reason: 'TARGET_LOCKED_BY_ANOTHER_NODE',
            freeInMs: remainingMs,
            lockedBy: entry.accountId,
            kind: entry.kind,
          };
        }
      }
    }

    // Check if this node itself already engaged this target within TTL
    const myEntry = existingEntries.find((e) => e.accountId === accountId);
    if (myEntry) {
      const remainingMs = myEntry.ts + myEntry.ttlMs - now;
      if (remainingMs > 0) {
        return {
          ok: false,
          reason: 'TARGET_ALREADY_ENGAGED_BY_THIS_NODE',
          freeInMs: remainingMs,
          lockedBy: accountId,
          kind: myEntry.kind,
        };
      }
      myEntry.ts = now;
      myEntry.kind = kind;
      myEntry.ttlMs = ttlMs;
    } else {
      existingEntries.push({ accountId, ts: now, kind, ttlMs });
      this.locks.set(id, existingEntries);
    }

    return { ok: true };
  }

  /**
   * Release lock early (e.g. task failed or cancelled before action started)
   */
  release(tweetId, accountId) {
    if (!tweetId || !accountId) return;
    const id = String(tweetId).trim();
    const existing = this.locks.get(id);
    if (!existing) return;
    const filtered = existing.filter((e) => e.accountId !== accountId);
    if (filtered.length === 0) {
      this.locks.delete(id);
    } else {
      this.locks.set(id, filtered);
    }
  }

  /**
   * Clean expired entries for a given tweet
   */
  pruneTweet(tweetId, now = Date.now()) {
    const existing = this.locks.get(tweetId);
    if (!existing) return;
    const active = existing.filter((e) => now - e.ts < e.ttlMs);
    if (active.length === 0) {
      this.locks.delete(tweetId);
    } else {
      this.locks.set(tweetId, active);
    }
  }

  /**
   * Clean expired entries across all targets
   */
  prune(now = Date.now()) {
    for (const [tweetId, entries] of this.locks.entries()) {
      const active = entries.filter((e) => now - e.ts < e.ttlMs);
      if (active.length === 0) {
        this.locks.delete(tweetId);
      } else {
        this.locks.set(tweetId, active);
      }
    }
  }

  /**
   * Status summary for audit HUD
   */
  snapshot() {
    this.prune();
    let totalLocks = 0;
    for (const entries of this.locks.values()) {
      totalLocks += entries.length;
    }
    return {
      activeTargets: this.locks.size,
      totalLocks,
    };
  }

  /**
   * Clear all locks (primarily for tests)
   */
  clear() {
    this.locks.clear();
  }
}

module.exports = new TargetLock();
