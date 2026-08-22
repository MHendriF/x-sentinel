const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const logger = require('./logger');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend dashboard (React 19 build or public fallback)
const fs = require('fs');
const clientDist = path.join(config.ROOT_DIR, 'client', 'dist');
const staticDir = fs.existsSync(clientDist) ? clientDist : path.join(config.ROOT_DIR, 'public');

app.use(express.static(staticDir));

// Server-Sent Events (SSE) for Realtime Log Streaming
app.get('/api/logs/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Live log stream active' })}\n\n`);

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

// Start Server
app.listen(config.PORT, () => {
  logger.success(`🚀 X Engagement Automation Tool berjalan di http://localhost:${config.PORT}`);
  console.log(`====================================================`);
  console.log(`🌐 Buka Dashboard di browser: http://localhost:${config.PORT}`);
  console.log(`====================================================`);
});
