const express = require('express');
const path = require('path');
const { z } = require('zod');
const config = require('../config');
const db = require('../db');
const logger = require('../logger');
const { validateBody, httpError } = require('../utils/http');

const router = express.Router();

const ALLOWED_MEDIA_EXT_RE = /\.(png|jpe?g|gif|webp)$/i;

const safeMediaPathSchema = z.string().refine((p) => {
  if (!p || typeof p !== 'string') return false;
  const resolvedPath = path.resolve(p);
  const mediaDir = path.resolve(config.DATA_DIR, 'media');
  const relative = path.relative(mediaDir, resolvedPath);
  const isInside = Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
  return isInside && ALLOWED_MEDIA_EXT_RE.test(resolvedPath);
}, 'Path file media harus berada di dalam direktori data/media dan berekstensi gambar valid (PNG, JPG, GIF, WebP).');

const scheduleSchema = z.object({
  type: z.enum(['POST_QUEUE', 'RECURRING_HUNTER']).optional(),
  title: z.string().max(200).optional(),
  scheduledAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Format scheduledAt tidak valid.')
    .optional(),
  accountIds: z.union([z.string(), z.array(z.string())]).optional(),
  posts: z.array(z.string()).optional(),
  mediaPaths: z.array(safeMediaPathSchema).max(4).optional(),
  delaySeconds: z.number().min(0).max(3600).optional(),
  keywords: z.array(z.string()).optional(),
  vectors: z.array(z.string()).optional(),
  maxTweets: z.number().int().min(1).max(100).optional(),
  intervalMinutes: z.number().min(1).max(10080).optional(),
  enabled: z.boolean().optional(),
});

// GET /api/schedules - List all scheduled tasks
router.get('/', (req, res) => {
  res.json({ success: true, schedules: db.getSchedules() });
});

// POST /api/schedules - Create or update a schedule
router.post('/', validateBody(scheduleSchema), (req, res) => {
  const body = req.body;

  if (!body.scheduledAt && body.type !== 'RECURRING_HUNTER') {
    throw httpError(400, 'Waktu eksekusi (scheduledAt) wajib diisi.', 'VALIDATION_ERROR');
  }

  const item = db.saveSchedule({
    ...body,
    title: body.title || 'Jadwal Publikasi Post',
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt).toISOString() : undefined,
    accountIds: body.accountIds || 'all',
    delaySeconds: body.delaySeconds || 15,
    enabled: body.enabled !== undefined ? body.enabled : true,
  });

  logger.success(`📅 Jadwal baru ditambahkan: "${item.title}" pada ${item.scheduledAt}`);
  res.json({ success: true, schedule: item });
});

// DELETE /api/schedules/:id - Delete schedule
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteSchedule(id);
  if (deleted) {
    logger.info(`🗑️ Jadwal ID ${id} dihapus.`);
    res.json({ success: true });
  } else {
    throw httpError(404, 'Jadwal tidak ditemukan.', 'NOT_FOUND');
  }
});

// POST /api/schedules/:id/toggle - Toggle schedule active status
router.post('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const enabled =
    req.body && typeof req.body === 'object' && 'enabled' in req.body
      ? Boolean(req.body.enabled)
      : undefined;
  const updated = db.toggleSchedule(id, enabled);
  if (updated) {
    res.json({ success: true, schedule: updated });
  } else {
    throw httpError(404, 'Jadwal tidak ditemukan.', 'NOT_FOUND');
  }
});

module.exports = router;
