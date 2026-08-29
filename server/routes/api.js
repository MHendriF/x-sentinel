const express = require('express');
const router = express.Router();
const twitterBot = require('../automation/twitterBot');
const { redactAccount } = require('../security');

// Sub-routers
const accountsRouter = require('./accountsRouter');
const tasksRouter = require('./tasksRouter');
const aiRouter = require('./aiRouter');
const schedulesRouter = require('./schedulesRouter');
const mediaRouter = require('./mediaRouter');
const historyRouter = require('./historyRouter');
const settingsRouter = require('./settingsRouter');

// GET /api/status - Get current bot status, active accounts & stats
router.get('/status', (req, res) => {
  const status = twitterBot.getStatus();
  res.json({
    success: true,
    ...status,
    accounts: (status.accounts || []).map(redactAccount),
  });
});

// Mount Modular Sub-Routers
router.use('/accounts', accountsRouter);
router.use('/tasks', tasksRouter);
router.use('/ai', aiRouter);
router.use('/schedules', schedulesRouter);
router.use('/media', mediaRouter);
router.use('/history', historyRouter);
router.use('/', settingsRouter);

// 404 Not Found Catch-All for API Routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API_ENDPOINT_NOT_FOUND',
    message: `Endpoint API '${req.method} /api${req.url}' tidak ditemukan.`,
  });
});

module.exports = router;
