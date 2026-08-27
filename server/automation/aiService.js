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

  /**
   * Generate 1 or multiple high-engagement Twitter/X post drafts from a keyword
   * @param {object} params
   * @param {string} params.keyword - Topic or keyword (e.g. "Solana Meme Coin", "React 19")
   * @param {string} params.style - Style preset (viral_hook, alpha_insight, educational_mini, story_builder, indo_community)
   * @param {string} params.language - 'en' | 'id' | 'auto'
   * @param {number} params.count - Number of variations (1-5, default 3)
   * @param {string} params.customPrompt - Optional custom prompt override
   * @param {object} params.customOverrides - Optional settings override
   */
  async generatePostFromKeyword({
    keyword,
    style = 'viral_hook',
    language = 'en',
    count = 3,
    customPrompt = '',
    customOverrides = {}
  }) {
    const settings = { ...db.getSettings(), ...customOverrides };
    const provider = settings.aiProvider || 'none';

    const safeCount = Math.max(1, Math.min(5, parseInt(count, 10) || 3));

    // Fallback if AI provider is disabled
    if (provider === 'none') {
      logger.info(`ℹ️ AI Provider 'none'. Menggunakan generator template fallback untuk "${keyword}"...`);
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        posts: this.generateFallbackPosts(keyword, style, language, safeCount)
      };
    }

    const providerConfig = this.getProviderConfig(settings);
    if (!providerConfig) {
      logger.warn(`⚠️ Provider AI tidak valid: "${provider}". Menggunakan fallback.`);
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        posts: this.generateFallbackPosts(keyword, style, language, safeCount)
      };
    }

    const apiKey = (settings.aiApiKey || '').trim();
    if (provider !== 'ollama' && !apiKey) {
      logger.warn('⚠️ AI Mode aktif namun API Key belum diisi. Menggunakan template fallback.');
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        posts: this.generateFallbackPosts(keyword, style, language, safeCount)
      };
    }

    const model = (settings.aiModel || '').trim() || providerConfig.defaultModel;

    // Style tone definitions
    let styleInstructions = '';
    switch (style) {
      case 'viral_hook':
        styleInstructions = 'Format: Punchy, contrarian, or high-curiosity opening hook. Short & impactful (1-3 lines max, under 220 chars). Makes readers stop scrolling.';
        break;
      case 'alpha_insight':
        styleInstructions = 'Format: Deep industry alpha, data/trend observation, or sharp technical analysis. Tone of a seasoned crypto/tech insider or quantitative researcher.';
        break;
      case 'educational_mini':
        styleInstructions = 'Format: 2-3 clean, high-value bullet points or a concise framework. Actionable takeaway for practitioners.';
        break;
      case 'story_builder':
        styleInstructions = 'Format: Authentic first-person builder/founder perspective. Casual, humble, yet compelling reflection or build-in-public update.';
        break;
      case 'indo_community':
        styleInstructions = 'Format: Bahasa Indonesia santai, relevan, berbobot. Menggunakan bahasa gaul tech/crypto Indonesia (misal: "ternyata", "POV", "riset", "insight", "kepo"). Jangan kaku atau baku seperti koran.';
        break;
      default:
        styleInstructions = 'Format: Sharp, authentic, human-grade tweet with high engagement value.';
    }

    const langInstruction =
      language === 'id' || style === 'indo_community'
        ? 'Output Language: Bahasa Indonesia (natural, modern tech/crypto community slang, NOT formal/robotic).'
        : 'Output Language: English (native, crypto/tech Twitter native phrasing).';

    const systemPrompt = `You are a top-tier ghostwriter and viral creator on X (Twitter).
Your task is to write exactly ${safeCount} unique, high-engagement standalone post drafts based on the user's keyword/topic.

STYLE GUIDELINE:
${styleInstructions}

LANGUAGE:
${langInstruction}

STRICT ANTI-AI-SLOP & SINGLE-LINE FORMAT RULES:
1. ABSOLUTELY NO NEWLINES (NO \\n OR LINE BREAKS): The entire post MUST be written as ONE SINGLE continuous fluent line. Use only regular spaces between sentences and thoughts. Never use bullet points on multiple lines or separate paragraphs.
2. ZERO AI SLOP: NEVER start with "Ever wondered why...", "In today's fast-paced world...", "Let's dive into...", "Here's the secret to...", "A quick reminder that...".
3. MAXIMUM 280 CHARACTERS per post (preferably 100-240 characters for maximum punchiness).
4. NO HASHTAG OVERLOAD: Max 0 to 1 subtle hashtag, or none at all.
5. DISTINCT VARIATIONS: Each of the ${safeCount} drafts must take a completely different angle, hook, or perspective on the keyword.
${customPrompt ? `6. SPECIAL USER INSTRUCTION: "${customPrompt}"` : ''}

RESPONSE FORMAT:
You MUST output ONLY a valid JSON object containing an array of single-line strings in this exact structure:
{
  "posts": [
    "Post variation 1 single-line text here...",
    "Post variation 2 single-line text here..."
  ]
}`;

    const userMessage = `Keyword / Topic: "${keyword}"\nGenerate ${safeCount} unique single-line post drafts (no newlines):`;

    try {
      logger.info(`🤖 Menghubungi AI (${provider.toUpperCase()} · ${model}) untuk generate ${safeCount} post tentang "${keyword}"...`);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(providerConfig.headers || {})
      };

      const endpoint = `${providerConfig.baseUrl}/chat/completions`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 600,
          temperature: 0.85,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const rawText = await response.text();

      if (!response.ok) {
        logger.warn(`⚠️ AI Post Gen Error (${response.status}): ${rawText.slice(0, 140)}`);
        return {
          success: true,
          isFallback: true,
          provider: 'fallback-spintax',
          posts: this.generateFallbackPosts(keyword, style, language, safeCount)
        };
      }

      const parsedData = this.safeParseResponse(rawText);
      let contentStr =
        parsedData?.choices?.[0]?.message?.content?.trim() ||
        parsedData?.choices?.[0]?.text?.trim() ||
        '';

      let extractedPosts = [];

      // Attempt JSON parse
      try {
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonResult = JSON.parse(jsonMatch[0]);
          if (Array.isArray(jsonResult.posts)) {
            extractedPosts = jsonResult.posts.map(p => String(p).trim()).filter(Boolean);
          }
        }
      } catch (err) {}

      // Fallback line extraction if JSON failed
      if (extractedPosts.length === 0 && contentStr) {
        extractedPosts = contentStr
          .split(/\n\s*\n|\n(?=\d+[\.\)])/)
          .map(s => s.replace(/^\d+[\.\)]\s*|^["'`]|["'`]$/g, '').trim())
          .filter(s => s.length > 10);
      }

      if (extractedPosts.length > 0) {
        // Clean each post: replace newlines with space, collapse whitespace, and trim
        const cleaned = extractedPosts.slice(0, safeCount).map(p =>
          p
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^["'`]|["'`]$/g, '')
            .trim()
        );
        logger.success(`🤖 Berhasil membuat ${cleaned.length} variasi post AI untuk "${keyword}"!`);
        return {
          success: true,
          isFallback: false,
          provider: `${provider.toUpperCase()} (${model})`,
          posts: cleaned
        };
      }

      throw new Error('Gagal mengekstrak postingan dari respons AI.');
    } catch (err) {
      logger.warn(`⚠️ AI Generation gagal (${err.message}). Beralih ke generator template fallback.`);
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        posts: this.generateFallbackPosts(keyword, style, language, safeCount)
      };
    }
  }

  /**
   * High quality offline fallback generator when AI API is unavailable (single line with spaces, no newlines)
   */
  generateFallbackPosts(keyword, style, language, count = 3) {
    const isIndo = language === 'id' || style === 'indo_community';
    const kw = keyword.trim();

    const templatesIndo = [
      `Banyak yang masih underestimate potensi ${kw}, padahal kalau dilihat dari flow likuiditas & traction belakangan ini, posisinya udah jauh lebih matang dibanding siklus sebelumnya. Apa POV kalian? 👀`,
      `Catatan riset seputar ${kw}: metrik on-chain & user retention terus naik konsisten, ekosistem dev makin luas, tinggal tunggu katalis makro buat trigger ekspansi. Jangan sampai FOMO pas udah breakout.`,
      `Satu hal yang paling menarik dari ${kw} adalah bagaimana dia menyelesaikan masalah efisiensi tanpa mengorbankan kecepatan. Yang udah riset mendalam pasti paham arahnya kemana. 🔥`,
      `POV: Orang-orang terlalu fokus sama noise jangka pendek, sampai lupa fundamental riil dari ${kw}. Fokus pada builders & arsitektur jangka panjang.`,
      `Lagi breakdown arsitektur & ekosistem ${kw} hari ini. Banyak angle menarik yang belum banyak dibahas di timeline. Drop pertanyaan atau insight kalian di bawah 👇`
    ];

    const templatesEn = [
      `Most people are still fading ${kw} because they look at short-term price rather than architecture & developer velocity. The real compounding happens when nobody is watching.`,
      `Quick breakdown on ${kw}: Scalability & execution throughput hitting new highs, ecosystem tooling maturing significantly, and asymmetric risk/reward setup forming. Are you positioned or still sidelined?`,
      `The inflection point for ${kw} is approaching faster than most realize. When liquidity rotates, infrastructure that actually works wins every single time. ⚡`,
      `Unpopular opinion: ${kw} is currently one of the most misunderstood plays in the entire space. Focus on actual retention and verifiable metrics, not timeline consensus.`,
      `Building and exploring around ${kw} today. The UX improvements and speed compared to previous cycles are genuinely night and day. What's your take?`
    ];

    const source = isIndo ? templatesIndo : templatesEn;
    // Shuffle and pick
    const shuffled = [...source].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

module.exports = new AIService();

