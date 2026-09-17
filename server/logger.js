const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class Logger extends EventEmitter {
  constructor() {
    super();
    this.logs = [];
    this.maxLogs = 300;

    // Persistent file logging setup
    this.logsDir = path.join(__dirname, '..', 'data', 'logs');
    this.logFile = path.join(this.logsDir, 'x-sentinel.log');
    this.maxFileSizeBytes = 10 * 1024 * 1024; // 10MB auto-rotation limit
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch {
      // ignore directory creation errors
    }
  }

  writeToFile(logEntry) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').slice(0, 23);
      const levelUpper = (logEntry.level || 'info').toUpperCase().padEnd(7);

      let line = `[${dateStr}] [${levelUpper}] ${logEntry.message}`;
      if (logEntry.meta && Object.keys(logEntry.meta).length > 0) {
        try {
          line += ` | ${JSON.stringify(logEntry.meta)}`;
        } catch {
          // ignore serialization errors
        }
      }
      line += '\n';

      // Check for rotation if file exceeds 10MB
      try {
        if (fs.existsSync(this.logFile)) {
          const stat = fs.statSync(this.logFile);
          if (stat.size > this.maxFileSizeBytes) {
            const oldFile = path.join(this.logsDir, 'x-sentinel.old.log');
            if (fs.existsSync(oldFile)) {
              fs.unlinkSync(oldFile);
            }
            fs.renameSync(this.logFile, oldFile);
          }
        }
      } catch {
        // ignore rotation errors
      }

      fs.appendFile(this.logFile, line, 'utf8', () => {});
    } catch {
      // Never let file logging interrupt runtime execution
    }
  }

  log(level, message, meta = {}) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
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

    // Persist to .log file asynchronously
    this.writeToFile(logEntry);

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

  getLogFilePath() {
    return this.logFile;
  }

  clear() {
    this.logs = [];
    this.emit('clear');
  }
}

module.exports = new Logger();
