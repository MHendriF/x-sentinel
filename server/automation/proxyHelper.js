/**
 * Proxy Helper for Playwright Automation
 * Robust parser for all proxy formats:
 * 1. user:pass@ip:port (e.g. username:password@103.145.2.1:8080)
 * 2. http://user:pass@ip:port / socks5://user:pass@ip:port
 * 3. ip:port:user:pass (e.g. 103.145.2.1:8080:username:password)
 * 4. user:pass:ip:port (e.g. username:password:103.145.2.1:8080)
 * 5. ip:port (e.g. 103.145.2.1:8080)
 * 6. http://ip:port / socks5://ip:port
 */

class ProxyHelper {
  /**
   * Parse proxy string into Playwright proxy object
   */
  parseProxy(proxyString) {
    if (!proxyString || typeof proxyString !== 'string' || !proxyString.trim()) {
      return null;
    }

    const trimmed = proxyString.trim();

    try {
      let protocol = 'http:';
      let cleanStr = trimmed;

      if (trimmed.startsWith('socks5://')) {
        protocol = 'socks5:';
        cleanStr = trimmed.slice(9);
      } else if (trimmed.startsWith('socks4://')) {
        protocol = 'socks4:';
        cleanStr = trimmed.slice(9);
      } else if (trimmed.startsWith('http://')) {
        protocol = 'http:';
        cleanStr = trimmed.slice(7);
      } else if (trimmed.startsWith('https://')) {
        protocol = 'https:';
        cleanStr = trimmed.slice(8);
      }

      // Case 1: user:pass@ip:port
      if (cleanStr.includes('@')) {
        const lastAtIndex = cleanStr.lastIndexOf('@');
        const authPart = cleanStr.slice(0, lastAtIndex);
        const hostPart = cleanStr.slice(lastAtIndex + 1);

        const firstColonIndex = authPart.indexOf(':');
        let username = authPart;
        let password = '';
        if (firstColonIndex !== -1) {
          username = authPart.slice(0, firstColonIndex);
          password = authPart.slice(firstColonIndex + 1);
        }

        const lastColonIndex = hostPart.lastIndexOf(':');
        let host = hostPart;
        let port = '';
        if (lastColonIndex !== -1) {
          host = hostPart.slice(0, lastColonIndex);
          port = hostPart.slice(lastColonIndex + 1);
        }

        const server = `${protocol}//${host}${port ? `:${port}` : ''}`;
        const result = { server, raw: trimmed };
        if (username) result.username = username;
        if (password) result.password = password;
        return result;
      }

      // Case 2: 4-part colon separated (host:port:user:pass OR user:pass:host:port)
      const parts = cleanStr.split(':');
      if (parts.length === 4) {
        // If 1st part is host (looks like IP or domain e.g. contains dot or is localhost)
        const isFirstPartHost = parts[0].includes('.') || parts[0] === 'localhost';
        const isThirdPartHost = parts[2].includes('.') || parts[2] === 'localhost';

        if (isFirstPartHost && !isNaN(Number(parts[1]))) {
          // host:port:user:pass
          const [host, port, username, password] = parts;
          return {
            server: `${protocol}//${host}:${port}`,
            username: username.trim(),
            password: password.trim(),
            raw: trimmed,
          };
        } else if (isThirdPartHost && !isNaN(Number(parts[3]))) {
          // user:pass:host:port
          const [username, password, host, port] = parts;
          return {
            server: `${protocol}//${host}:${port}`,
            username: username.trim(),
            password: password.trim(),
            raw: trimmed,
          };
        } else {
          // Default fallback to host:port:user:pass
          const [host, port, username, password] = parts;
          return {
            server: `${protocol}//${host}:${port}`,
            username: username.trim(),
            password: password.trim(),
            raw: trimmed,
          };
        }
      }

      // Case 3: 2-part colon separated (host:port)
      if (parts.length === 2) {
        const [host, port] = parts;
        return {
          server: `${protocol}//${host}:${port}`,
          raw: trimmed,
        };
      }

      // Case 4: Standard single host or URL
      return {
        server: `${protocol}//${cleanStr}`,
        raw: trimmed,
      };
    } catch (err) {
      console.error('Error parsing proxy string:', err.message);
      return null;
    }
  }

  /**
   * Format for Playwright launch option
   */
  getPlaywrightLaunchProxy(proxyString) {
    const parsed = this.parseProxy(proxyString);
    if (!parsed) return undefined;

    const proxyConfig = {
      server: parsed.server,
    };

    if (parsed.username) proxyConfig.username = parsed.username;
    if (parsed.password) proxyConfig.password = parsed.password;

    return proxyConfig;
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
        timeout: 8000,
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
          status: 'ALIVE',
        };
      } else {
        const status = response.status();
        await apiContext.dispose();
        let message = `Proxy HTTP Error: ${status}`;
        if (status === 407) {
          message =
            'Proxy Auth Failed (407): Username atau Password proxy salah / IP belum di-whitelist.';
        } else if (status === 403) {
          message = 'Proxy Forbidden (403): Akses ke target ditolak oleh proxy provider.';
        } else if (status === 502 || status === 503) {
          message = `Proxy Bad Gateway (${status}): Server proxy sedang offline.`;
        }
        return {
          success: false,
          latency,
          message,
          status: 'DEAD',
        };
      }
    } catch (err) {
      const latency = Date.now() - startTime;
      let msg = err.message;
      if (msg.includes('timeout')) {
        msg = 'Connection Timeout (8s): Server proxy tidak merespon.';
      } else if (msg.includes('ECONNREFUSED')) {
        msg = 'Connection Refused: IP / Port proxy tidak aktif.';
      } else if (msg.includes('ENOTFOUND')) {
        msg = 'Host Not Found: Domain / IP proxy tidak valid.';
      }
      return {
        success: false,
        latency,
        message: msg,
        status: 'DEAD',
      };
    }
  }
}

module.exports = new ProxyHelper();
