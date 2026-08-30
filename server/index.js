const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./logger');
const { originGuard } = require('./security');
const apiRoutes = require('./routes/api');

const app = express();

// Local-only guard: reject cross-origin browser requests (drive-by secret
// exfiltration) and DNS-rebinding Host headers before any handler runs.
app.use(originGuard);

// Large limit required for base64 media uploads (up to 4 images per request)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// API responses must never be cached — the dashboard always reads fresh state,
// otherwise a stale cached GET (accounts/export) can mask a just-saved edit.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Serve static frontend dashboard (React 19 build or public fallback)
const clientDist = path.join(config.ROOT_DIR, 'client', 'dist');
const staticDir = fs.existsSync(clientDist) ? clientDist : path.join(config.ROOT_DIR, 'public');

app.use(express.static(staticDir));

// Server-Sent Events (SSE) for Realtime Log Streaming
app.get('/api/logs/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(
    `data: ${JSON.stringify({ type: 'CONNECTED', message: 'Live log stream active' })}\n\n`
  );

  const onLog = (logEntry) => {
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  };

  logger.on('log', onLog);

  req.on('close', () => {
    logger.removeListener('log', onLog);
  });
});

// REST API routes
app.use('/api', apiRoutes);

// Catch all fallback to serve frontend
app.use((req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Centralized error handler: every thrown/rejected error in route handlers
// lands here. Express 5 auto-forwards async errors.
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    logger.error(`💥 ${req.method} ${req.originalUrl} → ${err.message}`);
    if (err.stack) console.error(err.stack);
  }
  res.status(status).json({
    success: false,
    error: err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    message: status >= 500 ? 'Terjadi kesalahan internal server.' : err.message,
  });
});

const twitterBot = require('./automation/twitterBot');
const scheduler = require('./automation/scheduler');

// Start Server (loopback bind — see config.HOST)
const server = app.listen(config.PORT, config.HOST, () => {
  logger.success(`🚀 X-SENTINEL Cockpit Engine berjalan di http://${config.HOST}:${config.PORT}`);
  console.log(`====================================================`);
  console.log(`🛡️  X-SENTINEL: Autonomous Multi-Node Fleet Engine`);
  console.log(`🌐 Buka Dashboard di browser: http://${config.HOST}:${config.PORT}`);
  console.log(`====================================================`);

  // Start background scheduler
  scheduler.start();
});

// Graceful Shutdown & Process Lifecycle Hardening
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn(`🛑 Menerima sinyal ${signal}. Membersihkan proses dan mematikan engine...`);

  try {
    scheduler.stop();
    // 1. Stop any ongoing task
    if (twitterBot.isRunning) {
      twitterBot.stopTask();
    }
    // 2. Cleanly close Chromium browser contexts
    await twitterBot.closeBrowser();
  } catch (e) {
    // ignore
  }

  server.close(() => {
    logger.info('👋 Server ditutup dengan aman. Sampai jumpa!');
    process.exit(0);
  });

  // Force exit after 5 seconds if hanging
  setTimeout(() => {
    process.exit(0);
  }, 5000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.error(`💥 Uncaught Exception: ${err.message}`);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`💥 Unhandled Promise Rejection: ${reason}`);
});
