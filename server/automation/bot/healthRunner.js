const { chromium } = require('playwright');
const config = require('../../config');
const db = require('../../db');
const logger = require('../../logger');
const proxyHelper = require('../proxyHelper');
const cookieManager = require('../cookieManager');
const notifier = require('../notifier');
const { applyStealthScripts, launchAccountBrowser } = require('./browserFactory');
const { sleep } = require('./humanCadence');

/**
 * Verify account credentials and extract username / avatar
 */
async function verifyAccount(account) {
  let tempBrowser = null;
  try {
    logger.info(`🔍 Verifying account node: ${account.label} (@${account.username || 'unknown'})...`);

    const validation = cookieManager.validateFormat(account.auth_token, account.ct0);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        '--enforce-webrtc-ip-permission-check',
      ],
    };

    if (account.proxy) {
      const proxyLaunch = proxyHelper.getPlaywrightLaunchProxy(account.proxy);
      if (proxyLaunch) {
        launchOptions.proxy = proxyLaunch;
        logger.info(`🌐 Testing connection via Proxy: ${proxyLaunch.server}`);
      }
    }

    tempBrowser = await chromium.launch(launchOptions);
    const tempContext = await tempBrowser.newContext({
      userAgent: config.USER_AGENT,
      viewport: { width: 1280, height: 800 },
    });

    await applyStealthScripts(tempContext);
    await cookieManager.applyCookies(tempContext, account.auth_token, account.ct0);

    const page = await tempContext.newPage();
    page.setDefaultTimeout(30000);

    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const currentUrl = page.url();

    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      logger.error(`❌ Cookie for ${account.label} is invalid or expired.`);
      db.saveAccount({ ...account, isValid: false, lastChecked: new Date().toISOString() });
      return { success: false, message: 'auth_token cookie is invalid or expired.' };
    }

    let username = '';
    let name = '';
    let avatar = '';

    try {
      const accountSwitcher = await page
        .waitForSelector('[data-testid="SideNav_AccountSwitcher_Button"]', { timeout: 8000 })
        .catch(() => null);
      if (accountSwitcher) {
        const accountText = await accountSwitcher.innerText();
        const lines = accountText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          name = lines[0] || '';
          username = lines.find((l) => l.startsWith('@')) || '';
        }
        const imgEl = await accountSwitcher.$('img');
        if (imgEl) {
          avatar = await imgEl.getAttribute('src');
        }
      }
    } catch (e) {}

    if (!username) {
      const isHome = await page.$('[data-testid="primaryColumn"]');
      if (isHome) {
        username = account.username ? `@${account.username}` : '@ActiveUser';
        name = account.name || 'X User';
      }
    }

    if (username) {
      const updated = db.saveAccount({
        ...account,
        username: username.replace('@', ''),
        name: name || username,
        avatar: avatar || account.avatar || '',
        isValid: true,
        lastChecked: new Date().toISOString(),
      });

      logger.success(`🎉 Successfully connected to node: @${updated.username} (${updated.name})`);
      return { success: true, account: updated };
    } else {
      return { success: false, message: 'Failed to verify account. Please check cookie & proxy settings.' };
    }
  } catch (err) {
    logger.error(`❌ Verification error for ${account.label}: ${err.message}`);
    return { success: false, message: `Verification failed: ${err.message}` };
  } finally {
    if (tempBrowser) {
      await tempBrowser.close().catch(() => {});
    }
  }
}

/**
 * Check Health & Session Validity of a Single Account
 */
async function checkAccountHealth(account) {
  logger.info(`🩺 Inspecting node health: ${account.label} (@${account.username || 'user'})...`);

  // 1. Check Proxy connectivity first
  if (account.proxy) {
    const proxyRes = await proxyHelper.testProxy(account.proxy);
    if (!proxyRes.success) {
      logger.warn(
        `❌ [Proxy Dead] Node ${account.label} proxy unreachable: ${proxyRes.message}`
      );
      const updated = db.saveAccount({
        ...account,
        enabled: false,
        healthStatus: 'PROXY_DEAD',
        healthMessage: `Proxy dead: ${proxyRes.message}`,
        lastCheckedAt: new Date().toISOString(),
      });
      notifier.notify('PROXY_DEAD', {
        accountName: account.username || account.label,
        proxy: account.proxy,
      });
      return {
        success: false,
        healthStatus: 'PROXY_DEAD',
        account: updated,
        message: `Proxy unreachable (${proxyRes.message}). Node auto-paused.`,
      };
    }
  }

  // 2. Check Session Validity
  let browser = null;
  let context = null;
  try {
    const launchRes = await launchAccountBrowser(account, { headless: true });
    browser = launchRes.browser;
    context = launchRes.context;
    const page = await context.newPage();

    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      logger.warn(
        `⚠️ [Session Expired] auth_token cookie for node ${account.label} is no longer valid.`
      );
      const updated = db.saveAccount({
        ...account,
        healthStatus: 'EXPIRED',
        healthMessage: 'auth_token cookie has expired',
        lastCheckedAt: new Date().toISOString(),
      });
      notifier.notify('SESSION_EXPIRED', {
        accountName: account.username || account.label,
      });
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
      return {
        success: false,
        healthStatus: 'EXPIRED',
        account: updated,
        message: 'Account session expired. Please renew auth_token cookie.',
      };
    }

    let detectedUsername = account.username;
    try {
      const accountLink = await page.$('a[data-testid="AppTabBar_Profile_Link"]');
      if (accountLink) {
        const href = await accountLink.getAttribute('href');
        if (href && href.length > 1) {
          detectedUsername = href.replace('/', '').trim();
        }
      }
    } catch (e) {}

    const updated = db.saveAccount({
      ...account,
      username: detectedUsername || account.username,
      healthStatus: 'HEALTHY',
      healthMessage: 'Session active & verified healthy',
      lastCheckedAt: new Date().toISOString(),
    });

    logger.success(
      `✅ [Healthy] Node ${account.label} (@${detectedUsername || account.username}) is active & valid.`
    );
    await context.close().catch(() => {});
    await browser.close().catch(() => {});

    return {
      success: true,
      healthStatus: 'HEALTHY',
      account: updated,
      message: 'Session is active and verified healthy!',
    };
  } catch (err) {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    return {
      success: false,
      healthStatus: 'UNKNOWN_ERROR',
      message: `Error inspecting session: ${err.message}`,
    };
  }
}

/**
 * Mass Check Health of All Accounts
 */
async function checkFleetHealth() {
  const accounts = db.getAccounts();
  if (accounts.length === 0) {
    return { success: false, message: 'No registered accounts to inspect.' };
  }

  logger.info(`🩺 Initiating fleet health audit across ${accounts.length} nodes...`);
  const results = [];

  for (const acc of accounts) {
    try {
      const res = await checkAccountHealth(acc);
      results.push({ accountId: acc.id, label: acc.label, ...res });
    } catch (err) {
      results.push({ accountId: acc.id, label: acc.label, success: false, message: err.message });
    }
    await sleep(1500);
  }

  const healthyCount = results.filter((r) => r.healthStatus === 'HEALTHY').length;
  logger.success(
    `🏁 Fleet audit complete: ${healthyCount}/${accounts.length} nodes are healthy.`
  );

  return {
    success: true,
    total: accounts.length,
    healthy: healthyCount,
    results,
  };
}

/**
 * Run Warmup Routine for an Account (Day 1-7)
 */
async function executeWarmupProtocol(account, abortSignal = null) {
  const currentDay = Math.min(Math.max(Number(account.warmupDay) || 1, 1), 7);
  logger.action(
    `🐣 [@${account.username || account.label}] Starting warm-up routine Day ${currentDay}/7...`
  );

  let browser = null;
  let context = null;

  try {
    const launchRes = await launchAccountBrowser(account);
    browser = launchRes.browser;
    context = launchRes.context;
    const page = await context.newPage();

    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    if (page.url().includes('/login')) {
      throw new Error('Account session expired');
    }

    // 1. Natural Timeline Scrolling
    const scrollCount = 2 + currentDay;
    for (let s = 0; s < scrollCount; s++) {
      if (abortSignal?.aborted) break;
      logger.info(
        `📜 [@${account.username || account.label}] Organic timeline scroll (${s + 1}/${scrollCount})...`
      );
      await page.mouse.wheel(0, 300 + Math.random() * 400);
      await sleep(2000 + Math.random() * 3000, abortSignal);
    }

    // 2. Organic Likes based on warmup day tier
    const targetLikes = Math.min(2 + currentDay, 8);
    let likesDone = 0;

    const likeButtons = await page.$$('button[data-testid="like"]');
    for (const btn of likeButtons) {
      if (abortSignal?.aborted || likesDone >= targetLikes) break;
      try {
        await btn.scrollIntoViewIfNeeded();
        await sleep(1000 + Math.random() * 1500, abortSignal);
        await btn.click();
        likesDone++;
        logger.success(
          `❤️ [@${account.username || account.label}] Organic post like (${likesDone}/${targetLikes})`
        );
        await sleep(3000 + Math.random() * 4000, abortSignal);
      } catch (e) {}
    }

    // 3. Increment warmup day progress
    const nextDay = currentDay < 7 ? currentDay + 1 : 7;
    const updated = db.saveAccount({
      ...account,
      warmupDay: nextDay,
      lastWarmupAt: new Date().toISOString(),
    });

    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      action: 'WARMUP',
      status: 'SUCCESS',
      details: `Warm-up Day ${currentDay} completed: ${likesDone} organic likes`,
    });

    notifier.notify('WARMUP_DAY_COMPLETED', {
      accountName: account.username || account.label,
      day: currentDay,
      activity: `${likesDone} organic likes & ${scrollCount} timeline scrolls`,
    });

    await context.close().catch(() => {});
    await browser.close().catch(() => {});

    logger.success(
      `🎉 [@${account.username || account.label}] Warm-up Day ${currentDay} completed successfully! (Advancing to Day ${nextDay})`
    );

    return {
      success: true,
      day: currentDay,
      nextDay,
      likesDone,
      account: updated,
      message: `Warm-up Day ${currentDay} completed successfully!`,
    };
  } catch (err) {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    logger.error(`❌ [@${account.username || account.label}] Warm-up routine failed: ${err.message}`);
    return { success: false, message: err.message };
  }
}

module.exports = {
  verifyAccount,
  checkAccountHealth,
  checkFleetHealth,
  executeWarmupProtocol,
};
