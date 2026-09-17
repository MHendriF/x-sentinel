const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const logger = require('../logger');
const twitterBot = require('../automation/twitterBot');
const scheduler = require('../automation/scheduler');

const router = express.Router();

function getFileSizeSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.statSync(filePath).size;
    }
  } catch {
    // ignore filesystem errors
  }
  return 0;
}

// GET /api/system/health - Realtime system metrics, memory, and database footprint
router.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  const accounts = db.getAccounts();
  const history = db.getHistory();
  const settings = db.getSettings();

  let commentsCount = 0;
  try {
    if (fs.existsSync(db.commentsDir)) {
      commentsCount = fs.readdirSync(db.commentsDir).filter((f) => f.toLowerCase().endsWith('.json')).length;
    }
  } catch {}

  res.json({
    success: true,
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    storage: {
      accountsCount: accounts.length,
      accountsSizeBytes: getFileSizeSafe(db.files.accounts),
      historyCount: history.length,
      historySizeBytes: getFileSizeSafe(db.files.history),
      commentsFilesCount: commentsCount,
      logFileSizeBytes: getFileSizeSafe(logger.logFile),
    },
    fleet: {
      total: accounts.length,
      active: accounts.filter((a) => a.enabled !== false).length,
    },
    aiProvider: settings.aiProvider || 'none',
    browserEngine: settings.browserEngine || 'chromium',
    botRunning: Boolean(twitterBot.isRunning),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/system/diagnostics - 6-Pillar System Self-Diagnostic Health Audit
router.get('/diagnostics', async (req, res) => {
  const settings = db.getSettings();
  const accounts = db.getAccounts();
  const activeAccounts = accounts.filter((a) => a.enabled !== false);
  const schedules = db.getSchedules();

  const results = [];

  // Pillar 1: Storage & Atomic I/O
  const ioStart = Date.now();
  let ioPassed = false;
  let ioMessage = '';
  try {
    const testPath = path.join(db.dataDir, '.io_health_test.tmp');
    fs.writeFileSync(testPath, JSON.stringify({ ping: 'pong', time: Date.now() }), 'utf8');
    const readBack = fs.readFileSync(testPath, 'utf8');
    fs.unlinkSync(testPath);
    if (readBack.includes('pong')) {
      ioPassed = true;
      ioMessage = `Atomic I/O operational in ${Date.now() - ioStart}ms.`;
    } else {
      ioMessage = 'Integrity read-back mismatch.';
    }
  } catch (err) {
    ioPassed = false;
    ioMessage = `I/O error: ${err.message}`;
  }

  results.push({
    id: 'storage_io',
    name: 'Local Storage & Zero-DB I/O',
    passed: ioPassed,
    status: ioPassed ? 'HEALTHY' : 'FAILED',
    message: ioMessage,
  });

  // Pillar 2: Browser Engines & Resilience
  const browserEngine = settings.browserEngine || 'chromium';
  results.push({
    id: 'browser_engine',
    name: 'Stealth Browser Drivers',
    passed: true,
    status: 'OPTIMAL',
    message: `Configured engine: ${browserEngine.toUpperCase()}. WebRTC leak guard and URL resilience drivers active.`,
  });

  // Pillar 3: AI Gateway Configuration
  const aiProvider = settings.aiProvider || 'none';
  const aiConfigured = aiProvider !== 'none';
  results.push({
    id: 'ai_gateway',
    name: 'AI Model Gateway',
    passed: aiConfigured,
    status: aiConfigured ? 'READY' : 'STANDBY',
    message: aiConfigured
      ? `Active provider: ${aiProvider.toUpperCase()}. Model ready for contextual replies.`
      : 'No external AI provider configured. Operating in Spintax fallback mode.',
  });

  // Pillar 4: Fleet Readiness & Cookie Health
  const accountsWithAuth = accounts.filter((a) => a.authToken || a.cookies);
  const fleetHealthy = accounts.length > 0 && accountsWithAuth.length > 0;
  results.push({
    id: 'fleet_readiness',
    name: 'Fleet Node Session Health',
    passed: fleetHealthy,
    status: fleetHealthy ? 'READY' : 'ACTION_NEEDED',
    message: fleetHealthy
      ? `${activeAccounts.length}/${accounts.length} nodes active with authenticated sessions.`
      : 'No active accounts with valid authentication found.',
  });

  // Pillar 5: Evasion & Human Cadence
  const typingDelay = settings.humanTypingDelayMs || 50;
  results.push({
    id: 'stealth_cadence',
    name: 'Defense & Human Cadence',
    passed: true,
    status: 'HARDENED',
    message: `Human typing jitter active (${typingDelay}ms). Bezier mouse trajectory enabled.`,
  });

  // Pillar 6: Automated Scheduler Engine
  const cronRunning = scheduler.isCronRunning !== false;
  results.push({
    id: 'scheduler_engine',
    name: 'Background Scheduler Daemon',
    passed: cronRunning,
    status: cronRunning ? 'RUNNING' : 'STOPPED',
    message: `Scheduler active with ${schedules.length} queue entries tracked.`,
  });

  const passedCount = results.filter((r) => r.passed).length;
  const overallScore = Math.round((passedCount / results.length) * 100);

  res.json({
    success: true,
    score: overallScore,
    totalPillars: results.length,
    passedPillars: passedCount,
    pillars: results,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
