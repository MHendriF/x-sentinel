const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

// In-memory brute force protection for login
const failedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 60 * 1000; // 1 minute

// ---------------------------------------------------------------------------
// Auth Storage (auth_config.json)
// ---------------------------------------------------------------------------

function getAuthConfigPath() {
  return path.join(config.DATA_DIR, 'auth_config.json');
}

let authConfigCache = null;

function getAuthConfig() {
  if (authConfigCache) return authConfigCache;

  const filePath = getAuthConfigPath();
  const defaults = {
    username: config.ADMIN_USERNAME || 'admin',
    passwordHash: null, // fallback to config.ADMIN_PASSWORD
    sessionEpoch: 1,
    totpEnabled: false,
    totpSecret: null,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      authConfigCache = { ...defaults, ...JSON.parse(raw) };
      return authConfigCache;
    }
  } catch (e) {
    console.error('Error reading auth_config.json:', e.message);
  }

  authConfigCache = { ...defaults };
  return authConfigCache;
}

function saveAuthConfig(data) {
  authConfigCache = { ...getAuthConfig(), ...data, updatedAt: new Date().toISOString() };
  try {
    const filePath = getAuthConfigPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(authConfigCache, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing auth_config.json:', e.message);
  }
  return authConfigCache;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(inputPassword) {
  if (typeof inputPassword !== 'string' || !inputPassword) return false;

  const current = getAuthConfig();
  if (current.passwordHash && current.passwordHash.includes(':')) {
    const [salt, storedHash] = current.passwordHash.split(':');
    const computedHash = crypto.scryptSync(inputPassword, salt, 64).toString('hex');
    const computedBuf = Buffer.from(computedHash, 'utf8');
    const storedBuf = Buffer.from(storedHash, 'utf8');
    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  }

  // Fallback to config.ADMIN_PASSWORD
  const expectedPassword = config.ADMIN_PASSWORD || 'sentinel123';
  const inputHash = crypto.createHash('sha256').update(inputPassword).digest();
  const targetHash = crypto.createHash('sha256').update(expectedPassword).digest();
  return crypto.timingSafeEqual(inputHash, targetHash);
}

function verifyUsername(inputUsername) {
  if (typeof inputUsername !== 'string' || !inputUsername) return false;
  const current = getAuthConfig();
  const targetUsername = current.username || 'admin';

  const inputHash = crypto.createHash('sha256').update(inputUsername.trim().toLowerCase()).digest();
  const targetHash = crypto.createHash('sha256').update(targetUsername.trim().toLowerCase()).digest();
  return crypto.timingSafeEqual(inputHash, targetHash);
}

function updateCredentials(newUsername, newPassword) {
  const current = getAuthConfig();
  const patch = {
    username: newUsername ? newUsername.trim() : current.username,
    sessionEpoch: (current.sessionEpoch || 1) + 1, // Invalidate all prior sessions on credential change
  };
  if (newPassword) {
    patch.passwordHash = hashPassword(newPassword);
  }
  return saveAuthConfig(patch);
}

function revokeAllSessions() {
  const current = getAuthConfig();
  const newEpoch = (current.sessionEpoch || 1) + 1;
  saveAuthConfig({ sessionEpoch: newEpoch });
  return newEpoch;
}

// ---------------------------------------------------------------------------
// Built-in RFC 6238 TOTP (Google Authenticator) Implementation
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input) {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '');
  const bytes = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotpSecret() {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

function generateTotpToken(secret, timeStepOffset = 0) {
  const key = base32Decode(secret);
  const timeStep = 30; // standard 30s step
  const counter = Math.floor(Date.now() / 1000 / timeStep) + timeStepOffset;

  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (code % 1000000).toString().padStart(6, '0');
  return otp;
}

function verifyTotpToken(token, secret) {
  if (!token || !secret) return false;
  const cleanToken = String(token).trim();
  if (!/^\d{6}$/.test(cleanToken)) return false;

  // Accept token within ±1 step window (current, -30s, +30s)
  for (let offset = -1; offset <= 1; offset++) {
    const expected = generateTotpToken(secret, offset);
    if (cleanToken === expected) {
      return true;
    }
  }
  return false;
}

function getOtpAuthUrl(username, secret) {
  const issuer = 'X-SENTINEL';
  const label = encodeURIComponent(`${issuer}:${username}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

function checkRateLimit(ip) {
  const record = failedAttempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (now - record.lastAttempt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const remainingSec = Math.ceil((record.lastAttempt + LOCKOUT_WINDOW_MS - now) / 1000);
    return { allowed: false, remainingSec };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record || now - record.lastAttempt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    record.count += 1;
    record.lastAttempt = now;
  }
}

function resetRateLimit(ip) {
  failedAttempts.delete(ip);
}

// ---------------------------------------------------------------------------
// Cookies & Session Tokens with Epoch Invalidation
// ---------------------------------------------------------------------------

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      try {
        list[name] = decodeURIComponent(val);
      } catch {
        list[name] = val;
      }
    }
  });

  return list;
}

function createSessionToken() {
  const epoch = getAuthConfig().sessionEpoch || 1;
  const timestamp = Date.now().toString(36);
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${timestamp}.${nonce}.${epoch}`;
  const signature = crypto
    .createHmac('sha256', config.SESSION_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 4) return false;

  const [timestampStr, nonce, epochStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 36);

  if (isNaN(timestamp)) return false;

  const now = Date.now();
  if (now - timestamp > config.SESSION_DURATION_MS || timestamp > now + 60000) {
    return false;
  }

  // Session Epoch Check: Invalidate if epoch changed (Revoke All / Password changed)
  const currentEpoch = getAuthConfig().sessionEpoch || 1;
  if (parseInt(epochStr, 10) !== currentEpoch) {
    return false;
  }

  const payload = `${timestampStr}.${nonce}.${epochStr}`;
  const expectedSig = crypto
    .createHmac('sha256', config.SESSION_SECRET)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function extractSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[config.SESSION_COOKIE_NAME]) {
    return cookies[config.SESSION_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (req.query && req.query.auth_token) {
    return req.query.auth_token;
  }

  return null;
}

function setSessionCookie(res, token) {
  const maxAgeSec = Math.floor(config.SESSION_DURATION_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `${config.SESSION_COOKIE_NAME}=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${config.SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function requireAuth(req, res, next) {
  if (!config.AUTH_ENABLED) {
    req.authenticated = true;
    return next();
  }

  const token = extractSessionToken(req);
  if (token && verifySessionToken(token)) {
    req.authenticated = true;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'UNAUTHORIZED',
    message: 'Access denied. Valid authentication session required.',
  });
}

module.exports = {
  getAuthConfig,
  saveAuthConfig,
  updateCredentials,
  revokeAllSessions,
  hashPassword,
  verifyUsername,
  verifyPassword,
  generateTotpSecret,
  generateTotpToken,
  verifyTotpToken,
  getOtpAuthUrl,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  parseCookies,
  createSessionToken,
  verifySessionToken,
  extractSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
};
