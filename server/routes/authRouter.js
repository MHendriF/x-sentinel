const express = require('express');
const router = express.Router();
const config = require('../config');
const {
  getAuthConfig,
  saveAuthConfig,
  updateCredentials,
  revokeAllSessions,
  verifyUsername,
  verifyPassword,
  generateTotpSecret,
  verifyTotpToken,
  getOtpAuthUrl,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  createSessionToken,
  extractSessionToken,
  verifySessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} = require('../auth');

// GET /api/auth/session - Initial Handshake Check
router.get('/session', (req, res) => {
  if (!config.AUTH_ENABLED) {
    return res.json({
      success: true,
      authenticated: true,
      authEnabled: false,
      username: 'admin',
      totpEnabled: false,
    });
  }

  const token = extractSessionToken(req);
  const isValid = Boolean(token && verifySessionToken(token));
  const authConfig = getAuthConfig();

  return res.json({
    success: true,
    authenticated: isValid,
    authEnabled: true,
    username: isValid ? authConfig.username : undefined,
    totpEnabled: Boolean(authConfig.totpEnabled),
  });
});

// POST /api/auth/login - Username + Password + Optional 2FA Login
router.post('/login', (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: 'TOO_MANY_ATTEMPTS',
      message: `Too many failed attempts. Access temporarily locked for ${rateLimit.remainingSec}s.`,
    });
  }

  const { username, password, totpCode } = req.body || {};

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: 'Password is required.',
    });
  }

  const authConfig = getAuthConfig();

  // If username is provided, verify it. If not provided (single-passcode legacy style), check password
  if (username && !verifyUsername(username)) {
    recordFailedAttempt(ip);
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid username or password.',
    });
  }

  const isPasswordValid = verifyPassword(password);
  if (!isPasswordValid) {
    recordFailedAttempt(ip);
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid username or password.',
    });
  }

  // 2FA Verification if enabled
  if (authConfig.totpEnabled) {
    if (!totpCode) {
      return res.status(200).json({
        success: false,
        requireTotp: true,
        message: 'Two-factor authentication code required.',
      });
    }

    const isTotpValid = verifyTotpToken(totpCode, authConfig.totpSecret);
    if (!isTotpValid) {
      recordFailedAttempt(ip);
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOTP',
        message: 'Invalid 6-digit Authenticator code.',
      });
    }
  }

  // Reset rate limits on success
  resetRateLimit(ip);

  const token = createSessionToken();
  setSessionCookie(res, token);

  return res.json({
    success: true,
    token,
    username: authConfig.username,
    message: 'Authenticated successfully.',
  });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// ---------------------------------------------------------------------------
// Protected Operations (Require Active Session)
// ---------------------------------------------------------------------------

// POST /api/auth/revoke-all - Invalidate all active sessions across all devices
router.post('/revoke-all', requireAuth, (req, res) => {
  revokeAllSessions();
  // Issue a fresh token for current operator with the new epoch
  const freshToken = createSessionToken();
  setSessionCookie(res, freshToken);

  return res.json({
    success: true,
    token: freshToken,
    message: 'All other active sessions have been revoked.',
  });
});

// PUT /api/auth/credentials - Change Username & Password
router.put('/credentials', requireAuth, (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body || {};

  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: 'Current password is required to update credentials.',
    });
  }

  if (!verifyPassword(currentPassword)) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_CURRENT_PASSWORD',
      message: 'Incorrect current password.',
    });
  }

  if (newUsername && newUsername.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_USERNAME',
      message: 'Username must be at least 3 characters long.',
    });
  }

  if (newPassword && newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'New password must be at least 6 characters long.',
    });
  }

  const updatedConfig = updateCredentials(newUsername, newPassword);

  // Issue fresh token for current operator with the incremented epoch
  const freshToken = createSessionToken();
  setSessionCookie(res, freshToken);

  return res.json({
    success: true,
    username: updatedConfig.username,
    token: freshToken,
    message: 'Credentials updated successfully. All other sessions have been revoked.',
  });
});

// ---------------------------------------------------------------------------
// 2FA / TOTP Management
// ---------------------------------------------------------------------------

// GET /api/auth/2fa/status
router.get('/2fa/status', requireAuth, (_req, res) => {
  const current = getAuthConfig();
  return res.json({
    success: true,
    enabled: Boolean(current.totpEnabled),
  });
});

// POST /api/auth/2fa/setup - Generate secret and otpauth QR code URI
router.post('/2fa/setup', requireAuth, (_req, res) => {
  const current = getAuthConfig();
  const secret = generateTotpSecret();
  const otpauthUrl = getOtpAuthUrl(current.username, secret);

  return res.json({
    success: true,
    secret,
    otpauthUrl,
    issuer: 'X-SENTINEL',
    username: current.username,
  });
});

// POST /api/auth/2fa/enable - Validate code and activate 2FA
router.post('/2fa/enable', requireAuth, (req, res) => {
  const { secret, code } = req.body || {};

  if (!secret || !code) {
    return res.status(400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: 'Secret and verification code are required.',
    });
  }

  const isValid = verifyTotpToken(code, secret);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_TOTP_CODE',
      message: 'Invalid 6-digit code. Please verify the code in your Authenticator app.',
    });
  }

  saveAuthConfig({ totpEnabled: true, totpSecret: secret });

  return res.json({
    success: true,
    message: 'Two-factor authentication successfully enabled.',
  });
});

// POST /api/auth/2fa/disable - Deactivate 2FA with password confirmation
router.post('/2fa/disable', requireAuth, (req, res) => {
  const { password } = req.body || {};

  if (!password || !verifyPassword(password)) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'Valid password required to disable 2FA.',
    });
  }

  saveAuthConfig({ totpEnabled: false, totpSecret: null });

  return res.json({
    success: true,
    message: 'Two-factor authentication successfully disabled.',
  });
});

module.exports = router;
