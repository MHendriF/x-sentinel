const EventEmitter = require('events');

class Logger extends EventEmitter {
  constructor() {
    super();
    this.logs = [];
    this.maxLogs = 300;
  }

  log(level, message, meta = {}) {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const logEntry = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp,
      level, // 'info', 'success', 'warn', 'error', 'action'
      message,
      meta,
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    const consolePrefix =
      {
        info: 'ℹ️ [INFO]',
        success: '✅ [SUCCESS]',
        warn: '⚠️ [WARN]',
        error: '❌ [ERROR]',
        action: '⚡ [ACTION]',
      }[level] || '[LOG]';

    console.log(`[${timestamp}] ${consolePrefix} ${message}`);
    this.emit('log', logEntry);
    return logEntry;
  }

  info(msg, meta) {
    return this.log('info', msg, meta);
  }
  success(msg, meta) {
    return this.log('success', msg, meta);
  }
  warn(msg, meta) {
    return this.log('warn', msg, meta);
  }
  error(msg, meta) {
    return this.log('error', msg, meta);
  }
  action(msg, meta) {
    return this.log('action', msg, meta);
  }

  getRecentLogs(limit = 100) {
    return this.logs.slice(0, limit);
  }

  clear() {
    this.logs = [];
    this.emit('clear');
  }
}

module.exports = new Logger();
