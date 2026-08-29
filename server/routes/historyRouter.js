const express = require('express');
const { z } = require('zod');
const db = require('../db');
const logger = require('../logger');
const { validateBody } = require('../utils/http');

const router = express.Router();

const pruneSchema = z.object({
  olderThanDays: z.number().int().min(1).max(3650).optional(),
  status: z.string().max(30).optional(),
  dryRun: z.boolean().optional(),
});

// GET /api/history - Get interaction history & stats
router.get('/', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 1000);
  const history = db.getHistory(limit);
  const stats = db.getStats();
  res.json({ success: true, history, stats });
});

// POST /api/history/prune - Prune logs
router.post('/prune', validateBody(pruneSchema), (req, res) => {
  const { olderThanDays, status, dryRun } = req.body;
  const result = db.pruneHistory({ olderThanDays, status, dryRun });
  logger.info(
    `🧹 Audit Ledger dipangkas: ${result.deletedCount} entri dihapus${dryRun ? ' (dry-run)' : ''}.`
  );
  res.json({ success: true, ...result });
});

// POST /api/history/clear-all - Clear 100% of history
router.post('/clear-all', (req, res) => {
  const { deletedCount } = db.clearHistory();
  logger.warn(`🧹 Seluruh riwayat Audit Ledger berhasil di-reset (${deletedCount} entri dihapus).`);
  res.json({ success: true, deletedCount });
});

module.exports = router;
