/**
 * Proxy Helper for Playwright Automation
 * Parses various proxy formats and formats them for Playwright browser launch
 */

class ProxyHelper {
  /**
   * Parse proxy string into Playwright proxy object
   * Supported formats:
   * 1. http://username:password@host:port
   * 2. host:port:username:password
   * 3. http://host:port
   * 4. socks5://username:password@host:port
   * 5. socks5://host:port
   */
  parseProxy(proxyString) {
    if (!proxyString || typeof proxyString !== 'string' || !proxyString.trim()) {
      return null;
    }

    const trimmed = proxyString.trim();

    try {
      // Format: host:port:username:password
      const parts = trimmed.split(':');
      if (parts.length === 4 && !trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('socks5://')) {
        const [host, port, username, password] = parts;
        return {
          server: `http://${host}:${port}`,
          username: username.trim(),
          password: password.trim(),
          raw: trimmed
        };
      }

      // Format: host:port
      if (parts.length === 2 && !trimmed.includes('://')) {
        const [host, port] = parts;
        return {
          server: `http://${host}:${port}`,
          raw: trimmed
        };
      }

      // Standard URL format (http://, https://, socks5://)
      let urlStr = trimmed;
      if (!urlStr.includes('://')) {
        urlStr = `http://${urlStr}`;
      }

      const parsedUrl = new URL(urlStr);
      const protocol = parsedUrl.protocol; // http:, https:, socks5:
      const host = parsedUrl.hostname;
      const port = parsedUrl.port;
      const username = parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined;
      const password = parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined;

      const server = `${protocol}//${host}${port ? `:${port}` : ''}`;

      const result = { server, raw: trimmed };
      if (username) result.username = username;
      if (password) result.password = password;

      return result;
    } catch (err) {
      console.error('Error parsing proxy string:', err.message);
      return null;
    }
  }

  /**
   * Test proxy connection and fetch GeoIP data with latency measurement
   */
  async testProxy(proxyString) {
    const parsed = this.getPlaywrightLaunchProxy(proxyString);
    if (!parsed) {
      return { success: false, message: 'Format proxy tidak valid atau kosong.' };
    }

    const { request } = require('playwright');
    const startTime = Date.now();

    try {
      const apiContext = await request.newContext({
        proxy: parsed,
        timeout: 8000
      });

      const response = await apiContext.get('http://ip-api.com/json', { timeout: 8000 });
      const latency = Date.now() - startTime;

      if (response.ok()) {
        const data = await response.json();
        await apiContext.dispose();
        return {
          success: true,
          latency,
          ip: data.query,
          country: data.country,
          countryCode: data.countryCode,
          city: data.city,
          isp: data.isp || data.org,
          status: 'ALIVE'
        };
      } else {
        await apiContext.dispose();
        return {
          success: false,
          latency,
          message: `Proxy HTTP Error: ${response.status()}`,
          status: 'DEAD'
        };
      }
    } catch (err) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        latency,
        message: err.message.includes('timeout') ? 'Connection Timeout (8s)' : err.message,
        status: 'DEAD'
      };
    }
  }
}

module.exports = new ProxyHelper();
