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
    if (!botToken || !chatId)
      return { success: false, message: 'Bot Token & Chat ID are required.' };

    const cleanToken = String(botToken).trim();
    if (!/^[0-9]+:[a-zA-Z0-9_-]+$/.test(cleanToken)) {
      return { success: false, message: 'Invalid Bot Token format.' };
    }

    try {
      const url = `https://api.telegram.org/bot${encodeURIComponent(cleanToken)}/sendMessage`;
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
    if (!webhookUrl) return { success: false, message: 'Discord Webhook URL is required.' };

    const trimmedUrl = String(webhookUrl).trim();
    try {
      const u = new URL(trimmedUrl);
      if (u.protocol !== 'https:') {
        return { success: false, message: 'Discord Webhook must use HTTPS protocol.' };
      }
      const host = u.hostname.toLowerCase();
      const isDiscord =
        host === 'discord.com' ||
        host === 'discordapp.com' ||
        host.endsWith('.discord.com') ||
        host.endsWith('.discordapp.com');
      if (!isDiscord || !u.pathname.startsWith('/api/webhooks/')) {
        return { success: false, message: 'Invalid Discord Webhook domain or endpoint.' };
      }
    } catch {
      return { success: false, message: 'Invalid Discord Webhook URL format.' };
    }

    try {
      const response = await fetch(trimmedUrl, {
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
                text: `X-SENTINEL Core • ${new Date().toLocaleTimeString('en-US')}`,
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
   * Test webhook connectivity
   */
  async testWebhook({ type, telegramBotToken, telegramChatId, discordWebhookUrl } = {}) {
    if (type === 'telegram') {
      return this.sendTelegram(
        telegramBotToken,
        telegramChatId,
        '🛡️ <b>X-SENTINEL</b>: Telegram notification connection test successful! System operating normally.'
      );
    }

    if (type === 'discord') {
      return this.sendDiscord(discordWebhookUrl, {
        title: '🛡️ X-SENTINEL Webhook Test',
        description: 'Discord notification connection test successful! Monitoring system active.',
        color: 0x10b981,
        fields: [
          { name: 'Status', value: 'ONLINE', inline: true },
          { name: 'Platform', value: 'Discord Webhook', inline: true },
        ],
      });
    }

    const results = {};
    if (telegramBotToken && telegramChatId) {
      results.telegram = await this.sendTelegram(
        telegramBotToken,
        telegramChatId,
        '🛡️ <b>X-SENTINEL</b>: Telegram notification connection test successful!'
      );
    }
    if (discordWebhookUrl) {
      results.discord = await this.sendDiscord(discordWebhookUrl, {
        title: '🛡️ X-SENTINEL Webhook Test',
        description: 'Discord notification connection test successful!',
      });
    }

    if (Object.keys(results).length === 0) {
      return {
        success: false,
        message: 'Please specify webhook type or provide complete webhook credentials.',
      };
    }

    const allOk = Object.values(results).every((r) => r.success);
    return { success: allOk, results };
  }

  /**
   * Broadcast structured notification to all active webhooks
   */
  async notify(event, data = {}) {
    const settings = db.getSettings() || {};
    const { telegramEnabled, telegramBotToken, telegramChatId, discordEnabled, discordWebhookUrl } =
      settings;

    if (!telegramEnabled && !discordEnabled) return;

    let tgMessage = '';
    let discordTitle = '';
    let discordDesc = '';
    let discordColor = 0x3b82f6; // blue default
    let fields = [];

    const timeStr = new Date().toLocaleTimeString('en-US');

    switch (event) {
      case 'POST_PUBLISHED':
        tgMessage =
          `🚀 <b>X-SENTINEL • Post Published Successfully!</b>\n\n` +
          `👤 <b>Account:</b> @${data.accountName || 'Node'}\n` +
          `📝 <b>Content:</b> ${data.text || '-'}\n` +
          (data.tweetUrl ? `🔗 <b>Link:</b> ${data.tweetUrl}\n` : '') +
          `⏱️ <b>Time:</b> ${timeStr}`;

        discordTitle = '🚀 New Tweet Post Published';
        discordDesc = data.text || 'Post published successfully by fleet node.';
        discordColor = 0x10b981; // emerald green
        fields = [
          { name: 'Node Account', value: `@${data.accountName || 'Node'}`, inline: true },
          {
            name: 'Status Link',
            value: data.tweetUrl ? `[View Post](${data.tweetUrl})` : '-',
            inline: true,
          },
        ];
        break;

      case 'TASK_COMPLETED':
        tgMessage =
          `✅ <b>X-SENTINEL • Task Completed!</b>\n\n` +
          `🎯 <b>Type:</b> ${data.taskType || 'Batch Engagement'}\n` +
          `📊 <b>Completed:</b> ${data.totalTargets || 0} items\n` +
          `⏱️ <b>Time:</b> ${timeStr}`;

        discordTitle = '✅ Engagement Task Completed';
        discordDesc = `Task **${data.taskType || 'Engagement'}** has been completed successfully.`;
        discordColor = 0x10b981;
        fields = [
          { name: 'Task Type', value: data.taskType || 'Batch', inline: true },
          { name: 'Total Engagements', value: String(data.totalTargets || 0), inline: true },
        ];
        break;

      case 'TASK_FAILED':
        tgMessage =
          `❌ <b>X-SENTINEL • Task Error!</b>\n\n` +
          `🎯 <b>Type:</b> ${data.taskType || 'Engagement'}\n` +
          `⚠️ <b>Error:</b> ${data.error || 'System error encountered'}\n` +
          `⏱️ <b>Time:</b> ${timeStr}`;

        discordTitle = '❌ Task Execution Failed';
        discordDesc = `Task failed: **${data.error || 'Unknown Error'}**`;
        discordColor = 0xef4444; // red
        break;

      case 'SESSION_EXPIRED':
        tgMessage =
          `⚠️ <b>X-SENTINEL • Account Session Expired!</b>\n\n` +
          `👤 <b>Account:</b> @${data.accountName || data.label || 'Node'}\n` +
          `🔒 <b>Info:</b> auth_token cookie is no longer valid. Please renew cookies.\n` +
          `⏱️ <b>Time:</b> ${timeStr}`;

        discordTitle = '⚠️ Account Session Expired';
        discordDesc = `Account session for **@${data.accountName || data.label}** has expired.`;
        discordColor = 0xf59e0b; // amber
        break;

      case 'PROXY_DEAD':
        tgMessage =
          `🛑 <b>X-SENTINEL • Proxy Unreachable!</b>\n\n` +
          `👤 <b>Account:</b> @${data.accountName || data.label}\n` +
          `🌐 <b>Proxy:</b> ${data.proxy || '-'}\n` +
          `🛡️ <b>Action:</b> Account node auto-paused for safety.\n` +
          `⏱️ <b>Time:</b> ${timeStr}`;

        discordTitle = '🛑 Proxy Unreachable Alert';
        discordDesc = `Proxy for node **@${data.accountName || data.label}** is offline. Account auto-paused.`;
        discordColor = 0xef4444;
        break;

      case 'WARMUP_DAY_COMPLETED':
        tgMessage =
          `🐣 <b>X-SENTINEL • Account Warm-up Completed (Day ${data.day})!</b>\n\n` +
          `👤 <b>Account:</b> @${data.accountName || 'Node'}\n` +
          `📈 <b>Activity:</b> ${data.activity || 'Timeline browse & organic likes'}\n` +
          `⏱️ <b>Time:</b> ${timeStr}`;

        discordTitle = `🐣 Warm-up Routine Completed (Day ${data.day})`;
        discordDesc = `Account **@${data.accountName || 'Node'}** completed warm-up routine for day ${data.day}.`;
        discordColor = 0x8b5cf6; // purple
        break;

      default:
        tgMessage = `🛡️ <b>X-SENTINEL Alert:</b>\n${JSON.stringify(data, null, 2)}`;
        discordTitle = '🛡️ X-SENTINEL Notification';
        discordDesc = JSON.stringify(data);
    }

    // Send Telegram
    if (telegramEnabled && telegramBotToken && telegramChatId) {
      this.sendTelegram(telegramBotToken, telegramChatId, tgMessage).catch((err) => {
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
      }).catch((err) => {
        logger.warn(`⚠️ [Discord Alert Error]: ${err.message}`);
      });
    }
  }
}

module.exports = new NotifierService();
