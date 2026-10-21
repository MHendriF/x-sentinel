/**
 * Cookie Manager for X (Twitter)
 * Manages auth_token and ct0 cookies for browser automation sessions
 */

const logger = require('../logger');

class CookieManager {
  /**
   * Format and clean cookie strings
   */
  sanitizeToken(token) {
    if (!token) return '';
    return token.trim().replace(/^['"]|['"]$/g, '');
  }

  /**
   * Generate Playwright compatible cookie objects for .x.com
   * Host-scoped to .x.com only to prevent session tampering flags from duplicate cookies across domains.
   */
  getPlaywrightCookies(tokenOrSession, ct0Token = '') {
    const jar = [];
    const supportedCookies = [
      'auth_token',
      'ct0',
      'twid',
      'kdt',
      'att',
      'guest_id',
      'guest_id_marketing',
      'guest_id_ads',
      'personalization_id',
      '_twitter_sess',
      'external_referer',
      'd_prefs',
    ];

    let sessionObj = {};
    if (tokenOrSession && typeof tokenOrSession === 'object') {
      sessionObj = tokenOrSession;
    } else if (typeof tokenOrSession === 'string') {
      sessionObj.auth_token = tokenOrSession;
      if (ct0Token) sessionObj.ct0 = ct0Token;
    }

    for (const name of supportedCookies) {
      const rawVal = sessionObj[name];
      if (!rawVal) continue;
      const cleanVal = this.sanitizeToken(rawVal);
      if (!cleanVal) continue;

      jar.push({
        name,
        value: cleanVal,
        domain: '.x.com',
        path: '/',
        secure: true,
        // auth_token and _twitter_sess are protected httpOnly cookies; ct0 is CSRF token read by JS
        httpOnly: name === 'auth_token' || name === '_twitter_sess',
        sameSite: 'Lax',
        expires: -1, // Session cookie standard
      });
    }

    return jar;
  }

  /**
   * Apply cookies to Playwright browser context
   */
  async applyCookies(context, tokenOrSession, ct0) {
    const cookies = this.getPlaywrightCookies(tokenOrSession, ct0);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      logger.info(`Injected ${cookies.length} session cookies for X (.x.com)`);
      return true;
    }
    return false;
  }

  /**
   * Quick validate token format before launching browser
   */
  validateFormat(authToken, ct0) {
    const cleanAuth = this.sanitizeToken(authToken);
    const cleanCt0 = this.sanitizeToken(ct0);

    if (!cleanAuth) {
      return { valid: false, message: 'auth_token cannot be empty.' };
    }

    if (cleanAuth.length < 20) {
      return { valid: false, message: 'Invalid auth_token length (too short).' };
    }

    return { valid: true, cleanAuth, cleanCt0 };
  }
}

module.exports = new CookieManager();
