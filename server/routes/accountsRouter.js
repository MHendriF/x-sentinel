const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../logger');
const twitterBot = require('../automation/twitterBot');

// GET /api/accounts - List all accounts
router.get('/', (req, res) => {
  const accounts = db.getAccounts().map((acc) => {
    const comments = db.getAccountComments(acc.id);
    return {
      ...acc,
      commentsCount: comments.length,
    };
  });
  res.json({ success: true, accounts });
});

// POST /api/accounts - Add new account
router.post('/', async (req, res) => {
  const { label, auth_token, ct0, proxy, comments } = req.body;

  if (!auth_token || !auth_token.trim()) {
    return res.status(400).json({ success: false, message: 'Cookie auth_token wajib diisi.' });
  }

  const newAccount = db.saveAccount({
    label: label || 'Akun X',
    auth_token: auth_token.trim(),
    ct0: (ct0 || '').trim(),
    proxy: (proxy || '').trim(),
    comments: Array.isArray(comments) ? comments : undefined,
  });

  logger.info(`👥 Akun baru ditambahkan: ${newAccount.label}`);
  res.json({ success: true, account: newAccount });
});

// GET /api/accounts/export - Download full fleet backup JSON
router.get('/export', (req, res) => {
  try {
    const backupData = db.exportAccounts();
    const filename = `x_sentinel_fleet_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/accounts/bulk-import - Bulk import accounts
router.post('/bulk-import', (req, res) => {
  const { rawText } = req.body;
  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ success: false, message: 'Format input tidak boleh kosong.' });
  }

  try {
    const addedAccounts = db.bulkImportAccounts(rawText);
    logger.success(`📥 Berhasil mengimpor ${addedAccounts.length} akun ke dalam armada.`);
    res.json({
      success: true,
      importedCount: addedAccounts.length,
      accounts: db.getAccounts(),
    });
  } catch (err) {
    logger.error(`❌ Gagal import massal akun: ${err.message}`);
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/accounts/check-health - Mass check fleet health
router.post('/check-health', async (req, res) => {
  try {
    const result = await twitterBot.checkFleetHealth();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/accounts/:id - Get account by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }
  const comments = db.getAccountComments(id);
  res.json({ success: true, account: { ...account, comments } });
});

// PUT /api/accounts/:id - Update account
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.getAccountById(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }

  const updated = db.saveAccount({
    ...existing,
    ...req.body,
    id,
  });

  logger.info(`✏️ Akun diperbarui: ${updated.label}`);
  res.json({ success: true, account: updated });
});

// DELETE /api/accounts/:id - Delete account
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteAccount(id);
  if (deleted) {
    logger.info(`🗑️ Akun dihapus: ID ${id}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }
});

// POST /api/accounts/:id/toggle - Toggle enabled status
router.post('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }

  const updated = db.saveAccount({
    ...account,
    enabled: account.enabled === false ? true : false,
  });

  logger.info(
    `🔘 Status akun @${updated.username || updated.label} diubah: ${updated.enabled ? 'Aktif' : 'Nonaktif'}`
  );
  res.json({ success: true, account: updated });
});

// POST /api/accounts/:id/verify - Verify single account credentials
router.post('/:id/verify', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }

  try {
    const result = await twitterBot.verifyAccount(account);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/accounts/:id/check-health - Check health of single node
router.post('/:id/check-health', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }

  try {
    const result = await twitterBot.checkAccountHealth(account);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/accounts/:id/warmup - Run warmup task
router.post('/:id/warmup', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }

  if (twitterBot.isRunning) {
    return res
      .status(400)
      .json({ success: false, message: 'Sebuah proses otomasi sedang berjalan.' });
  }

  twitterBot.runWarmupTask(account).catch((err) => {
    logger.error(`❌ Background warmup error: ${err.message}`);
  });

  res.json({
    success: true,
    message: `Memulai rutinitas pemanasan untuk @${account.username || account.label} (Hari ${account.warmupDay || 1}/7)...`,
  });
});

// GET /api/accounts/:id/comments - Get account comments
router.get('/:id/comments', (req, res) => {
  const { id } = req.params;
  const comments = db.getAccountComments(id);
  res.json({ success: true, comments });
});

// POST /api/accounts/:id/comments - Save account comments
router.post('/:id/comments', (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;
  if (!Array.isArray(comments)) {
    return res
      .status(400)
      .json({ success: false, message: 'Format komentar harus berupa array string.' });
  }

  db.saveAccountComments(id, comments);
  logger.info(`💾 Komentar untuk akun ID ${id} diperbarui (${comments.length} item).`);
  res.json({ success: true, count: comments.length });
});

module.exports = router;
