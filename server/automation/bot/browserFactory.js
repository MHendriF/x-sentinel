const crypto = require('crypto');
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

function detectHostOs() {
  if (process.platform === 'win32') return 'win';
  if (process.platform === 'darwin') return 'mac';
  return 'linux';
}

function seeded(seedStr) {
  const h = crypto.createHash('sha256').update(String(seedStr)).digest();
  return (n) => h[n % h.length];
}

const RENDERERS = [
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)',
];

const VIEWPORTS = [
  { width: 1280, height: 850 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1600, height: 900 },
];

/**
 * Build a consistent, deterministic identity per account node.
 * Prevents contradictory Client Hints and identical fleet hardware clustering.
 */
function buildIdentity(account = {}, egressGeo = null) {
  const accId = account?.id || account?.username || account?.label || 'default_node';
  const os = detectHostOs();
  const ver = 126 + (seeded(accId + ':ver')(2) % 6); // 126..131

  const profiles = {
    win: {
      ua: (v) =>
        `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      platform: 'Win32',
      uaPlatform: 'Windows',
      uaPlatformVersion: '15.0.0',
    },
    mac: {
      ua: (v) =>
        `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      platform: 'MacIntel',
      uaPlatform: 'macOS',
      uaPlatformVersion: '14.5.0',
    },
    linux: {
      ua: (v) =>
        `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      platform: 'Linux x86_64',
      uaPlatform: 'Linux',
      uaPlatformVersion: '',
    },
  };

  const core = profiles[os] || profiles.win;

  let hostTimezone = 'Asia/Jakarta';
  try {
    hostTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  } catch {}

  const timezoneId = egressGeo?.timezone || hostTimezone;
  const locale = egressGeo?.locale || 'en-US';
  const languages =
    egressGeo?.languages ||
    (locale !== 'en-US' ? [locale, 'en-US', 'en'] : ['en-US', 'en']);

  const cores = [4, 6, 8, 12, 16][seeded(accId + ':cores')(0) % 5];
  const memory = [4, 8, 16, 32][seeded(accId + ':mem')(1) % 4];
  const gpuRenderer = RENDERERS[seeded(accId + ':gpu')(3) % RENDERERS.length];
  const viewport = VIEWPORTS[seeded(accId + ':vp')(4) % VIEWPORTS.length];

  return {
    ua: core.ua(ver),
    chromeVersion: ver,
    platform: core.platform,
    uaFullVersion: `${ver}.0.0.0`,
    uaPlatform: core.uaPlatform,
    uaPlatformVersion: core.uaPlatformVersion,
    secChUa: `"Chromium";v="${ver}", "Not.A/Brand";v="24", "Google Chrome";v="${ver}"`,
    secChUaMobile: '?0',
    secChUaPlatform: `"${core.uaPlatform}"`,
    timezoneId,
    locale,
    languages,
    cores,
    memory,
    gpuVendor: 'Google Inc. (NVIDIA)',
    gpuRenderer,
    viewport,
  };
}

/**
 * Apply stealth evasion scripts to Chromium context
 */
async function applyStealthScripts(context, identity = null) {
  const id = identity || buildIdentity({ id: 'ephemeral' });
  await context.addInitScript((ident) => {
    // 1. Mask navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });

    // 2. Clean modern window.chrome (without deprecated loadTimes/csi)
    window.chrome = {
      runtime: {},
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

    // 4. Mock platform & languages
    Object.defineProperty(navigator, 'platform', {
      get: () => ident.platform,
      configurable: true,
    });

    Object.defineProperty(navigator, 'languages', {
      get: () => ident.languages,
      configurable: true,
    });

    // 5. Seeded realistic hardware concurrency & memory
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => ident.cores,
      configurable: true,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => ident.memory,
      configurable: true,
    });

    // 6. Modern userAgentData & Client Hints spoofing
    if (navigator.userAgentData) {
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({
          brands: [
            { brand: 'Chromium', version: String(ident.chromeVersion) },
            { brand: 'Not.A/Brand', version: '24' },
            { brand: 'Google Chrome', version: String(ident.chromeVersion) },
          ],
          mobile: false,
          platform: ident.uaPlatform,
          getHighEntropyValues: async () => ({
            platform: ident.uaPlatform,
            platformVersion: ident.uaPlatformVersion,
            uaFullVersion: ident.uaFullVersion,
            architecture: 'x86',
            bitness: '64',
            model: '',
          }),
        }),
        configurable: true,
      });
    }

    // 7. Mock WebGL Vendor & Renderer with seeded GPU
    try {
      if (typeof window.WebGLRenderingContext !== 'undefined') {
        const getParameterProto = window.WebGLRenderingContext.prototype.getParameter;
        window.WebGLRenderingContext.prototype.getParameter = function (parameter) {
          if (parameter === 37445) return ident.gpuVendor;
          if (parameter === 37446) return ident.gpuRenderer;
          return getParameterProto.apply(this, arguments);
        };
      }
      if (typeof window.WebGL2RenderingContext !== 'undefined') {
        const getParameterProto2 = window.WebGL2RenderingContext.prototype.getParameter;
        window.WebGL2RenderingContext.prototype.getParameter = function (parameter) {
          if (parameter === 37445) return ident.gpuVendor;
          if (parameter === 37446) return ident.gpuRenderer;
          return getParameterProto2.apply(this, arguments);
        };
      }
    } catch (e) {}

    // 8. Mock Notification Permissions
    if (window.navigator.permissions) {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    }
  }, id);
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

  const egressGeo = account.proxy ? await proxyHelper.getAccountGeo(account) : null;
  const identity = buildIdentity(account, egressGeo);

  const context = await browser.newContext({
    userAgent: identity.ua,
    viewport: identity.viewport,
    locale: identity.locale,
    timezoneId: identity.timezoneId,
    extraHTTPHeaders: {
      'sec-ch-ua': identity.secChUa,
      'sec-ch-ua-mobile': identity.secChUaMobile,
      'sec-ch-ua-platform': identity.secChUaPlatform,
    },
  });

  await applyStealthScripts(context, identity);

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
  buildIdentity,
  applyStealthScripts,
  launchChromiumBrowser,
  launchCamoufoxBrowser,
  launchAccountBrowser,
  getContextPrimaryPage,
  closeBrowserResources,
  testBrowserLaunch,
};
