const logger = require('../logger');
const db = require('../db');

class AIService {
  /**
   * Determine base URL and default model based on provider
   */
  getProviderConfig(settings) {
    const provider = settings.aiProvider || 'none';
    const customBaseUrl = settings.aiBaseUrl ? settings.aiBaseUrl.trim().replace(/\/+$/, '') : '';

    switch (provider.toLowerCase()) {
      case 'openrouter':
        return {
          baseUrl: 'https://openrouter.ai/api/v1',
          defaultModel: 'openai/gpt-4o-mini',
          headers: {
            'HTTP-Referer': 'https://x-sentinel.local',
            'X-Title': 'X-SENTINEL Cockpit'
          }
        };
      case 'openai':
        return {
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-4o-mini',
          headers: {}
        };
      case 'groq':
        return {
          baseUrl: 'https://api.groq.com/openai/v1',
          defaultModel: 'llama-3.3-70b-versatile',
          headers: {}
        };
      case 'gemini':
        return {
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
          defaultModel: 'gemini-1.5-flash',
          headers: {}
        };
      case 'ollama':
        return {
          baseUrl: customBaseUrl || 'http://localhost:11434/v1',
          defaultModel: 'llama3',
          headers: {}
        };
      case 'custom':
        return {
          baseUrl: customBaseUrl || 'https://api.openai.com/v1',
          defaultModel: 'gpt-4o-mini',
          headers: {}
        };
      default:
        return null;
    }
  }

  /**
   * Generate a context-aware human-like tweet reply
   * @param {string} tweetText - The text content of the target tweet
   * @param {object} account - The account executing the action
   * @param {object} customOverrides - Optional custom prompt/model
   */
  async generateContextualReply(tweetText, account = {}, customOverrides = {}) {
    const settings = { ...db.getSettings(), ...customOverrides };
    const provider = settings.aiProvider || 'none';

    if (provider === 'none') {
      return null;
    }

    const providerConfig = this.getProviderConfig(settings);
    if (!providerConfig) {
      logger.warn(`⚠️ Provider AI tidak valid: "${provider}"`);
      return null;
    }

    const apiKey = (settings.aiApiKey || '').trim();
    if (provider !== 'ollama' && !apiKey) {
      logger.warn('⚠️ AI Mode aktif namun API Key belum diisi di Pengaturan.');
      return null;
    }

    const model = (settings.aiModel || '').trim() || providerConfig.defaultModel;
    const personaPrompt = settings.aiPrompt || 'Tulis 1 balasan singkat, santai, alami, relevan, dan menarik untuk tweet berikut. Jangan gunakan tanda petik atau hashtag berlebihan.';

    const systemPrompt = `You are a savvy, genuine human user on X (Twitter).
Your task is to write a single natural, thoughtful, and contextually relevant reply to a tweet.
Guidelines:
- Keep it concise (1 to 2 sentences maximum, under 180 characters).
- Sound like a real person, not an AI bot.
- Directly address the points or sentiment in the tweet.
- Do NOT use robotic phrases like "Great post!", "As an AI", or introductory greetings unless natural.
- Do NOT put quotes around your response.
- Follow this persona/instruction: "${personaPrompt}"`;

    const userMessage = `Tweet Content:\n"${tweetText}"\n\nGenerate your reply:`;

    try {
      logger.info(`🤖 Menghubungi AI (${provider.toUpperCase()} · ${model}) untuk meracik balasan...`);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(providerConfig.headers || {})
      };

      const endpoint = `${providerConfig.baseUrl}/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 sec timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 100,
          temperature: 0.8
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`⚠️ AI API Error (${response.status}): ${errorText.slice(0, 120)}`);
        return null;
      }

      const data = await response.json();
      const rawReply = data?.choices?.[0]?.message?.content?.trim();

      if (!rawReply) {
        logger.warn('⚠️ AI API tidak mengembalikan konten balasan.');
        return null;
      }

      // Clean surrounding quotes if model outputs them
      const cleanedReply = rawReply.replace(/^["'`]|["'`]$/g, '').trim();
      logger.success(`🤖 AI Generated Reply: "${cleanedReply}"`);
      return cleanedReply;
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.warn('⚠️ AI API Timeout (lebih dari 15 detik). Beralih ke fallback template.');
      } else {
        logger.warn(`⚠️ Gagal generate AI Reply: ${err.message}. Beralih ke fallback.`);
      }
      return null;
    }
  }

  /**
   * Test AI Connection & Credentials
   */
  async testConnection(settingsOverride = {}) {
    const settings = { ...db.getSettings(), ...settingsOverride };
    const provider = settings.aiProvider || 'none';

    if (provider === 'none') {
      return { success: false, message: 'Pilih salah satu provider AI terlebih dahulu.' };
    }

    const providerConfig = this.getProviderConfig(settings);
    if (!providerConfig) {
      return { success: false, message: `Provider "${provider}" tidak didukung.` };
    }

    const apiKey = (settings.aiApiKey || '').trim();
    if (provider !== 'ollama' && !apiKey) {
      return { success: false, message: 'API Key wajib diisi untuk menguji koneksi.' };
    }

    const model = (settings.aiModel || '').trim() || providerConfig.defaultModel;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(providerConfig.headers || {})
      };

      const endpoint = `${providerConfig.baseUrl}/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: 'Say "X-SENTINEL AI ONLINE" in 4 words.' }
          ],
          max_tokens: 30,
          temperature: 0.5
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          status: response.status,
          message: `API Error (${response.status}): ${errorText.slice(0, 180)}`
        };
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();

      return {
        success: true,
        model,
        provider,
        sampleOutput: reply || 'Connected',
        message: `Koneksi berhasil ke ${provider.toUpperCase()} (${model})!`
      };
    } catch (err) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'Koneksi Timeout (12s)' : err.message
      };
    }
  }
}

module.exports = new AIService();
