const express = require('express');
const router = express.Router();
const twitterBot = require('../automation/twitterBot');

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
  res.json({
    success: true,
    ...twitterBot.getStatus(),
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

module.exports = router;
