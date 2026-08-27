/**
 * X-SENTINEL Notifier Service
 * Handles instant real-time webhook alerts to Telegram and Discord.
 */

const db = require('../db');
const logger = require('../logger');

class NotifierService {
  /**
   * Send alert to Telegram Bot
   */
  async sendTelegram(botToken, chatId, message) {
    if (!botToken || !chatId) return { success: false, message: 'Bot Token & Chat ID wajib diisi.' };

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (response.ok && json.ok) {
        return { success: true };
      }
      return { success: false, message: json.description || `HTTP ${response.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Send alert to Discord Webhook
   */
  async sendDiscord(webhookUrl, { title, description, color = 0xf59e0b, fields = [] }) {
    if (!webhookUrl) return { success: false, message: 'Discord Webhook URL wajib diisi.' };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'X-SENTINEL Sentinel',
          avatar_url: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield.png',
          embeds: [
            {
              title: title || '🛡️ X-SENTINEL System Alert',
              description,
              color: typeof color === 'number' ? color : 0xf59e0b,
              fields: fields || [],
              footer: {
                text: `X-SENTINEL Core • ${new Date().toLocaleTimeString('id-ID')}`,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      if (response.ok || response.status === 204) {
        return { success: true };
      }
      const text = await response.text().catch(() => '');
      return { success: false, message: text || `HTTP ${response.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Broadcast structured notification to all active webhooks
   */
  async notify(event, data = {}) {
    const settings = db.getSettings() || {};
    const {
      telegramEnabled,
      telegramBotToken,
      telegramChatId,
      discordEnabled,
      discordWebhookUrl,
    } = settings;

    if (!telegramEnabled && !discordEnabled) return;

    let tgMessage = '';
    let discordTitle = '';
    let discordDesc = '';
    let discordColor = 0x3b82f6; // blue default
    let fields = [];

    const timeStr = new Date().toLocaleTimeString('id-ID');

    switch (event) {
      case 'POST_PUBLISHED':
        tgMessage = `🚀 <b>X-SENTINEL • Post Berhasil Diterbitkan!</b>\n\n` +
          `👤 <b>Akun:</b> @${data.accountName || 'Node'}\n` +
          `📝 <b>Konten:</b> ${data.text || '-'}\n` +
          (data.tweetUrl ? `🔗 <b>Link:</b> ${data.tweetUrl}\n` : '') +
          `⏱️ <b>Waktu:</b> ${timeStr}`;
        
        discordTitle = '🚀 New Tweet Post Published';
        discordDesc = data.text || 'Postingan berhasil diterbitkan oleh armada node.';
        discordColor = 0x10b981; // emerald green
        fields = [
          { name: 'Node Account', value: `@${data.accountName || 'Node'}`, inline: true },
          { name: 'Status Link', value: data.tweetUrl ? `[Buka Post](${data.tweetUrl})` : '-', inline: true },
        ];
        break;

      case 'TASK_COMPLETED':
        tgMessage = `✅ <b>X-SENTINEL • Tugas Selesai!</b>\n\n` +
          `🎯 <b>Tipe:</b> ${data.taskType || 'Batch Engagement'}\n` +
          `📊 <b>Target Selesai:</b> ${data.totalTargets || 0} items\n` +
          `⏱️ <b>Waktu:</b> ${timeStr}`;

        discordTitle = '✅ Engagement Task Completed';
        discordDesc = `Tugas **${data.taskType || 'Engagement'}** telah berhasil diselesaikan.`;
        discordColor = 0x10b981;
        fields = [
          { name: 'Task Type', value: data.taskType || 'Batch', inline: true },
          { name: 'Total Interaksi', value: String(data.totalTargets || 0), inline: true },
        ];
        break;

      case 'TASK_FAILED':
        tgMessage = `❌ <b>X-SENTINEL • Tugas Mengalami Kendala!</b>\n\n` +
          `🎯 <b>Tipe:</b> ${data.taskType || 'Engagement'}\n` +
          `⚠️ <b>Error:</b> ${data.error || 'Terjadi kesalahan sistem'}\n` +
          `⏱️ <b>Waktu:</b> ${timeStr}`;

        discordTitle = '❌ Task Execution Failed';
        discordDesc = `Tugas mengalami kegagalan: **${data.error || 'Unknown Error'}**`;
        discordColor = 0xef4444; // red
        break;

      case 'SESSION_EXPIRED':
        tgMessage = `⚠️ <b>X-SENTINEL • Sesi Akun Kedaluwarsa!</b>\n\n` +
          `👤 <b>Akun:</b> @${data.accountName || data.label || 'Node'}\n` +
          `🔒 <b>Info:</b> Cookie auth_token sudah tidak valid/expired. Silakan perbarui cookie.\n` +
          `⏱️ <b>Waktu:</b> ${timeStr}`;

        discordTitle = '⚠️ Account Session Expired';
        discordDesc = `Sesi akun **@${data.accountName || data.label}** telah kedaluwarsa.`;
        discordColor = 0xf59e0b; // amber
        break;

      case 'PROXY_DEAD':
        tgMessage = `🛑 <b>X-SENTINEL • Proxy Tidak Terjangkau!</b>\n\n` +
          `👤 <b>Akun:</b> @${data.accountName || data.label}\n` +
          `🌐 <b>Proxy:</b> ${data.proxy || '-'}\n` +
          `🛡️ <b>Tindakan:</b> Node akun di-pause otomatis demi keamanan.\n` +
          `⏱️ <b>Waktu:</b> ${timeStr}`;

        discordTitle = '🛑 Proxy Unreachable Alert';
        discordDesc = `Proxy untuk node **@${data.accountName || data.label}** mati. Akun otomatis di-pause.`;
        discordColor = 0xef4444;
        break;

      case 'WARMUP_DAY_COMPLETED':
        tgMessage = `🐣 <b>X-SENTINEL • Pemanasan Akun Selesai (Hari ${data.day})!</b>\n\n` +
          `👤 <b>Akun:</b> @${data.accountName || 'Node'}\n` +
          `📈 <b>Aktivitas:</b> ${data.activity || 'Timeline browse & organic likes'}\n` +
          `⏱️ <b>Waktu:</b> ${timeStr}`;

        discordTitle = `🐣 Warm-up Routine Completed (Day ${data.day})`;
        discordDesc = `Akun **@${data.accountName || 'Node'}** telah menyelesaikan rutinitas pemanasan hari ke-${data.day}.`;
        discordColor = 0x8b5cf6; // purple
        break;

      default:
        tgMessage = `🛡️ <b>X-SENTINEL Alert:</b>\n${JSON.stringify(data, null, 2)}`;
        discordTitle = '🛡️ X-SENTINEL Notification';
        discordDesc = JSON.stringify(data);
    }

    // Send Telegram
    if (telegramEnabled && telegramBotToken && telegramChatId) {
      this.sendTelegram(telegramBotToken, telegramChatId, tgMessage).catch(err => {
        logger.warn(`⚠️ [Telegram Alert Error]: ${err.message}`);
      });
    }

    // Send Discord
    if (discordEnabled && discordWebhookUrl) {
      this.sendDiscord(discordWebhookUrl, {
        title: discordTitle,
        description: discordDesc,
        color: discordColor,
        fields,
      }).catch(err => {
        logger.warn(`⚠️ [Discord Alert Error]: ${err.message}`);
      });
    }
  }
}

module.exports = new NotifierService();
