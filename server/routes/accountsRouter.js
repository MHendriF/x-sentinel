const express = require('express');
const { z } = require('zod');
const db = require('../db');
const logger = require('../logger');
const twitterBot = require('../automation/twitterBot');
const proxyHelper = require('../automation/proxyHelper');
const { redactAccount, resolveSecret, resolveProxyString } = require('../security');
const { validateBody, httpError } = require('../utils/http');

const router = express.Router();

const accountCreateSchema = z.object({
  label: z.string().max(100).optional(),
  auth_token: z.string().min(4, 'auth_token terlalu pendek'),
  ct0: z.string().max(500).optional(),
  proxy: z.string().max(500).optional(),
  comments: z.array(z.string()).max(500).optional(),
});

const accountUpdateSchema = accountCreateSchema.partial();

const bulkImportSchema = z.object({
  rawText: z.string().min(1, 'Format input tidak boleh kosong.'),
});

const commentsSchema = z.object({
  comments: z.array(z.string()).max(500),
});

// GET /api/accounts - List all accounts (session cookies & proxy creds masked)
router.get('/', (req, res) => {
  const accounts = db.getAccounts().map((acc) => {
    const comments = db.getAccountComments(acc.id);
    return redactAccount({ ...acc, commentsCount: comments.length });
  });
  res.json({ success: true, accounts });
});

// POST /api/accounts - Add new account
router.post('/', validateBody(accountCreateSchema), (req, res) => {
  const { label, auth_token, ct0, proxy, comments } = req.body;

  const newAccount = db.saveAccount({
    label: label || 'Akun X',
    auth_token: auth_token.trim(),
    ct0: (ct0 || '').trim(),
    proxy: (proxy || '').trim(),
    comments: Array.isArray(comments) ? comments : undefined,
  });

  logger.info(`👥 Akun baru ditambahkan: ${newAccount.label}`);
  res.json({ success: true, account: redactAccount(newAccount) });
});

// GET /api/accounts/export - Download full fleet backup JSON (raw cookies, backup only)
router.get('/export', (req, res) => {
  const backupData = db.exportAccounts();
  const filename = `x_sentinel_fleet_backup_${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(backupData, null, 2));
});

// POST /api/accounts/bulk-import - Bulk import accounts
router.post('/bulk-import', validateBody(bulkImportSchema), (req, res) => {
  const addedAccounts = db.bulkImportAccounts(req.body.rawText);
  logger.success(`📥 Berhasil mengimpor ${addedAccounts.length} akun ke dalam armada.`);
  res.json({
    success: true,
    addedCount: addedAccounts.length,
    importedCount: addedAccounts.length,
    total: db.getAccounts().length,
    accounts: db.getAccounts().map(redactAccount),
  });
});

// POST /api/accounts/check-health - Mass check fleet health
router.post('/check-health', async (req, res) => {
  const result = await twitterBot.checkFleetHealth();
  if (Array.isArray(result.results)) {
    result.results = result.results.map((r) =>
      r && r.account ? { ...r, account: redactAccount(r.account) } : r
    );
  }
  res.json(result);
});

// GET /api/accounts/:id - Get account by ID (masked)
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  }
  const comments = db.getAccountComments(id);
  res.json({ success: true, account: redactAccount({ ...account, comments }) });
});

// PUT /api/accounts/:id - Update account (masked values are restored from storage)
router.put('/:id', validateBody(accountUpdateSchema), (req, res) => {
  const { id } = req.params;
  const existing = db.getAccountById(id);
  if (!existing) {
    throw httpError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  }

  const patch = { ...existing, ...req.body, id };
  if (req.body.auth_token !== undefined) {
    patch.auth_token = resolveSecret(req.body.auth_token, existing.auth_token);
  }
  if (req.body.ct0 !== undefined) {
    patch.ct0 = resolveSecret(req.body.ct0, existing.ct0);
  }
  if (req.body.proxy !== undefined) {
    patch.proxy = resolveProxyString(existing.proxy, req.body.proxy);
  }

  const updated = db.saveAccount(patch);
  logger.info(`✏️ Akun diperbarui: ${updated.label}`);
  res.json({ success: true, account: redactAccount(updated) });
});

// DELETE /api/accounts/:id - Delete account
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteAccount(id);
  if (deleted) {
    logger.info(`🗑️ Akun dihapus: ID ${id}`);
    res.json({ success: true });
  } else {
    throw httpError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  }
});

// POST /api/accounts/:id/toggle - Toggle enabled status
router.post('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  }

  const updated = db.saveAccount({
    ...account,
    enabled: account.enabled === false ? true : false,
  });

  logger.info(
    `🔘 Status akun @${updated.username || updated.label} diubah: ${updated.enabled ? 'Aktif' : 'Nonaktif'}`
  );
  res.json({ success: true, account: redactAccount(updated) });
});

// POST /api/accounts/:id/verify - Verify single account credentials
router.post('/:id/verify', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  }

  const result = await twitterBot.verifyAccount(account);
  if (result && result.account) {
    result.account = redactAccount(result.account);
  }
  res.json(result);
});

// POST /api/accounts/:id/check-health - Check health of single node
router.post('/:id/check-health', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  }

  const result = await twitterBot.checkAccountHealth(account);
  if (result && result.account) {
    result.account = redactAccount(result.account);
  }
  res.json(result);
});

// POST /api/accounts/:id/warmup - Run warmup task
router.post('/:id/warmup', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  }

  if (twitterBot.isRunning) {
    throw httpError(400, 'Sebuah proses otomasi sedang berjalan.', 'TASK_RUNNING');
  }

  twitterBot.runWarmupTask(account).catch((err) => {
    logger.error(`❌ Background warmup error: ${err.message}`);
  });

  res.json({
    success: true,
    message: `Memulai rutinitas pemanasan untuk @${account.username || account.label} (Hari ${account.warmupDay || 1}/7)...`,
  });
});

// POST /api/accounts/:id/test-proxy - Live latency & GeoIP test for this node's proxy
router.post('/:id/test-proxy', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Akun tidak ditemukan.', 'NOT_FOUND');
  }
  if (!account.proxy || !String(account.proxy).trim()) {
    throw httpError(400, 'Akun ini belum memiliki proxy yang dikonfigurasi.', 'NO_PROXY');
  }

  const result = await proxyHelper.testProxy(String(account.proxy).trim());
  res.json(result);
});

// GET /api/accounts/:id/comments - Get account comments
router.get('/:id/comments', (req, res) => {
  const { id } = req.params;
  const comments = db.getAccountComments(id);
  res.json({ success: true, comments });
});

// POST /api/accounts/:id/comments - Save account comments
router.post('/:id/comments', validateBody(commentsSchema), (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;

  db.saveAccountComments(id, comments);
  logger.info(`💾 Komentar untuk akun ID ${id} diperbarui (${comments.length} item).`);
  res.json({ success: true, count: comments.length });
});

module.exports = router;
