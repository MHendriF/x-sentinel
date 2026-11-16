/**
 * X-SENTINEL Node Browser Automation Sidecar (Option 1A)
 * Executes Playwright Chromium & Camoufox C++ browser operations via newline-delimited JSON-RPC over stdin/stdout.
 * stdout is strictly reserved for JSON-RPC messages; all console output routes to stderr.
 */

const path = require('path');
const readline = require('readline');

// Reserve stdout exclusively for JSON-RPC frames
const rawStdoutWrite = process.stdout.write.bind(process.stdout);
const sendPacket = (packet) => {
  try {
    rawStdoutWrite(`${JSON.stringify(packet)}\n`);
  } catch {
    // ignore broken pipe on shutdown
  }
};

const writeStderr = (...args) => {
  try {
    const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    process.stderr.write(`${line}\n`);
  } catch {}
};

console.log = writeStderr;
console.info = writeStderr;
console.warn = writeStderr;
console.error = writeStderr;

// Configure shared DATA_DIR before importing db/twitterBot singletons
const config = require('../server/config');
const envDataDir = process.env.X_SENTINEL_DATA_DIR;
if (envDataDir && envDataDir.trim()) {
  const resolved = path.resolve(envDataDir.trim());
  config.DATA_DIR = resolved;
  config.USER_DATA_DIR = path.join(resolved, 'browser_profile');
  config.CAMOUFOX_PROFILES_DIR = path.join(resolved, 'camoufox_profiles');
}

const db = require('../server/db');
const logger = require('../server/logger');
const twitterBot = require('../server/automation/twitterBot');
const browserFactory = require('../server/automation/bot/browserFactory');
const camoufoxLoginManager = require('../server/automation/bot/camoufoxLoginManager');

// Prevent worker logger from double-writing the daily log file owned by Rust,
// while still streaming live log entries back to Rust LogHub.
logger.writeToFile = () => {};
logger.on('log', (entry) => {
  sendPacket({ event: 'log', data: entry });
});

// Stream task progress snapshots while any browser task is active
setInterval(() => {
  if (twitterBot.isRunning) {
    sendPacket({
      event: 'task_status',
      data: {
        isRunning: twitterBot.isRunning,
        isPaused: twitterBot.isPaused,
        pauseReason: twitterBot.pauseReason,
        currentTask: twitterBot.currentTask,
      },
    });
  }
}, 500);

function syncDbFromDisk() {
  if (typeof db.loadAll === 'function') {
    db.loadAll();
  }
}

async function handleRequest(msg) {
  const { id, cmd, params = {} } = msg;

  try {
    syncDbFromDisk();

    let result;
    switch (cmd) {
      case 'ping':
        result = { ok: true, pid: process.pid };
        break;

      case 'test_browser':
        result = await browserFactory.testBrowserLaunch(
          params.engine || params.browserEngine || 'chromium'
        );
        break;

      case 'verify_account': {
        const account = params.account || db.getAccountById(params.accountId || params.id);
        if (!account) throw new Error('Account not found.');
        result = await twitterBot.verifyAccount(account);
        break;
      }

      case 'check_account_health': {
        const account = params.account || db.getAccountById(params.accountId || params.id);
        if (!account) throw new Error('Account not found.');
        result = await twitterBot.checkAccountHealth(account);
        break;
      }

      case 'check_fleet_health':
        result = await twitterBot.checkFleetHealth();
        break;

      case 'camoufox_login': {
        const account = params.account || db.getAccountById(params.accountId || params.id);
        if (!account) throw new Error('Account not found.');
        result = await camoufoxLoginManager.startCamoufoxLogin(account, params.options || {});
        break;
      }

      case 'run_warmup': {
        const account = params.account || db.getAccountById(params.accountId || params.id);
        if (!account) throw new Error('Account not found.');
        result = await twitterBot.runWarmupTask(account);
        break;
      }

      case 'run_post_task':
        await twitterBot.runMultiAccountPostTask(
          params.accountIds,
          params.posts,
          params.options || {}
        );
        result = {
          success: true,
          lastMission: twitterBot.lastMission,
        };
        break;

      case 'run_batch_task':
        await twitterBot.runMultiAccountBatchTask(
          params.accountIds,
          params.urls || [],
          params.options || {}
        );
        result = {
          success: true,
          lastMission: twitterBot.lastMission,
        };
        break;

      case 'run_hunter_task':
        await twitterBot.runMultiAccountHunter(
          params.accountIds,
          params.keyword || '',
          params.count || 10,
          params.options || {}
        );
        result = {
          success: true,
          lastMission: twitterBot.lastMission,
        };
        break;

      case 'pause':
        result = {
          success: twitterBot.pauseTask(params.reason || 'Manual pause by operator'),
        };
        break;

      case 'resume':
        result = {
          success: twitterBot.resumeTask(),
        };
        break;

      case 'stop':
        result = {
          success: twitterBot.stopTask(),
        };
        break;

      default:
        throw new Error(`Unknown worker command: ${cmd}`);
    }

    sendPacket({ id, ok: true, result });
  } catch (err) {
    sendPacket({
      id,
      ok: false,
      error: err?.message || String(err),
    });
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed);
    handleRequest(parsed);
  } catch (err) {
    sendPacket({ event: 'worker_error', error: `Invalid RPC frame: ${err.message}` });
  }
});

async function shutdown() {
  try {
    if (twitterBot.isRunning) {
      twitterBot.stopTask();
    }
    await twitterBot.closeBrowser();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
rl.on('close', shutdown);
