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
async function launchChromiumBrowser(account, _options = {}, isHeadless = false) {
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
        `🌐 Routing via Proxy for @${account.username || account.label}: ${proxyLaunch.server}`
      );
    }
  }

  logger.info(
    `🚀 Launching Chromium for node @${account.username || account.label} (Headless: ${isHeadless ? 'Enabled' : 'Disabled'})...`
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

  return { browser, context, engine: 'chromium' };
}

/**
 * Launch an anti-detect Camoufox (C++ Modified Firefox) instance and context for a node account
 */
async function launchCamoufoxBrowser(account, _options = {}, isHeadless = false) {
  const { Camoufox } = require('camoufox');

  const camoufoxOptions = {
    headless: isHeadless,
    humanize: 0.5, // Enable native C++ bezier human mouse trajectories
    window: [1280, 850], // Standard desktop window dimensions
    block_webrtc: Boolean(account.proxy), // Prevent WebRTC IP leaks when running via proxy
  };

  if (account.proxy) {
    const proxyLaunch = proxyHelper.getPlaywrightLaunchProxy(account.proxy);
    if (proxyLaunch) {
      camoufoxOptions.proxy = proxyLaunch;
      logger.info(
        `🌐 Routing via Proxy for @${account.username || account.label}: ${proxyLaunch.server}`
      );
    }
  }

  logger.info(
    `🦊 Launching Camoufox (Anti-Detect Firefox) for node @${account.username || account.label} (Headless: ${isHeadless ? 'Enabled' : 'Disabled'})...`
  );

  const browser = await Camoufox(camoufoxOptions);

  // In Camoufox, viewport: null allows Camoufox's native C++ spoofed geometry without triggering Juggler protocol schema errors
  const contextOptions = {
    viewport: null,
  };

  // Only assign explicit timezone when NOT proxied, using dynamic host timezone to prevent IP/timezone mismatch
  if (!account.proxy) {
    try {
      contextOptions.timezoneId =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
    } catch {
      contextOptions.timezoneId = 'Asia/Jakarta';
    }
    contextOptions.locale = 'en-US';
  }

  const context = await browser.newContext(contextOptions);

  if (account.auth_token) {
    await cookieManager.applyCookies(context, account.auth_token, account.ct0);
  }

  return { browser, context, engine: 'camoufox' };
}

/**
 * Router to launch browser instance using selected engine (Chromium or Camoufox) with graceful fallback
 */
async function launchAccountBrowser(account, options = {}) {
  if (!account) {
    throw new Error('Account node not found or not selected.');
  }

  const settings = db.getSettings() || {};
  const isHeadless = options.headless !== undefined ? options.headless : Boolean(settings.headless);
  const requestedEngine = (
    account.browserEngine ||
    options.engine ||
    settings.browserEngine ||
    'chromium'
  ).toLowerCase();

  if (requestedEngine === 'camoufox') {
    try {
      return await launchCamoufoxBrowser(account, options, isHeadless);
    } catch (camoufoxErr) {
      logger.warn(
        `⚠️ Failed to launch Camoufox engine: ${camoufoxErr.message}. Gracefully falling back to Chromium...`
      );
      return await launchChromiumBrowser(account, options, isHeadless);
    }
  }

  return await launchChromiumBrowser(account, options, isHeadless);
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
      if (proc && !proc.killed && proc.pid) {
        try {
          if (process.platform === 'win32') {
            const { exec } = require('child_process');
            exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
          } else {
            proc.kill('SIGKILL');
          }
        } catch {}
      }
    }
  } catch (e) {
    // ignore teardown errors
  }
}

module.exports = {
  applyStealthScripts,
  launchChromiumBrowser,
  launchCamoufoxBrowser,
  launchAccountBrowser,
  closeBrowserResources,
};
