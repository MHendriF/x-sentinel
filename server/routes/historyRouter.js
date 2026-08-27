const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../logger');

// GET /api/history - Get interaction history & stats
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const history = db.getHistory(limit);
  const stats = db.getStats();
  res.json({ success: true, history, stats });
});

// POST /api/history/prune - Prune logs
router.post('/prune', (req, res) => {
  try {
    const { olderThanDays, status } = req.body;
    const deletedCount = db.pruneHistory({ olderThanDays, status });
    logger.info(`🧹 Audit Ledger dipangkas: ${deletedCount} entri dihapus.`);
    res.json({ success: true, deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/history/clear-all - Clear 100% of history
router.post('/clear-all', (req, res) => {
  try {
    const deletedCount = db.clearHistory();
    logger.warn(
      `🧹 Seluruh riwayat Audit Ledger berhasil di-reset (${deletedCount} entri dihapus).`
    );
    res.json({ success: true, deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
