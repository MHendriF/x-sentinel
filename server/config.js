const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const USER_DATA_DIR = path.join(DATA_DIR, 'browser_profile');

module.exports = {
  VERSION: require('../package.json').version,
  PORT: process.env.PORT || 3000,
  // Loopback only by default: the API has no auth and serves session cookies,
  // so it must never be reachable from other interfaces.
  HOST: process.env.HOST || '127.0.0.1',
  ROOT_DIR,
  DATA_DIR,
  USER_DATA_DIR,

  // Default Anti-Ban & Rate Limits
  DEFAULTS: {
    minDelaySeconds: 15,
    maxDelaySeconds: 40,
    hourlyLimit: 25,
    dailyLimit: 150,
    headless: false, // Default visible for stealth & transparency, can be toggled to true
    humanTypingDelayMs: 65,
    scrollBeforeAction: true,
  },

  // Desktop Chrome User Agent for maximum realism
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};
