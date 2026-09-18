const express = require('express');
const { z } = require('zod');
const db = require('../db');
const logger = require('../logger');
const twitterBot = require('../automation/twitterBot');
const proxyHelper = require('../automation/proxyHelper');
const { redactAccount, resolveSecret, resolveProxyString, isMaskedValue } = require('../security');
const { validateBody, httpError } = require('../utils/http');
const camoufoxLoginManager = require('../automation/bot/camoufoxLoginManager');

const router = express.Router();

// Proxy tunnel must be structurally valid (explicit host:port). Empty clears
// the field; a masked display value (`••••@host:port`) is resolved later by
// resolveProxyString, so it passes validation as-is.
const proxySchema = z
  .string()
  .max(500)
  .refine(
    (val) => {
      const trimmed = val.trim();
      if (!trimmed || isMaskedValue(trimmed)) return true;
      return proxyHelper.isValidProxyFormat(trimmed);
    },
    {
      message:
        'Invalid proxy tunnel format. Use: user:pass@ip:port, ip:port:user:pass, or ip:port (HTTP/SOCKS5).',
    }
  );

const accountCreateSchema = z.object({
  label: z.string().max(100).optional(),
  username: z.string().max(100).optional(),
  name: z.string().max(100).optional(),
  avatar: z.string().max(500).optional(),
  auth_token: z.string().min(4, 'auth_token is too short'),
  ct0: z.string().max(500).optional(),
  proxy: proxySchema.optional(),
  comments: z.array(z.string()).max(500).optional(),
});

const accountUpdateSchema = accountCreateSchema.partial();

const bulkImportSchema = z.object({
  rawText: z.string().min(1, 'Input format cannot be empty.'),
});

const commentsSchema = z.object({
  comments: z.array(z.string()).max(500),
});

const batchToggleSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  enabled: z.boolean(),
});

const batchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

const testProxiesSchema = z.object({
  ids: z.array(z.string().min(1)).max(500).optional(),
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
    label: label || 'Account X',
    auth_token: auth_token.trim(),
    ct0: (ct0 || '').trim(),
    proxy: (proxy || '').trim(),
    comments: Array.isArray(comments) ? comments : undefined,
  });

  logger.info(`👥 New node registered: ${newAccount.label}`);
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

// GET /api/accounts/export-csv - Download fleet accounts as clean CSV
router.get('/export-csv', (req, res) => {
  const accounts = db.getAccounts();
  const headers = [
    'Label',
    'Username',
    'Status',
    'Health',
    'Proxy Host',
    'Warmup Day',
    'Likes',
    'Reposts',
    'Replies',
    'Posts',
    'Total Actions',
    'Last Checked',
  ];

  const rows = accounts.map((a) => {
    const totalActs =
      (a.stats?.likes || 0) +
      (a.stats?.retweets || 0) +
      (a.stats?.comments || 0) +
      (a.stats?.posts || 0);
    const cleanProxy = proxyHelper.extractProxyHostPort
      ? proxyHelper.extractProxyHostPort(a.proxy)
      : a.proxy || '';
    return [
      `"${(a.label || '').replace(/"/g, '""')}"`,
      `"${a.username || ''}"`,
      a.enabled !== false ? 'Active' : 'Paused',
      a.healthStatus || (a.isValid ? 'Valid' : 'Unchecked'),
      `"${cleanProxy}"`,
      String(a.warmupDay || 1),
      String(a.stats?.likes || 0),
      String(a.stats?.retweets || 0),
      String(a.stats?.comments || 0),
      String(a.stats?.posts || 0),
      String(totalActs),
      `"${a.lastCheckedAt || a.lastChecked || ''}"`,
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const filename = `x_sentinel_fleet_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8;');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// POST /api/accounts/batch-toggle - Bulk activate / pause accounts
router.post('/batch-toggle', validateBody(batchToggleSchema), (req, res) => {
  const { ids, enabled } = req.body;
  const accounts = db.getAccounts();
  let updatedCount = 0;

  accounts.forEach((acc) => {
    if (ids.includes(acc.id)) {
      acc.enabled = enabled;
      updatedCount += 1;
    }
  });

  if (updatedCount > 0) {
    db.save('accounts');
    logger.info(`🔘 Batch toggled ${updatedCount} nodes: ${enabled ? 'Activated' : 'Paused'}`);
  }

  res.json({ success: true, updatedCount, enabled });
});

// POST /api/accounts/batch-delete - Bulk delete accounts
router.post('/batch-delete', validateBody(batchDeleteSchema), (req, res) => {
  const { ids } = req.body;
  let deletedCount = 0;

  ids.forEach((id) => {
    if (db.deleteAccount(id)) {
      deletedCount += 1;
    }
  });

  logger.warn(`🗑️ Batch deleted ${deletedCount} nodes from fleet.`);
  res.json({ success: true, deletedCount });
});

// POST /api/accounts/test-proxies - Mass test proxies across fleet concurrently
router.post('/test-proxies', validateBody(testProxiesSchema), async (req, res) => {
  const { ids } = req.body;
  const accounts = db.getAccounts();
  const targetAccounts = accounts.filter((acc) => {
    if (!acc.proxy || !String(acc.proxy).trim()) return false;
    if (Array.isArray(ids) && ids.length > 0) {
      return ids.includes(acc.id);
    }
    return true;
  });

  logger.info(`🌐 Testing proxies for ${targetAccounts.length} fleet nodes concurrently...`);

  const results = {};
  const promises = targetAccounts.map(async (acc) => {
    try {
      const result = await proxyHelper.testProxy(String(acc.proxy).trim());
      results[acc.id] = result;
    } catch (err) {
      results[acc.id] = { success: false, message: err.message, latency: 0, status: 'DEAD' };
    }
  });

  await Promise.allSettled(promises);
  res.json({ success: true, total: targetAccounts.length, results });
});

// POST /api/accounts/bulk-import - Bulk import accounts
router.post('/bulk-import', validateBody(bulkImportSchema), (req, res) => {
  const addedAccounts = db.bulkImportAccounts(req.body.rawText);
  logger.success(`📥 Successfully imported ${addedAccounts.length} accounts into fleet.`);
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
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
  }
  const comments = db.getAccountComments(id);
  res.json({ success: true, account: redactAccount({ ...account, comments }) });
});

// PUT /api/accounts/:id - Update account (masked values are restored from storage)
router.put('/:id', validateBody(accountUpdateSchema), (req, res) => {
  const { id } = req.params;
  const existing = db.getAccountById(id);
  if (!existing) {
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
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
  logger.info(`✏️ Account updated: ${updated.label}`);
  res.json({ success: true, account: redactAccount(updated) });
});

// DELETE /api/accounts/:id - Delete account
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteAccount(id);
  if (deleted) {
    logger.info(`🗑️ Account decommissioned: ID ${id}`);
    res.json({ success: true });
  } else {
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
  }
});

// POST /api/accounts/:id/toggle - Toggle enabled status
router.post('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
  }

  const updated = db.saveAccount({
    ...account,
    enabled: account.enabled === false ? true : false,
  });

  logger.info(
    `🔘 Account status @${updated.username || updated.label} toggled: ${updated.enabled ? 'Active' : 'Paused'}`
  );
  res.json({ success: true, account: redactAccount(updated) });
});

// POST /api/accounts/:id/verify - Verify single account credentials
router.post('/:id/verify', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
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
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
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
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
  }

  if (twitterBot.isRunning) {
    throw httpError(400, 'An automation process is currently running.', 'TASK_RUNNING');
  }

  twitterBot.runWarmupTask(account).catch((err) => {
    logger.error(`❌ Background warmup error: ${err.message}`);
  });

  res.json({
    success: true,
    message: `Initiating warm-up routine for @${account.username || account.label} (Day ${account.warmupDay || 1}/7)...`,
  });
});

// POST /api/accounts/:id/test-proxy - Live latency & GeoIP test for this node's proxy
router.post('/:id/test-proxy', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
  }
  if (!account.proxy || !String(account.proxy).trim()) {
    throw httpError(400, 'This account has no proxy configured.', 'NO_PROXY');
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
  logger.info(`💾 Comments updated for node ID ${id} (${comments.length} entries).`);
  res.json({ success: true, count: comments.length });
});

// POST /api/accounts/:id/camoufox-login - Start interactive Camoufox login session
router.post('/:id/camoufox-login', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
  }

  if (twitterBot.isRunning) {
    throw httpError(
      400,
      'An automation task is currently running. Please wait or pause the task before logging in.',
      'TASK_RUNNING'
    );
  }

  try {
    const result = await camoufoxLoginManager.startCamoufoxLogin(account);
    res.json({
      success: true,
      message: result.message,
      account: redactAccount(result.account),
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// GET /api/accounts/:id/camoufox-status - Check status of Camoufox profile
router.get('/:id/camoufox-status', (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
  }

  const status = camoufoxLoginManager.getCamoufoxProfileStatus(id);
  res.json({ success: true, status });
});

// DELETE /api/accounts/:id/camoufox-profile - Remove Camoufox persistent profile
router.delete('/:id/camoufox-profile', (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    throw httpError(404, 'Account not found.', 'NOT_FOUND');
  }

  const result = camoufoxLoginManager.deleteCamoufoxProfile(id);
  res.json({ success: true, message: result.message });
});

// POST /api/accounts/batch-delete-camoufox - Bulk remove Camoufox persistent profiles
router.post('/batch-delete-camoufox', validateBody(batchDeleteSchema), (req, res) => {
  const { ids } = req.body;
  let deletedCount = 0;
  for (const id of ids) {
    const account = db.getAccountById(id);
    if (account) {
      camoufoxLoginManager.deleteCamoufoxProfile(id);
      deletedCount++;
    }
  }
  logger.info(`🗑️ Bulk Camoufox profiles removed for ${deletedCount} node(s)`);
  res.json({
    success: true,
    message: `Removed Camoufox profile for ${deletedCount} node(s).`,
    deletedCount,
  });
});

module.exports = router;

