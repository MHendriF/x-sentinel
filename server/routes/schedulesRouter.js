const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../logger');
const scheduler = require('../automation/scheduler');

// GET /api/schedules - List all scheduled tasks
router.get('/', (req, res) => {
  try {
    const schedules = db.getSchedules();
    res.json({ success: true, schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/schedules - Create or update a schedule
router.post('/', (req, res) => {
  try {
    const { title, scheduledAt, accountIds, posts, mediaPaths, delaySeconds, type, enabled } =
      req.body;

    if (!scheduledAt) {
      return res
        .status(400)
        .json({ success: false, message: 'Waktu eksekusi (scheduledAt) wajib diisi.' });
    }

    const item = db.saveSchedule({
      title: title || 'Jadwal Publikasi Post',
      scheduledAt: new Date(scheduledAt).toISOString(),
      accountIds: accountIds || 'all',
      posts: Array.isArray(posts) ? posts : [String(posts || '').trim()],
      mediaPaths: Array.isArray(mediaPaths) ? mediaPaths : [],
      delaySeconds: Number(delaySeconds) || 15,
      type: type || 'POST_QUEUE',
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    });

    logger.success(`📅 Jadwal baru ditambahkan: "${item.title}" pada ${item.scheduledAt}`);
    res.json({ success: true, schedule: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/schedules/:id - Delete schedule
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteSchedule(id);
    if (deleted) {
      logger.info(`🗑️ Jadwal ID ${id} dihapus.`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/schedules/:id/toggle - Toggle schedule active status
router.post('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const updated = db.toggleSchedule(id);
    if (updated) {
      res.json({ success: true, schedule: updated });
    } else {
      res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
