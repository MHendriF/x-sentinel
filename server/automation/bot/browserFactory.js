const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const config = require('../../config');
const db = require('../../db');
const logger = require('../../logger');
const proxyHelper = require('../proxyHelper');
const cookieManager = require('../cookieManager');
const { patchPlaywright } = require('./patchPlaywright');

// Hotfix: Ensure Playwright driver handles undefined location in Firefox/Camoufox
patchPlaywright();

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
    os: 'windows', // Lock OS to Windows to prevent random OS jumping (macOS/Linux) across runs
    humanize: 0.5, // Enable native C++ bezier human mouse trajectories
    window: [1280, 850], // Standard desktop window dimensions
    viewport: null, // Critical: prevent Juggler protocol schema error (isMobile) on persistent context
    block_webrtc: Boolean(account.proxy), // Prevent WebRTC IP leaks when running via proxy
    geoip: false, // Avoid external GitHub MaxMind download failures ("fetch failed" / corrupted 0-byte mmdb)
    config: {
      'window.screenX': 0,
      'window.screenY': 0,
    },
    i_know_what_im_doing: true,
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

  const profileDir = path.join(config.CAMOUFOX_PROFILES_DIR, account.id);
  const hasPersistentProfile = fs.existsSync(profileDir);

  if (hasPersistentProfile) {
    camoufoxOptions.data_dir = profileDir;
    logger.info(
      `🦊 [@${account.username || account.label}] Loading dedicated Camoufox persistent profile: ${account.id}`
    );
  }

  logger.info(
    `🦊 Launching Camoufox (Anti-Detect Firefox) for node @${account.username || account.label} (Headless: ${isHeadless ? 'Enabled' : 'Disabled'}, Profile: ${hasPersistentProfile ? 'Persistent' : 'Ephemeral'})...`
  );

  const instance = await Camoufox(camoufoxOptions);

  if (hasPersistentProfile) {
    // In Camoufox, data_dir returns a BrowserContext directly from launchPersistentContext
    const context = instance;
    const browser = typeof instance.browser === 'function' ? instance.browser() : null;
    return { browser, context, engine: 'camoufox', isPersistent: true };
  }

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

  const browser = instance;
  const context = await browser.newContext(contextOptions);

  if (account.auth_token) {
    await cookieManager.applyCookies(context, account.auth_token, account.ct0);
  }

  return { browser, context, engine: 'camoufox', isPersistent: false };
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

  // Smart Engine Routing: Strictly prioritize Chromium unless explicitly overridden by options, account, or settings
  const requestedEngine = (
    options.engine ||
    account.browserEngine ||
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
 * Obtain primary active page from browser context, reusing initial persistent page if available
 * and pruning any lingering secondary pages.
 */
async function getContextPrimaryPage(context, defaultTimeoutMs = 35000) {
  if (!context) return null;
  const pages = typeof context.pages === 'function' ? context.pages() : [];
  let page = null;
  if (pages.length > 0) {
    page = pages[0];
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close().catch(() => {});
    }
  } else {
    page = await context.newPage();
  }
  if (page && typeof page.setDefaultTimeout === 'function') {
    page.setDefaultTimeout(defaultTimeoutMs);
  }
  return page;
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
    if (browser && browser !== context) {
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

/**
 * Test browser launch and verify evasion/stealth features in headless mode
 */
async function testBrowserLaunch(engine = 'chromium') {
  const startTime = Date.now();
  let browserInstance = null;
  let contextInstance = null;

  try {
    const isCamoufox = engine === 'camoufox';
    if (isCamoufox) {
      const { Camoufox } = require('camoufox');
      browserInstance = await Camoufox({
        headless: true,
        i_know_what_im_doing: true,
        window: [1280, 850],
        config: {
          'window.screenX': 0,
          'window.screenY': 0,
        },
      });
      contextInstance = await browserInstance.newContext({ viewport: null });
    } else {
      browserInstance = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });
      contextInstance = await browserInstance.newContext({
        userAgent: config.USER_AGENT,
        viewport: { width: 1280, height: 850 },
      });
      await applyStealthScripts(contextInstance);
    }

    const page = await contextInstance.newPage();
    const stealthReport = await page.evaluate(() => {
      return {
        webdriverMasked: navigator.webdriver === undefined || navigator.webdriver === false,
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        deviceMemory: navigator.deviceMemory || null,
        languages: navigator.languages || [],
      };
    });

    await page.close().catch(() => {});
    await closeBrowserResources(browserInstance, contextInstance);

    const duration = Date.now() - startTime;
    return {
      success: true,
      duration,
      engine,
      stealth: stealthReport,
      message: `${isCamoufox ? 'Camoufox Anti-Detect' : 'Chromium Core'} verified successfully in ${duration}ms.`,
    };
  } catch (err) {
    if (browserInstance || contextInstance) {
      await closeBrowserResources(browserInstance, contextInstance);
    }
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      engine,
      error: err.message,
      message: `Failed to launch ${engine}: ${err.message}`,
    };
  }
}

module.exports = {
  applyStealthScripts,
  launchChromiumBrowser,
  launchCamoufoxBrowser,
  launchAccountBrowser,
  getContextPrimaryPage,
  closeBrowserResources,
  testBrowserLaunch,
};
