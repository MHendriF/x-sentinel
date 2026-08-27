const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../logger');

// POST /api/media/upload - Upload base64 image
router.post('/upload', (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Data gambar wajib disertakan.' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Format base64 image tidak valid.' });
    }

    const ext = matches[1].split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');

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
  } catch (err) {
    logger.error(`❌ Gagal upload media: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
