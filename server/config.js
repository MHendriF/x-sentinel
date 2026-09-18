const path = require('path');
require('dotenv').config();

function parsePort(val) {
  const p = parseInt(val, 10);
  return !isNaN(p) && p > 0 && p <= 65535 ? p : null;
}

function resolveInitialPort() {
  // 1. CLI flags: --port 3001, --port=3001, -p 3001, -p=3001
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--port=')) {
      const p = parsePort(arg.slice(7));
      if (p) return p;
    }
    if (arg === '--port' || arg === '-p') {
      const p = parsePort(args[i + 1]);
      if (p) return p;
    }
    if (arg.startsWith('-p=')) {
      const p = parsePort(arg.slice(3));
      if (p) return p;
    }
  }

  // 2. npm config (e.g. npm run dev --port=3001)
  if (process.env.npm_config_port) {
    const p = parsePort(process.env.npm_config_port);
    if (p) return p;
  }

  // 3. Environment variable PORT
  if (process.env.PORT) {
    const p = parsePort(process.env.PORT);
    if (p) return p;
  }

  return 3000;
}

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const USER_DATA_DIR = path.join(DATA_DIR, 'browser_profile');
const CAMOUFOX_PROFILES_DIR = path.join(DATA_DIR, 'camoufox_profiles');

module.exports = {
  VERSION: require('../package.json').version,
  PORT: resolveInitialPort(),
  // Loopback only by default: the API has no auth and serves session cookies,
  // so it must never be reachable from other interfaces.
  HOST: process.env.HOST || '127.0.0.1',
  ROOT_DIR,
  DATA_DIR,
  USER_DATA_DIR,
  CAMOUFOX_PROFILES_DIR,

  // Default Anti-Ban & Rate Limits
  DEFAULTS: {
    minDelaySeconds: 15,
    maxDelaySeconds: 40,
    hourlyLimit: 25,
    dailyLimit: 150,
    headless: false, // Default visible for stealth & transparency, can be toggled to true
    browserEngine: 'chromium', // 'chromium' (Default) or 'camoufox' (Anti-Detect Firefox)
    humanTypingDelayMs: 65,
    scrollBeforeAction: true,
  },

  // Desktop Chrome User Agent for maximum realism
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};
