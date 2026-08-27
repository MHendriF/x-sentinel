const fs = require('fs');
const db = require('../../db');
const logger = require('../../logger');
const notifier = require('../notifier');
const { sleep, humanType } = require('./humanCadence');

/**
 * Compose and publish a new Tweet post with optional image attachments
 */
async function createPost(page, text, account, mediaPaths = []) {
  if (!text || !text.trim()) {
    throw new Error('Teks tweet tidak boleh kosong.');
  }

  const trimmedText = text.trim();
  logger.action(`[@${account.username || account.label}] Membuka Twitter Composer...`);

  let capturedTweetUrl = null;
  let capturedTweetId = null;

  // Intercept GraphQL CreateTweet response to capture exact status URL
  const responseHandler = async (response) => {
    try {
      const url = response.url();
      if (url.includes('CreateTweet') || url.includes('/graphql/')) {
        const json = await response.json().catch(() => null);
        const tweetId = json?.data?.create_tweet?.tweet_results?.result?.rest_id;
        if (tweetId) {
          capturedTweetId = tweetId;
          const userHandle = account.username || 'i';
          capturedTweetUrl = `https://x.com/${userHandle}/status/${tweetId}`;
          logger.info(`🎯 [GraphQL Interceptor] Berhasil menangkap Tweet ID: ${tweetId}`);
        }
      }
    } catch (e) {
      // ignore interceptor errors
    }
  };

  page.on('response', responseHandler);

  try {
    await page.goto('https://x.com/compose/post', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await sleep(2500);

    // Verify session
    if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
      throw new Error('Sesi login kedaluwarsa saat membuka composer.');
    }

    // 1. Handle Media / Image Attachments if present
    if (Array.isArray(mediaPaths) && mediaPaths.length > 0) {
      const validMediaFiles = mediaPaths.filter((p) => p && fs.existsSync(p));
      if (validMediaFiles.length > 0) {
        logger.info(
          `🖼️ [@${account.username || account.label}] Melampirkan ${validMediaFiles.length} file gambar ke postingan...`
        );
        try {
          const fileInput = await page
            .waitForSelector(
              'input[data-testid="fileInput"], input[type="file"][accept*="image"]',
              { timeout: 8000 }
            )
            .catch(() => null);

          if (fileInput) {
            await fileInput.setInputFiles(validMediaFiles);
            logger.success(
              `✅ [@${account.username || account.label}] ${validMediaFiles.length} media berhasil diunggah.`
            );
            await sleep(3500); // Wait for thumbnail upload rendering
          } else {
            logger.warn(
              `⚠️ [@${account.username || account.label}] Selector file input tidak ditemukan, melanjutkan teks saja.`
            );
          }
        } catch (mediaErr) {
          logger.warn(
            `⚠️ [@${account.username || account.label}] Gagal melampirkan media: ${mediaErr.message}`
          );
        }
      }
    }

    // 2. Find Draft Editor textarea
    let textarea = await page
      .waitForSelector(
        '[data-testid="tweetTextarea_0"], [data-testid="tweetTextarea_0_label"], div[role="textbox"]',
        { timeout: 12000 }
      )
      .catch(() => null);

    if (!textarea) {
      const fallbackEditor = await page.$('div[contenteditable="true"]');
      if (fallbackEditor) {
        textarea = fallbackEditor;
      }
    }

    if (!textarea) {
      throw new Error('Kolom editor postingan tweet tidak ditemukan.');
    }

    await textarea.click();
    await sleep(500);

    // Type post text with natural human jitter
    logger.info(`✍️ [@${account.username || account.label}] Mengetik postingan...`);
    await humanType(textarea, trimmedText);
    await sleep(1000);

    // 3. Click Tweet Submit Button
    const tweetButton = await page
      .waitForSelector(
        '[data-testid="tweetButton"], [data-testid="tweetButtonInline"], button[data-testid*="tweetButton"]',
        { timeout: 8000 }
      )
      .catch(() => null);

    if (!tweetButton) {
      throw new Error('Tombol Post / Tweet tidak ditemukan.');
    }

    const isDisabled = await tweetButton.getAttribute('aria-disabled');
    if (isDisabled === 'true') {
      throw new Error('Tombol Post dinonaktifkan (kemungkinan melebihi batas 280 karakter).');
    }

    await tweetButton.click();
    logger.info(`⏳ [@${account.username || account.label}] Mengirim postingan ke server X...`);
    await sleep(4000);

    // Fallback URL discovery if GraphQL did not trigger
    if (!capturedTweetUrl && account.username) {
      try {
        const latestTweetLink = await page
          .$eval(`a[href*="/${account.username}/status/"]`, (el) => el.href)
          .catch(() => null);
        if (latestTweetLink) {
          capturedTweetUrl = latestTweetLink;
        }
      } catch (e) {}
    }

    const finalTweetUrl =
      capturedTweetUrl || (account.username ? `https://x.com/${account.username}` : '-');

    logger.success(
      `🚀 [@${account.username || account.label}] Berhasil memposting tweet: "${trimmedText}" (${finalTweetUrl})`
    );

    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl: finalTweetUrl,
      tweetId:
        capturedTweetId ||
        (finalTweetUrl.includes('/status/')
          ? finalTweetUrl.split('/status/')[1]?.split(/[?#]/)[0]
          : undefined),
      action: 'POST',
      status: 'SUCCESS',
      details: trimmedText,
    });

    notifier.notify('POST_PUBLISHED', {
      accountName: account.username || account.label,
      text: trimmedText,
      tweetUrl: finalTweetUrl,
    });

    return { success: true, status: 'SUCCESS', postText: trimmedText, tweetUrl: finalTweetUrl };
  } catch (err) {
    logger.error(
      `❌ [@${account.username || account.label}] Gagal membuat postingan: ${err.message}`
    );
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl: account.username ? `https://x.com/${account.username}` : '-',
      action: 'POST',
      status: 'FAILED',
      message: err.message,
    });
    return { success: false, message: err.message };
  } finally {
    page.off('response', responseHandler);
  }
}

module.exports = {
  createPost,
};
