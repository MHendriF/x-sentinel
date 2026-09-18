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
    this.retentionDays = 30;
    this.lastCleanupDate = null;
    this.ensureLogDir();
  }

  getDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get logFile() {
    const todayFile = this.getLogFilePath();
    if (!fs.existsSync(todayFile)) {
      const legacyFile = path.join(this.logsDir, 'x-sentinel.log');
      if (fs.existsSync(legacyFile)) {
        return legacyFile;
      }
    }
    return todayFile;
  }

  getLogFilePath(dateStr) {
    const targetDate = dateStr || this.getDateString();
    return path.join(this.logsDir, `x-sentinel-${targetDate}.log`);
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

  cleanOldLogs(retentionDays = this.retentionDays) {
    try {
      if (!fs.existsSync(this.logsDir)) return;
      const now = Date.now();
      const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(this.logsDir);

      for (const file of files) {
        // Only target daily pattern x-sentinel-YYYY-MM-DD.log
        const match = file.match(/^x-sentinel-(\d{4}-\d{2}-\d{2})\.log$/);
        if (match) {
          const filePath = path.join(this.logsDir, file);
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > maxAgeMs) {
            try {
              fs.unlinkSync(filePath);
            } catch {
              // ignore deletion error
            }
          }
        }
      }
    } catch {
      // ignore clean errors
    }
  }

  writeToFile(logEntry) {
    try {
      const now = new Date();
      const todayStr = this.getDateString(now);
      const currentLogFile = this.getLogFilePath(todayStr);

      // Perform daily cleanup once per day
      if (this.lastCleanupDate !== todayStr) {
        this.lastCleanupDate = todayStr;
        this.cleanOldLogs();
      }

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

      fs.appendFile(currentLogFile, line, 'utf8', () => {});
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

  getAvailableLogFiles() {
    try {
      if (!fs.existsSync(this.logsDir)) return [];
      return fs
        .readdirSync(this.logsDir)
        .filter((f) => f.endsWith('.log'))
        .map((name) => {
          const stat = fs.statSync(path.join(this.logsDir, name));
          return {
            name,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime,
          };
        })
        .sort((a, b) => b.name.localeCompare(a.name));
    } catch {
      return [];
    }
  }

  clear() {
    this.logs = [];
    this.emit('clear');
  }
}

module.exports = new Logger();
