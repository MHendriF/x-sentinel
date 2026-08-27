/**
 * Cookie Manager for X (Twitter)
 * Manages auth_token and ct0 cookies for browser automation sessions
 */

const db = require('../db');
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
   * Generate Playwright compatible cookie objects for .x.com and .twitter.com
   */
  getPlaywrightCookies(authToken, ct0) {
    const cleanAuth = this.sanitizeToken(authToken);
    const cleanCt0 = this.sanitizeToken(ct0);

    if (!cleanAuth) return [];

    const domains = ['.x.com', '.twitter.com'];
    const cookies = [];

    domains.forEach((domain) => {
      cookies.push({
        name: 'auth_token',
        value: cleanAuth,
        domain: domain,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      });

      if (cleanCt0) {
        cookies.push({
          name: 'ct0',
          value: cleanCt0,
          domain: domain,
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'Lax',
        });
      }
    });

    return cookies;
  }

  /**
   * Apply cookies to Playwright browser context
   */
  async applyCookies(context, authToken, ct0) {
    const cookies = this.getPlaywrightCookies(authToken, ct0);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      logger.info(`Injected ${cookies.length} session cookies for X (.x.com & .twitter.com)`);
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
      return { valid: false, message: 'auth_token tidak boleh kosong.' };
    }

    if (cleanAuth.length < 20) {
      return { valid: false, message: 'Panjang auth_token tidak valid (terlalu pendek).' };
    }

    return { valid: true, cleanAuth, cleanCt0 };
  }
}

module.exports = new CookieManager();
