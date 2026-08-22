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
      case '9router':
        return {
          baseUrl: customBaseUrl || 'https://api.9router.com/v1',
          defaultModel: 'openai/gpt-4o-mini',
          headers: {
            'HTTP-Referer': 'https://x-sentinel.local',
            'X-Title': 'X-SENTINEL Cockpit'
          }
        };
      case 'openrouter':
        return {
          baseUrl: customBaseUrl || 'https://openrouter.ai/api/v1',
          defaultModel: 'openai/gpt-4o-mini',
          headers: {
            'HTTP-Referer': 'https://x-sentinel.local',
            'X-Title': 'X-SENTINEL Cockpit'
          }
        };
      case 'openai':
        return {
          baseUrl: customBaseUrl || 'https://api.openai.com/v1',
          defaultModel: 'gpt-4o-mini',
          headers: {}
        };
      case 'groq':
        return {
          baseUrl: customBaseUrl || 'https://api.groq.com/openai/v1',
          defaultModel: 'llama-3.3-70b-versatile',
          headers: {}
        };
      case 'gemini':
        return {
          baseUrl: customBaseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai',
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
   * Safely parse AI response bodies handling single JSON, SSE streams, and concatenated chunks
   */
  safeParseResponse(rawText) {
    if (!rawText || !rawText.trim()) {
      throw new Error('Respons dari endpoint AI kosong.');
    }

    const trimmed = rawText.trim();

    // 1. Direct standard JSON
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      // Continue to resilient fallback parsers
    }

    // 2. Markdown codeblock (```json ... ```)
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e) {}
    }

    // 3. SSE Stream chunk lines (data: {...}\n\ndata: {...})
    if (trimmed.includes('data:')) {
      const lines = trimmed.split('\n');
      let combinedContent = '';
      let lastDataObj = null;

      for (const line of lines) {
        const lineTrimmed = line.trim();
        if (lineTrimmed.startsWith('data:') && !lineTrimmed.includes('[DONE]')) {
          const jsonStr = lineTrimmed.replace(/^data:\s*/, '').trim();
          if (jsonStr) {
            try {
              const chunk = JSON.parse(jsonStr);
              lastDataObj = chunk;
              const delta =
                chunk?.choices?.[0]?.delta?.content ||
                chunk?.choices?.[0]?.message?.content ||
                chunk?.choices?.[0]?.text ||
                '';
              combinedContent += delta;
            } catch (err) {}
          }
        }
      }

      if (combinedContent || (lastDataObj && lastDataObj.choices)) {
        return {
          choices: [
            {
              message: {
                content:
                  combinedContent ||
                  lastDataObj?.choices?.[0]?.message?.content ||
                  lastDataObj?.choices?.[0]?.text ||
                  ''
              }
            }
          ]
        };
      }
    }

    // 4. Concatenated JSON chunks or trailing characters
    const firstBrace = trimmed.indexOf('{');
    if (firstBrace !== -1) {
      let depth = 0;
      let endBrace = -1;
      let inString = false;
      let escape = false;

      for (let i = firstBrace; i < trimmed.length; i++) {
        const char = trimmed[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') {
            depth--;
            if (depth === 0) {
              endBrace = i;
              break;
            }
          }
        }
      }

      if (endBrace !== -1) {
        try {
          const validSubJson = trimmed.substring(firstBrace, endBrace + 1);
          return JSON.parse(validSubJson);
        } catch (err) {}
      }
    }

    // 5. Fallback as raw text if not HTML
    if (trimmed.length > 0 && !trimmed.startsWith('<')) {
      return {
        choices: [
          {
            message: {
              content: trimmed
            }
          }
        ]
      };
    }

    throw new Error(`Format respons AI tidak valid: ${trimmed.slice(0, 100)}`);
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
    const personaPrompt =
      settings.aiPrompt ||
      'Write a sharp, authentic, and context-aware 1-sentence English reply as a crypto/tech native. Be insightful, peer-to-peer, and zero generic praise.';

    const systemPrompt = `You are a sharp, native, authentic human commenter on X (Twitter).
Your task is to write a single, natural, human-grade reply to the focal tweet.

STRICT ANTI-AI-SLOP & HUMAN CADENCE RULES:
1. ZERO AI SLOP OR BOT CLICHES: Never use generic bot phrases like "Great insights!", "Fascinating perspective!", "Thanks for sharing!", "In today's fast-paced world...", "It's important to remember that...", "Spot on!", "Couldn't agree more!".
2. ZERO SYCOPHANCY: Sound like an actual peer, developer, degen, or industry practitioner. Be conversational, direct, and slightly understated.
3. CONCISE & PUNCHY: Exactly 1 single sentence (12-25 words max). Do NOT write multi-sentence essays or bullet points.
4. NO FORMATTING ARTIFACTS: Never use quotation marks, never use bullet points, never use hashtags, and do not overuse emojis (at most 1 contextual emoji or none).
5. TWEET CONTEXT RELEVANCE: Directly reference a specific concept, tradeoff, or angle mentioned in the tweet rather than giving a vague reaction.
6. ADHERE TO THIS USER PERSONA: "${personaPrompt}"`;

    const userMessage = `Tweet Content:\n"${tweetText}"\n\nWrite your single natural human reply:`;

    try {
      logger.info(`🤖 Menghubungi AI (${provider.toUpperCase()} · ${model}) untuk meracik balasan...`);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(providerConfig.headers || {})
      };

      const endpoint = `${providerConfig.baseUrl}/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout for deep reasoning models

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
          temperature: 0.8,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();

      if (!response.ok) {
        logger.warn(`⚠️ AI API Error (${response.status}): ${rawText.slice(0, 120)}`);
        return null;
      }

      const data = this.safeParseResponse(rawText);
      const rawReply =
        data?.choices?.[0]?.message?.content?.trim() ||
        data?.choices?.[0]?.text?.trim() ||
        '';

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
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: 'Say "X-SENTINEL AI ONLINE" in 4 words.' }
          ],
          max_tokens: 30,
          temperature: 0.5,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          message: `API Error (${response.status}): ${rawText.slice(0, 180)}`
        };
      }

      const data = this.safeParseResponse(rawText);
      const reply =
        data?.choices?.[0]?.message?.content?.trim() ||
        data?.choices?.[0]?.text?.trim() ||
        '';

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
