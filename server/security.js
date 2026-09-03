/**
 * Local Security Layer
 * - originGuard: rejects any browser request whose Origin/Host is not the local
 *   dashboard, preventing drive-by secret exfiltration (CORS) and DNS rebinding.
 * - Secret masking: GET responses never contain raw cookies/keys; write endpoints
 *   restore masked values from the stored originals.
 */

const config = require('./config');
const proxyHelper = require('./automation/proxyHelper');

const MASK = '••••';

// ---------------------------------------------------------------------------
// Origin / Host guard
// ---------------------------------------------------------------------------

const allowedOrigins = new Set();
for (const port of new Set([String(config.PORT), '5173'])) {
  allowedOrigins.add(`http://localhost:${port}`);
  allowedOrigins.add(`http://127.0.0.1:${port}`);
}

const ALLOWED_HOST_RE = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;

function originGuard(req, res, next) {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN_ORIGIN',
      message: 'Permintaan dari origin luar tidak diizinkan pada server lokal ini.',
    });
  }

  const secFetchSite = req.headers['sec-fetch-site'];
  if (secFetchSite === 'cross-site') {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN_CROSS_SITE',
      message: 'Permintaan lintas situs (cross-site) diblokir oleh sistem keamanan.',
    });
  }

  const referer = req.headers.referer;
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowedOrigins.has(refererOrigin)) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_REFERER',
          message: 'Permintaan dari referer luar tidak diizinkan pada server lokal ini.',
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        error: 'INVALID_REFERER',
        message: 'Format Referer header tidak valid.',
      });
    }
  }

  const host = req.headers.host;
  if (host && !ALLOWED_HOST_RE.test(host)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN_HOST',
      message: 'Permintaan dengan Host header luar tidak diizinkan (DNS rebinding protection).',
    });
  }

  return next();
}

// ---------------------------------------------------------------------------
// Secret masking
// ---------------------------------------------------------------------------

function maskSecret(value) {
  const v = String(value || '');
  if (!v) return '';
  if (v.length <= 8) return MASK;
  return `${MASK}${v.slice(-4)}`;
}

/**
 * Mask proxy credentials while keeping host:port visible for the UI.
 * `user:pass@1.2.3.4:8080` -> `••••@1.2.3.4:8080`
 */
function maskProxyString(proxy) {
  const trimmed = String(proxy || '').trim();
  if (!trimmed) return '';
  const parsed = proxyHelper.getPlaywrightLaunchProxy(trimmed);
  if (!parsed) return MASK;
  const hostPort = String(parsed.server || '').replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  return parsed.username ? `${MASK}@${hostPort}` : hostPort;
}

function isMaskedValue(value) {
  return typeof value === 'string' && value.includes(MASK);
}

/**
 * Restore a masked secret field from its stored original.
 * Incoming raw values pass through untouched (new keys), masked values map
 * back to the stored secret, empty stays empty.
 */
function resolveSecret(incoming, stored) {
  const val = String(incoming ?? '').trim();
  if (!val) return '';
  if (!isMaskedValue(val)) return val;
  return String(stored || '').trim();
}

/**
 * Restore a masked proxy string. Supports partial edits where the user keeps
 * the `••••@host:port` display format but changes the host:port part.
 */
function resolveProxyString(stored, incoming) {
  const val = String(incoming ?? '').trim();
  if (!val) return '';
  if (!isMaskedValue(val)) return val;
  if (!stored) return val.split(MASK).pop().trim();

  const parsed = proxyHelper.getPlaywrightLaunchProxy(String(stored).trim());
  const creds = parsed && parsed.username ? `${parsed.username}:${parsed.password}` : '';

  if (val.startsWith(`${MASK}@`)) {
    const hostPart = val.slice(MASK.length + 1);
    return creds ? `${creds}@${hostPart}` : hostPart;
  }
  return String(stored).trim();
}

function redactAccount(account) {
  if (!account) return account;
  return {
    ...account,
    auth_token: maskSecret(account.auth_token),
    ct0: account.ct0 ? maskSecret(account.ct0) : '',
    proxy: maskProxyString(account.proxy),
  };
}

const SETTINGS_SECRET_FIELDS = ['aiApiKey', 'telegramBotToken', 'discordWebhookUrl'];

function redactSettings(settings) {
  if (!settings) return settings;
  const masked = { ...settings };
  for (const field of SETTINGS_SECRET_FIELDS) {
    masked[field] = maskSecret(settings[field]);
  }
  return masked;
}

/**
 * Given a parsed (already validated) body, replace masked secret fields with
 * the stored originals so a round-tripped masked value never overwrites data.
 */
function restoreMaskedSettings(body, stored) {
  const patch = { ...body };
  for (const field of SETTINGS_SECRET_FIELDS) {
    if (patch[field] !== undefined) {
      patch[field] = resolveSecret(patch[field], stored[field]);
    }
  }
  return patch;
}

module.exports = {
  MASK,
  originGuard,
  maskSecret,
  maskProxyString,
  isMaskedValue,
  resolveSecret,
  resolveProxyString,
  redactAccount,
  redactSettings,
  restoreMaskedSettings,
};
