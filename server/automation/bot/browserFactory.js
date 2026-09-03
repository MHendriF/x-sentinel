const { chromium } = require('playwright');
const config = require('../../config');
const db = require('../../db');
const logger = require('../../logger');
const proxyHelper = require('../proxyHelper');
const cookieManager = require('../cookieManager');

/**
 * Apply stealth evasion scripts to Chromium context
 */
async function applyStealthScripts(context) {
  await context.addInitScript(() => {
    // 1. Mask navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });

    // 2. Mock window.chrome runtime
    window.chrome = {
      runtime: {},
      loadTimes: function () {},
      csi: function () {},
      app: {},
    };

    // 3. Mock navigator.plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        {
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format',
        },
        {
          name: 'Chrome PDF Viewer',
          filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
          description: '',
        },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ],
      configurable: true,
    });

    // 4. Mock languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en', 'id'],
      configurable: true,
    });

    // 5. Mock realistic hardware concurrency & memory
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });

    // 6. Mock WebGL Vendor & Renderer (Spoof to hardware GPU)
    try {
      const getParameterProto = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) return 'Google Inc. (NVIDIA)';
        if (parameter === 37446)
          return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        return getParameterProto.apply(this, arguments);
      };
    } catch (e) {}

    // 7. Mock Notification Permissions
    if (window.navigator.permissions) {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    }
  });
}

/**
 * Launch an isolated Playwright Chromium instance and context for a node account
 */
async function launchAccountBrowser(account, options = {}) {
  if (!account) {
    throw new Error('Akun tidak ditemukan atau belum dipilih.');
  }

  const settings = db.getSettings() || {};
  const isHeadless = options.headless !== undefined ? options.headless : Boolean(settings.headless);

  const launchOptions = {
    headless: isHeadless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1280,850',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--enforce-webrtc-ip-permission-check',
    ],
  };

  if (account.proxy) {
    const proxyLaunch = proxyHelper.getPlaywrightLaunchProxy(account.proxy);
    if (proxyLaunch) {
      launchOptions.proxy = proxyLaunch;
      logger.info(
        `🌐 Menggunakan Proxy untuk @${account.username || account.label}: ${proxyLaunch.server}`
      );
    }
  }

  logger.info(
    `🚀 Membuka browser untuk akun @${account.username || account.label} (Headless: ${isHeadless ? 'Aktif' : 'Nonaktif'})...`
  );
  const browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({
    userAgent: config.USER_AGENT,
    viewport: { width: 1280, height: 850 },
    locale: 'en-US',
    timezoneId: 'Asia/Jakarta',
  });

  await applyStealthScripts(context);

  if (account.auth_token) {
    await cookieManager.applyCookies(context, account.auth_token, account.ct0);
  }

  return { browser, context };
}

/**
 * Safely teardown browser resources with timeout watchdog to prevent hanging zombie processes
 */
async function closeBrowserResources(browser, context, page) {
  const closeWithTimeout = (promise, ms = 4000) =>
    Promise.race([promise.catch(() => {}), new Promise((resolve) => setTimeout(resolve, ms))]);

  try {
    if (page && !page.isClosed()) {
      await closeWithTimeout(page.close());
    }
    if (context) {
      await closeWithTimeout(context.close());
    }
    if (browser) {
      const proc = typeof browser.process === 'function' ? browser.process() : null;
      await closeWithTimeout(browser.close());
      if (proc && !proc.killed) {
        try {
          proc.kill('SIGKILL');
        } catch {}
      }
    }
  } catch (e) {
    // ignore teardown errors
  }
}

module.exports = {
  applyStealthScripts,
  launchAccountBrowser,
  closeBrowserResources,
};
