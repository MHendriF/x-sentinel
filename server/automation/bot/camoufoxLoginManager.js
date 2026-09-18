const fs = require('fs');
const path = require('path');
const config = require('../../config');
const db = require('../../db');
const logger = require('../../logger');
const proxyHelper = require('../proxyHelper');
const { closeBrowserResources } = require('./browserFactory');
const { sleep } = require('./humanCadence');

const activeLogins = new Map();

/**
 * Get profile directory for a specific account
 */
function getProfileDir(accountId) {
  return path.join(config.CAMOUFOX_PROFILES_DIR, accountId);
}

/**
 * Check if a Camoufox profile directory exists for an account
 */
function hasCamoufoxProfile(accountId) {
  const profileDir = getProfileDir(accountId);
  return fs.existsSync(profileDir);
}

/**
 * Calculate directory size recursively
 */
function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        total += getDirectorySize(fullPath);
      } else {
        try {
          total += fs.statSync(fullPath).size;
        } catch (e) {}
      }
    }
  } catch (e) {}
  return total;
}

/**
 * Get status of Camoufox profile for an account
 */
function getCamoufoxProfileStatus(accountId) {
  const profileDir = getProfileDir(accountId);
  const exists = fs.existsSync(profileDir);
  const account = db.getAccountById(accountId);

  if (!exists) {
    return {
      exists: false,
      accountId,
      profileDir,
      sizeBytes: 0,
      sizeFormatted: '0 B',
      lastLoginAt: account?.camoufoxProfile?.lastLoginAt || null,
      hasStorageState: false,
    };
  }

  const size = getDirectorySize(profileDir);
  const storageStatePath = path.join(profileDir, 'storage_state.json');
  const hasStorageState = fs.existsSync(storageStatePath);

  let sizeFormatted = `${(size / 1024).toFixed(1)} KB`;
  if (size > 1024 * 1024) {
    sizeFormatted = `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return {
    exists: true,
    accountId,
    profileDir,
    sizeBytes: size,
    sizeFormatted,
    lastLoginAt: account?.camoufoxProfile?.lastLoginAt || null,
    hasStorageState,
  };
}

/**
 * Delete / Reset Camoufox persistent profile for an account
 */
function deleteCamoufoxProfile(accountId) {
  const profileDir = getProfileDir(accountId);
  if (fs.existsSync(profileDir)) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
      logger.info(`🗑️ Camoufox persistent profile removed for node ID: ${accountId}`);
    } catch (err) {
      logger.warn(`⚠️ Failed to remove profile dir ${profileDir}: ${err.message}`);
    }
  }

  const account = db.getAccountById(accountId);
  if (account) {
    const updated = {
      ...account,
      camoufoxProfile: null,
    };
    db.saveAccount(updated);
  }

  return { success: true, message: 'Camoufox profile removed.' };
}

/**
 * Launch an interactive visible Camoufox browser session for user login
 * Automatically monitors navigation, captures native Firefox session tokens,
 * and persists the profile state.
 */
async function startCamoufoxLogin(account, options = {}) {
  const { timeoutMs = 300000 } = options; // Default 5 minutes

  if (!account || !account.id) {
    throw new Error('Invalid account specified for login.');
  }

  if (activeLogins.has(account.id)) {
    throw new Error('A Camoufox login window is already open for this account.');
  }

  const profileDir = getProfileDir(account.id);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const { Camoufox } = require('camoufox');

  const camoufoxOptions = {
    headless: false, // Visible window so operator can type credentials & 2FA
    os: 'windows',
    humanize: 0.5,
    window: [1280, 850],
    viewport: null, // Critical: prevent Juggler protocol schema error (isMobile) on persistent context
    block_webrtc: Boolean(account.proxy),
    data_dir: profileDir, // Isolated persistent profile for this account
    geoip: false, // Avoid external GitHub MaxMind download failures ("fetch failed" / corrupted 0-byte mmdb)
    config: {
      'window.screenX': 50,
      'window.screenY': 50,
    },
    i_know_what_im_doing: true,
  };

  if (account.proxy) {
    const proxyLaunch = proxyHelper.getPlaywrightLaunchProxy(account.proxy);
    if (proxyLaunch) {
      camoufoxOptions.proxy = proxyLaunch;
      logger.info(
        `🌐 [Camoufox Login] Routing login via Proxy for @${account.username || account.label}: ${proxyLaunch.server}`
      );
    }
  }

  logger.info(
    `🦊 [Camoufox Login] Launching visible login window for node @${account.username || account.label}...`
  );

  let instance = null;
  let browser = null;
  let context = null;
  let page = null;
  let loginCompleted = false;
  let loginError = null;

  activeLogins.set(account.id, { startedAt: Date.now() });

  try {
    instance = await Camoufox(camoufoxOptions);

    // In Camoufox, data_dir returns a BrowserContext (launchPersistentContext)
    const isContext = typeof instance.newPage === 'function';
    context = isContext ? instance : await instance.newContext();
    browser = isContext ? (typeof instance.browser === 'function' ? instance.browser() : null) : instance;

    const pages = context.pages();
    page = pages.length > 0 ? pages[0] : await context.newPage();
    page.setDefaultTimeout(35000);

    let windowClosed = false;
    page.on('close', () => {
      windowClosed = true;
    });

    logger.info(
      `🌐 [Camoufox Login] Navigating to X login flow... Please log in in the opened browser window.`
    );
    await page.goto('https://x.com/i/flow/login', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    }).catch(() => {});

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (windowClosed || page.isClosed()) {
        loginError = 'Browser window was closed before login was completed.';
        break;
      }

      // Check cookies in context
      const cookies = await context.cookies().catch(() => []);
      const authCookie = cookies.find((c) => c.name === 'auth_token');
      const ct0Cookie = cookies.find((c) => c.name === 'ct0');

      const currentUrl = typeof page.url === 'function' ? page.url() : '';

      // Check if logged in:
      // 1. auth_token cookie exists with valid length
      // 2. URL is /home, /explore, or not in login flow
      const hasAuthToken = Boolean(authCookie && authCookie.value && authCookie.value.length >= 20);
      const isPastLogin =
        currentUrl.includes('/home') ||
        currentUrl.includes('/explore') ||
        (!currentUrl.includes('/login') && !currentUrl.includes('/i/flow/login'));

      const hasSideNav = await page
        .$('[data-testid="SideNav_AccountSwitcher_Button"], [data-testid="AppTabBar_Profile_Link"]')
        .catch(() => null);

      if (hasAuthToken && (isPastLogin || hasSideNav)) {
        logger.info(`🎯 [Camoufox Login] Detected valid session! Finalizing profile state...`);
        await sleep(2500); // Allow post-login telemetry & storage to settle

        // Re-read latest cookies
        const finalCookies = await context.cookies().catch(() => []);
        const finalAuth = finalCookies.find((c) => c.name === 'auth_token') || authCookie;
        const finalCt0 = finalCookies.find((c) => c.name === 'ct0') || ct0Cookie;

        // Try extracting user handle from DOM
        let detectedUsername = '';
        let detectedName = '';
        let detectedAvatar = '';

        try {
          detectedUsername = await page
            .$eval('[data-testid="SideNav_AccountSwitcher_Button"] [dir="ltr"]', (el) =>
              el.innerText.replace('@', '').trim()
            )
            .catch(() => '');

          if (!detectedUsername) {
            const profileHref = await page
              .$eval('[data-testid="AppTabBar_Profile_Link"]', (el) => el.getAttribute('href'))
              .catch(() => '');
            if (profileHref && profileHref.startsWith('/')) {
              detectedUsername = profileHref.replace('/', '').split(/[?#]/)[0].trim();
            }
          }

          detectedName = await page
            .$eval('[data-testid="SideNav_AccountSwitcher_Button"] span', (el) =>
              el.innerText.trim()
            )
            .catch(() => '');

          detectedAvatar = await page
            .$eval('[data-testid="SideNav_AccountSwitcher_Button"] img', (el) => el.src)
            .catch(() => '');
        } catch (e) {
          // ignore extraction error
        }

        // Save storageState backup to disk
        const statePath = path.join(profileDir, 'storage_state.json');
        await context.storageState({ path: statePath }).catch(() => {});

        // Update account record in DB
        const existingAccount = db.getAccountById(account.id) || account;
        const updatedAccount = {
          ...existingAccount,
          auth_token: finalAuth.value,
          ct0: finalCt0 ? finalCt0.value : existingAccount.ct0 || '',
          username: detectedUsername || existingAccount.username || '',
          name: detectedName || existingAccount.name || '',
          avatar: detectedAvatar || existingAccount.avatar || '',
          isValid: true,
          healthStatus: 'HEALTHY',
          healthMessage: 'Camoufox native Firefox session verified healthy',
          lastChecked: new Date().toISOString(),
          lastCheckedAt: new Date().toISOString(),
          camoufoxProfile: {
            hasProfile: true,
            profileDir: profileDir,
            engine: 'camoufox',
            lastLoginAt: new Date().toISOString(),
          },
        };

        db.saveAccount(updatedAccount);
        logger.success(
          `🎉 [@${updatedAccount.username || updatedAccount.label}] Camoufox Login Successful! Native profile and session saved.`
        );

        loginCompleted = true;
        break;
      }

      await sleep(1500);
    }

    if (!loginCompleted && !loginError) {
      loginError = 'Camoufox login timed out after 5 minutes.';
    }
  } catch (err) {
    loginError = err.message;
    logger.error(`❌ [Camoufox Login] Error during login flow: ${err.message}`);
  } finally {
    activeLogins.delete(account.id);
    if (context) {
      await sleep(1000);
      await closeBrowserResources(browser, context, page);
    }
  }

  if (!loginCompleted) {
    throw new Error(loginError || 'Camoufox login failed.');
  }

  const refreshed = db.getAccountById(account.id);
  return {
    success: true,
    message: `Camoufox native login successful for @${refreshed?.username || account.label}! Dedicated profile saved.`,
    account: refreshed,
  };
}

module.exports = {
  getProfileDir,
  hasCamoufoxProfile,
  getCamoufoxProfileStatus,
  deleteCamoufoxProfile,
  startCamoufoxLogin,
};
