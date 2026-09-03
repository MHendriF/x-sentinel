const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../logger');

// Only image types officially supported by X composer uploads
const ALLOWED_IMAGE_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per image

// POST /api/media/upload - Upload base64 image
router.post('/upload', (req, res) => {
  const { imageBase64, filename } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Data gambar wajib disertakan.' });
  }

  const matches = imageBase64.match(/^data:([A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ success: false, message: 'Format base64 image tidak valid.' });
  }

  const mime = matches[1].toLowerCase();
  const ext = ALLOWED_IMAGE_MIME[mime];
  if (!ext) {
    return res.status(400).json({
      success: false,
      message: 'Tipe file tidak didukung. Gunakan PNG, JPG, GIF, atau WebP.',
    });
  }

  const buffer = Buffer.from(matches[2], 'base64');
  if (buffer.length === 0) {
    return res.status(400).json({ success: false, message: 'Data gambar kosong.' });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return res.status(413).json({
      success: false,
      message: `Ukuran gambar melebihi batas ${(MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0)} MB.`,
    });
  }

  const mediaDir = path.join(config.DATA_DIR, 'media');
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  const safeName = (filename || 'image').replace(/[^a-zA-Z0-9_-]/g, '_');
  const finalFilename = `${Date.now()}_${safeName}.${ext}`;
  const filePath = path.join(mediaDir, finalFilename);

  fs.writeFileSync(filePath, buffer);
  logger.success(
    `🖼️ Media berhasil diunggah: ${finalFilename} (${(buffer.length / 1024).toFixed(1)} KB)`
  );

  res.json({
    success: true,
    filename: finalFilename,
    localPath: filePath,
    sizeKb: (buffer.length / 1024).toFixed(1),
  });
});

/**
 * Prune media files older than maxAgeDays (default 7 days)
 */
function pruneOldMedia(maxAgeDays = 7) {
  const mediaDir = path.join(config.DATA_DIR, 'media');
  if (!fs.existsSync(mediaDir)) {
    return { deletedCount: 0, remainingFiles: 0 };
  }

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  let totalFiles = 0;

  try {
    const files = fs.readdirSync(mediaDir);
    totalFiles = files.length;
    for (const file of files) {
      const fullPath = path.join(mediaDir, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isFile() && stats.mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
          deletedCount++;
        }
      } catch {}
    }
  } catch (err) {
    logger.error(`Error pruning media files: ${err.message}`);
  }

  return { deletedCount, remainingFiles: totalFiles - deletedCount };
}

// POST /api/media/prune - Prune old media files
router.post('/prune', (req, res) => {
  const days = Math.max(1, Math.min(365, parseInt(req.body?.maxAgeDays, 10) || 7));
  const result = pruneOldMedia(days);
  logger.info(
    `🧹 Pembersihan media disk: ${result.deletedCount} file lama dihapus (> ${days} hari).`
  );
  res.json({
    success: true,
    ...result,
    maxAgeDays: days,
  });
});

module.exports = router;
module.exports.pruneOldMedia = pruneOldMedia;
