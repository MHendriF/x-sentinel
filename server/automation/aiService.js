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
            'X-Title': 'X-SENTINEL Cockpit',
          },
        };
      case 'openrouter':
        return {
          baseUrl: customBaseUrl || 'https://openrouter.ai/api/v1',
          defaultModel: 'openai/gpt-4o-mini',
          headers: {
            'HTTP-Referer': 'https://x-sentinel.local',
            'X-Title': 'X-SENTINEL Cockpit',
          },
        };
      case 'openai':
        return {
          baseUrl: customBaseUrl || 'https://api.openai.com/v1',
          defaultModel: 'gpt-4o-mini',
          headers: {},
        };
      case 'groq':
        return {
          baseUrl: customBaseUrl || 'https://api.groq.com/openai/v1',
          defaultModel: 'llama-3.3-70b-versatile',
          headers: {},
        };
      case 'gemini':
        return {
          baseUrl: customBaseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai',
          defaultModel: 'gemini-1.5-flash',
          headers: {},
        };
      case 'ollama':
        return {
          baseUrl: customBaseUrl || 'http://localhost:11434/v1',
          defaultModel: 'llama3',
          headers: {},
        };
      case 'custom':
        return {
          baseUrl: customBaseUrl || 'https://api.openai.com/v1',
          defaultModel: 'gpt-4o-mini',
          headers: {},
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
                  '',
              },
            },
          ],
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
              content: trimmed,
            },
          },
        ],
      };
    }

    throw new Error(`Invalid AI response format: ${trimmed.slice(0, 100)}`);
  }

  /**
   * Generate a context-aware human-like tweet reply
   * @param {string} tweetText - The text content of the target tweet
   * @param {object} account - The account executing the action
   * @param {object} customOverrides - Optional custom prompt/model
   */
  async generateContextualReply(tweetText, _account = {}, customOverrides = {}) {
    const settings = { ...db.getSettings(), ...customOverrides };
    const provider = settings.aiProvider || 'none';

    if (provider === 'none') {
      return null;
    }

    const providerConfig = this.getProviderConfig(settings);
    if (!providerConfig) {
      logger.warn(`⚠️ Invalid AI Provider: "${provider}"`);
      return null;
    }

    const apiKey = (settings.aiApiKey || '').trim();
    if (provider !== 'ollama' && !apiKey) {
      logger.warn('⚠️ AI Mode active but API Key is missing in Settings.');
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
      logger.info(
        `🤖 Querying AI (${provider.toUpperCase()} · ${model}) to craft reply...`
      );

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(providerConfig.headers || {}),
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
            { role: 'user', content: userMessage },
          ],
          max_tokens: 100,
          temperature: 0.8,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();

      if (!response.ok) {
        logger.warn(`⚠️ AI API Error (${response.status}): ${rawText.slice(0, 120)}`);
        return null;
      }

      const data = this.safeParseResponse(rawText);
      const rawReply =
        data?.choices?.[0]?.message?.content?.trim() || data?.choices?.[0]?.text?.trim() || '';

      if (!rawReply) {
        logger.warn('⚠️ AI API returned no reply content.');
        return null;
      }

      // Clean surrounding quotes if model outputs them
      const cleanedReply = rawReply.replace(/^["'`]|["'`]$/g, '').trim();
      logger.success(`🤖 AI Generated Reply: "${cleanedReply}"`);
      return cleanedReply;
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.warn('⚠️ AI API Timeout (>15 seconds). Falling back to template.');
      } else {
        logger.warn(`⚠️ AI Reply generation failed: ${err.message}. Falling back to template.`);
      }
      return null;
    }
  }

  /**
   * Test AI Connection & Credentials
   */
  async testConnection(settingsOverride = {}) {
    const stored = db.getSettings() || {};
    const settings = { ...stored, ...settingsOverride };

    // Security hardening: If custom aiBaseUrl differs from stored and no explicit apiKey is given, do not forward stored key
    if (
      settingsOverride.aiBaseUrl &&
      stored.aiBaseUrl !== settingsOverride.aiBaseUrl &&
      !settingsOverride.aiApiKey
    ) {
      settings.aiApiKey = '';
    }

    const provider = settings.aiProvider || 'none';

    if (provider === 'none') {
      return { success: false, message: 'Please select an AI provider first.' };
    }

    const providerConfig = this.getProviderConfig(settings);
    if (!providerConfig) {
      return { success: false, message: `Provider "${provider}" is not supported.` };
    }

    const apiKey = (settings.aiApiKey || '').trim();
    if (provider !== 'ollama' && !apiKey) {
      return { success: false, message: 'API Key is required to test connectivity.' };
    }

    const model = (settings.aiModel || '').trim() || providerConfig.defaultModel;

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(providerConfig.headers || {}),
      };

      const endpoint = `${providerConfig.baseUrl}/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say "X-SENTINEL AI ONLINE" in 4 words.' }],
          max_tokens: 30,
          temperature: 0.5,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          message: `API Error (${response.status}): ${rawText.slice(0, 180)}`,
        };
      }

      const data = this.safeParseResponse(rawText);
      const reply =
        data?.choices?.[0]?.message?.content?.trim() || data?.choices?.[0]?.text?.trim() || '';

      return {
        success: true,
        model,
        provider,
        sampleOutput: reply || 'Connected',
        message: `Connection established to ${provider.toUpperCase()} (${model})!`,
      };
    } catch (err) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'Connection Timeout (25s)' : err.message,
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
    customOverrides = {},
  }) {
    const settings = { ...db.getSettings(), ...customOverrides };
    const provider = settings.aiProvider || 'none';

    const safeCount = Math.max(1, Math.min(5, parseInt(count, 10) || 3));

    // Fallback if AI provider is disabled
    if (provider === 'none') {
      logger.info(
        `ℹ️ AI Provider 'none'. Using fallback template generator for "${keyword}"...`
      );
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        posts: this.generateFallbackPosts(keyword, style, language, safeCount),
      };
    }

    const providerConfig = this.getProviderConfig(settings);
    if (!providerConfig) {
      logger.warn(`⚠️ Invalid AI Provider: "${provider}". Using fallback template.`);
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        posts: this.generateFallbackPosts(keyword, style, language, safeCount),
      };
    }

    const apiKey = (settings.aiApiKey || '').trim();
    if (provider !== 'ollama' && !apiKey) {
      logger.warn('⚠️ AI Mode active but API Key is missing. Using fallback template.');
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        posts: this.generateFallbackPosts(keyword, style, language, safeCount),
      };
    }

    const model = (settings.aiModel || '').trim() || providerConfig.defaultModel;

    // Style tone definitions
    let styleInstructions = '';
    switch (style) {
      case 'viral_hook':
        styleInstructions =
          'Format: Punchy, contrarian, or high-curiosity opening hook. Short & impactful (1-3 lines max, under 220 chars). Makes readers stop scrolling.';
        break;
      case 'alpha_insight':
        styleInstructions =
          'Format: Deep industry alpha, data/trend observation, or sharp technical analysis. Tone of a seasoned crypto/tech insider or quantitative researcher.';
        break;
      case 'educational_mini':
        styleInstructions =
          'Format: 2-3 clean, high-value bullet points or a concise framework. Actionable takeaway for practitioners.';
        break;
      case 'story_builder':
        styleInstructions =
          'Format: Authentic first-person builder/founder perspective. Casual, humble, yet compelling reflection or build-in-public update.';
        break;
      case 'indo_community':
        styleInstructions =
          'Format: Bahasa Indonesia santai, relevan, berbobot. Menggunakan bahasa gaul tech/crypto Indonesia (misal: "ternyata", "POV", "riset", "insight", "kepo"). Jangan kaku atau baku seperti koran.';
        break;
      default:
        styleInstructions =
          'Format: Sharp, authentic, human-grade tweet with high engagement value.';
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
      logger.info(
        `🤖 Querying AI (${provider.toUpperCase()} · ${model}) to generate ${safeCount} posts for "${keyword}"...`
      );

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(providerConfig.headers || {}),
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
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 600,
          temperature: 0.85,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const rawText = await response.text();

      if (!response.ok) {
        logger.warn(`⚠️ AI Post Gen Error (${response.status}): ${rawText.slice(0, 140)}`);
        return {
          success: true,
          isFallback: true,
          provider: 'fallback-spintax',
          posts: this.generateFallbackPosts(keyword, style, language, safeCount),
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
            extractedPosts = jsonResult.posts.map((p) => String(p).trim()).filter(Boolean);
          }
        }
      } catch (err) {}

      // Fallback line extraction if JSON failed
      if (extractedPosts.length === 0 && contentStr) {
        extractedPosts = contentStr
          .split(/\n\s*\n|\n(?=\d+[.)])/)
          .map((s) => s.replace(/^\d+[.)]\s*|^["'`]|["'`]$/g, '').trim())
          .filter((s) => s.length > 10);
      }

      if (extractedPosts.length > 0) {
        // Clean each post: replace newlines with space, collapse whitespace, and trim
        const cleaned = extractedPosts.slice(0, safeCount).map((p) =>
          p
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^["'`]|["'`]$/g, '')
            .trim()
        );
        logger.success(`🤖 Generated ${cleaned.length} AI post variations for "${keyword}"!`);
        return {
          success: true,
          isFallback: false,
          provider: `${provider.toUpperCase()} (${model})`,
          posts: cleaned,
        };
      }

      throw new Error('Failed to extract posts from AI response.');
    } catch (err) {
      logger.warn(
        `⚠️ AI Generation failed (${err.message}). Switching to fallback template generator.`
      );
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        posts: this.generateFallbackPosts(keyword, style, language, safeCount),
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
      `Lagi breakdown arsitektur & ekosistem ${kw} hari ini. Banyak angle menarik yang belum banyak dibahas di timeline. Drop pertanyaan atau insight kalian di bawah 👇`,
    ];

    const templatesEn = [
      `Most people are still fading ${kw} because they look at short-term price rather than architecture & developer velocity. The real compounding happens when nobody is watching.`,
      `Quick breakdown on ${kw}: Scalability & execution throughput hitting new highs, ecosystem tooling maturing significantly, and asymmetric risk/reward setup forming. Are you positioned or still sidelined?`,
      `The inflection point for ${kw} is approaching faster than most realize. When liquidity rotates, infrastructure that actually works wins every single time. ⚡`,
      `Unpopular opinion: ${kw} is currently one of the most misunderstood plays in the entire space. Focus on actual retention and verifiable metrics, not timeline consensus.`,
      `Building and exploring around ${kw} today. The UX improvements and speed compared to previous cycles are genuinely night and day. What's your take?`,
    ];

    const source = isIndo ? templatesIndo : templatesEn;
    // Shuffle and pick
    const shuffled = [...source].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Generate multiple human-like reply payloads from a focal post/tweet without double quotes
   * Prompt pattern: "Create 15 reply from this post without any double quotes, make not see like AI Slop then save in json file."
   * @param {object} params
   * @param {string} params.postText - The tweet or focal post text
   * @param {number} params.count - Number of replies to generate (default: 15, range: 1-50)
   * @param {string} params.tone - Style tone (peer_native, indo_community, contrarian, builder_raw, short_punchy)
   * @param {string} params.language - 'auto' | 'en' | 'id'
   * @param {string} params.customInstruction - Optional custom prompt instruction
   * @param {object} params.customOverrides - Optional settings overrides
   */
  async generatePayloadRepliesFromPost({
    postText,
    count = 15,
    tone = 'peer_native',
    language = 'auto',
    customInstruction = '',
    customOverrides = {},
  }) {
    const settings = { ...db.getSettings(), ...customOverrides };
    const provider = settings.aiProvider || 'none';
    const safeCount = Math.max(1, Math.min(50, parseInt(count, 10) || 15));
    const cleanPost = String(postText || '').trim();

    if (!cleanPost) {
      throw new Error('Target post text is required.');
    }

    // Determine target language: if 'auto', detect if Indonesian words appear frequently
    let resolvedLanguage = language;
    if (resolvedLanguage === 'auto') {
      const indoKeywords =
        /\b(dan|yang|di|ini|itu|ke|bisa|untuk|dengan|kita|kalian|udah|banget|nggak|aja|kalo|dari|buat)\b/i;
      resolvedLanguage = indoKeywords.test(cleanPost) || tone === 'indo_community' ? 'id' : 'en';
    }

    // Fallback if AI provider is disabled
    if (provider === 'none') {
      logger.info(
        `ℹ️ AI Provider 'none'. Using anti-slop fallback generator for ${safeCount} replies...`
      );
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        count: safeCount,
        replies: this.generateFallbackRepliesFromPost(cleanPost, safeCount, resolvedLanguage, tone),
      };
    }

    const providerConfig = this.getProviderConfig(settings);
    if (!providerConfig) {
      logger.warn(`⚠️ Invalid AI Provider: "${provider}". Using fallback template generator.`);
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        count: safeCount,
        replies: this.generateFallbackRepliesFromPost(cleanPost, safeCount, resolvedLanguage, tone),
      };
    }

    const apiKey = (settings.aiApiKey || '').trim();
    if (provider !== 'ollama' && !apiKey) {
      logger.warn('⚠️ AI Mode active but API Key is missing. Using fallback template.');
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        count: safeCount,
        replies: this.generateFallbackRepliesFromPost(cleanPost, safeCount, resolvedLanguage, tone),
      };
    }

    const model = (settings.aiModel || '').trim() || providerConfig.defaultModel;

    // Tone instructions
    let toneDescription = '';
    switch (tone) {
      case 'indo_community':
        toneDescription =
          'Tone: Santai, cerdas, berbobot ala komunitas tech & crypto Indonesia (slang wajar seperti "POV", "flow", "mindset", "retention", jangan kaku seperti berita koran).';
        break;
      case 'contrarian':
        toneDescription =
          'Tone: Contrarian, analytical, and slightly skeptical. Questioning assumptions, pointing out hidden tradeoffs or overlooked execution risks.';
        break;
      case 'builder_raw':
        toneDescription =
          'Tone: Pragmatic builder / developer perspective. Focused on developer tooling, shipping velocity, and real production realities.';
        break;
      case 'short_punchy':
        toneDescription =
          'Tone: Extremely punchy, witty, and concise. 8-15 words max per reply, razor-sharp observation.';
        break;
      case 'peer_native':
      default:
        toneDescription =
          'Tone: Sharp, authentic tech/crypto practitioner peer. Intelligent, insightful, zero generic sycophancy.';
    }

    const langInstruction =
      resolvedLanguage === 'id'
        ? 'Language: Bahasa Indonesia (modern tech slang, natural human cadence).'
        : 'Language: English (native Twitter / X tech discourse style).';

    const systemPrompt = `You are an elite, highly authentic human commenter on X (Twitter).
Your task is to generate exactly ${safeCount} unique, high-engagement reply options to the target post.

STRICT INSTRUCTIONS:
1. ABSOLUTELY NO DOUBLE QUOTES: Under NO circumstances should you output double quote marks (") or smart quotes (“ ”). Do not wrap individual replies in double quotes.
2. ZERO AI SLOP OR BOT CLICHES: Never use sycophantic or generic bot phrases like "Great insights!", "Fascinating perspective!", "Spot on!", "Couldn't agree more!", "Thanks for sharing!", "In today's fast-paced world...", "It is important to remember that...".
3. HUMAN PEER CADENCE: Sound like an actual human practitioner, trader, engineer, or researcher joining the conversation. Be insightful, concise, and direct.
4. ONE SINGLE SENTENCE PER REPLY: Exactly 1 single line per reply (10-25 words max). Absolutely NO newlines (\\n) within any reply.
5. DIVERSE ANGLES: Each of the ${safeCount} replies must take a distinctly different angle, tradeoff, observation, or question based on the focal post.
6. NO FORMATTING ARTIFACTS: Never include numbers (1., 2.), bullet points (-), hashtags, or markdown formatting inside the replies. Maximum 0-1 subtle contextual emoji or none.
${toneDescription}
${langInstruction}
${customInstruction ? `SPECIAL USER DIRECTIVE: ${customInstruction}` : ''}

RESPONSE FORMAT:
You MUST output ONLY a valid JSON object with a single "replies" array containing ${safeCount} clean strings:
{
  "replies": [
    "reply 1 text here without double quotes",
    "reply 2 text here without double quotes"
  ]
}`;

    const userMessage = `Create ${safeCount} reply from this post without any double quotes, make not see like AI Slop then save in json file.

Post :
${cleanPost}`;

    try {
      logger.info(
        `🤖 Querying AI (${provider.toUpperCase()} · ${model}) to generate ${safeCount} anti-slop payload replies...`
      );

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(providerConfig.headers || {}),
      };

      const endpoint = `${providerConfig.baseUrl}/chat/completions`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for 15-30 items

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          max_tokens: Math.min(2500, Math.max(500, safeCount * 70)),
          temperature: 0.85,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const rawText = await response.text();

      if (!response.ok) {
        logger.warn(`⚠️ AI Payload Replies Error (${response.status}): ${rawText.slice(0, 160)}`);
        return {
          success: true,
          isFallback: true,
          provider: 'fallback-spintax',
          count: safeCount,
          replies: this.generateFallbackRepliesFromPost(
            cleanPost,
            safeCount,
            resolvedLanguage,
            tone
          ),
        };
      }

      const parsedData = this.safeParseResponse(rawText);
      let contentStr =
        parsedData?.choices?.[0]?.message?.content?.trim() ||
        parsedData?.choices?.[0]?.text?.trim() ||
        '';

      let extractedReplies = [];

      // 1. Try parsing direct JSON
      try {
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonResult = JSON.parse(jsonMatch[0]);
          if (Array.isArray(jsonResult.replies)) {
            extractedReplies = jsonResult.replies;
          } else if (Array.isArray(jsonResult.posts)) {
            extractedReplies = jsonResult.posts;
          } else if (Array.isArray(jsonResult)) {
            extractedReplies = jsonResult;
          }
        }
      } catch (err) {}

      // 2. Fallback line extraction if JSON failed
      if (extractedReplies.length === 0 && contentStr) {
        extractedReplies = contentStr
          .split(/\r?\n/)
          .map((line) =>
            line
              .replace(/^\s*\d+[.)\-*]\s*/, '')
              .replace(/^["'`]|["'`]$/g, '')
              .trim()
          )
          .filter((line) => line.length > 10 && !line.startsWith('{') && !line.startsWith('}'));
      }

      // 3. Clean and sanitize all replies: STRICTLY REMOVE ALL DOUBLE QUOTES
      const cleaned = extractedReplies
        .map((r) =>
          String(r)
            .replace(/["“”]/g, '') // remove all double quotes & smart quotes
            .replace(/[\r\n]+/g, ' ') // single line
            .replace(/^\s*\d+[.)\-*]\s*/, '') // remove leading enumeration
            .replace(/^['`]|['`]$/g, '') // remove wrapping single quotes
            .replace(/\s+/g, ' ') // collapse spaces
            .trim()
        )
        .filter((r) => r.length > 5);

      if (cleaned.length > 0) {
        // If we got fewer than requested, top up with non-duplicate fallbacks
        let finalReplies = cleaned.slice(0, safeCount);
        if (finalReplies.length < safeCount) {
          const fallbacks = this.generateFallbackRepliesFromPost(
            cleanPost,
            safeCount,
            resolvedLanguage,
            tone
          );
          for (const fb of fallbacks) {
            if (finalReplies.length >= safeCount) break;
            if (!finalReplies.includes(fb)) {
              finalReplies.push(fb);
            }
          }
        }

        logger.success(
          `🤖 Generated ${finalReplies.length} AI payload replies without double quotes!`
        );
        return {
          success: true,
          isFallback: false,
          provider: `${provider.toUpperCase()} (${model})`,
          count: finalReplies.length,
          replies: finalReplies,
        };
      }

      throw new Error('Unable to extract reply array from AI response.');
    } catch (err) {
      logger.warn(
        `⚠️ AI Payload Generation failed (${err.message}). Switching to anti-slop fallback generator.`
      );
      return {
        success: true,
        isFallback: true,
        provider: 'fallback-spintax',
        count: safeCount,
        replies: this.generateFallbackRepliesFromPost(cleanPost, safeCount, resolvedLanguage, tone),
      };
    }
  }

  /**
   * High-quality offline fallback generator for reply payloads (no double quotes, single line, anti-slop)
   */
  generateFallbackRepliesFromPost(postText, count = 15, language = 'en', tone = 'peer_native') {
    const isIndo = language === 'id' || tone === 'indo_community';
    const cleanPost = String(postText || '').trim();

    // Extract potential focal keywords or short phrases
    const words = cleanPost
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 4 && !/^(about|their|there|which|would|could|should|these|those)$/i.test(w)
      );
    const focalTerm = words.length > 0 ? words[0] : isIndo ? 'tren ini' : 'this dynamic';

    const englishPool = [
      `The distribution side of ${focalTerm} will matter ten times more than raw benchmark figures.`,
      `Most people are sleeping on the second-order effects of how this actually scales in production.`,
      `Execution speed here is everything, whoever captures developer mindshare first wins.`,
      `Curious how this holds up once network load and gas fees test throughput under peak stress.`,
      `The tooling around ${focalTerm} is still surprisingly primitive, which creates massive builder upside.`,
      `Sounds good on paper, but the true test will be 60-day user retention after initial hype cools down.`,
      `Been thinking through this exact tradeoff lately and the friction points are very real.`,
      `The moat here is proprietary context and data pipelining, not the raw underlying model.`,
      `Everyone focuses on the tech stack while ignoring the incentive mechanisms that drive adoption.`,
      `Clean breakdown of the dynamics at play, especially the observation around infrastructure maturity.`,
      `Feels like an inflection point that most observers will only recognize in hindsight.`,
      `Simple architectures that actually ship beat complex theoretical models every single time.`,
      `The real alpha is in how quickly this integrates with existing legacy workflows.`,
      `Fascinating seeing this thesis play out in real-time over the last couple quarters.`,
      `Completely aligned on the bottleneck shifting from compute throughput to distribution velocity.`,
      `The risk-reward asymmetry here is massive for anyone positioning early before consensus catches on.`,
      `A lot of noise on the timeline today, but this is the signal worth paying close attention to.`,
      `Worth watching closely how liquidity and user flows respond over the next few weeks.`,
      `The interoperability angle will make or break this once competing protocols react.`,
      `Underrated aspect: developer UX will determine which ecosystem captures the sticky liquidity.`,
      `Hardest problem here is not building the rails, it is driving sustainable organic demand.`,
      `Very few teams appreciate how much friction users experience at this exact step.`,
      `When liquidity rotates, infrastructure that actually functions wins without exception.`,
      `The contrast between timeline perception and actual developer activity on ${focalTerm} is striking.`,
      `Quiet compounding happens during these phases when mainstream attention is elsewhere.`,
    ];

    const indoPool = [
      `Poin kuncinya emang di distribusi sih, tech bagus tanpa user onboarding yang seamless bakal susah scale.`,
      `Banyak yang masih fokus ke hype jangka pendek, padahal pondasi infrastruktur ${focalTerm} yang justru makin solid.`,
      `Menarik banget ngeliat pergeseran tren ini, apalagi kalau diliat dari data retention belakangan ini.`,
      `Tantangan terbesarnya nanti pas volume transaksi naik drastis, kuat nahan beban gas fee atau nggak.`,
      `Masih banyak yang underestimate potensi ${focalTerm} cuma gara-gara harganya lagi sideways.`,
      `Tooling ekosistemnya emang belum semulus web2, tapi potensi akselerasinya gila-gilaan.`,
      `POV yang jarang dibahas di timeline tapi justru paling relevan buat builders jangka panjang.`,
      `Yang paling penting itu konsistensi dev activity, bukan sekadar metrik vanity di awal rilis.`,
      `Bakal menarik liat respon market dalam beberapa minggu ke depan setelah katalis ini jalan.`,
      `Simpel tapi kena banget esensinya, fokus ke fundamental daripada kebawa panik arus timeline.`,
      `Tinggal tunggu waktu sampai adopsinya mulai meluas ke layer retail.`,
      `Infrastruktur yang reliable bakal selalu menang lawan narasi kosong pas siklus rotasi likuiditas.`,
      `Catatan riset yang solid, terutama soal efisiensi dan komparasi arsitektur seputar ${focalTerm}.`,
      `Eksekusi lapangan selalu lebih sulit daripada whitepaper, tapi arah geraknya udah tepat.`,
      `Setuju, bottleneck utamanya sekarang bukan di komputasi tapi di kemudahan akses end-user.`,
      `Asimetri risk-reward di area ini masih gede banget buat yang udah curi start riset duluan.`,
      `Fokus ke retention user riil dan cashflow protokol, bukan sekadar rumor listing exchange.`,
      `Angle yang fresh banget, ngebuka mata soal arah pergerakan modal smart money belakangan ini.`,
      `UX dan biaya transaksi bakal jadi penentu utama mana yang bakal survive di siklus berikutnya.`,
      `Satu hal yang pasti, utilitas nyata bakal selalu nemu jalannya sendiri ke market.`,
    ];

    const pool = isIndo ? indoPool : englishPool;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    // Ensure absolutely NO double quotes in fallback
    return selected.map((s) => s.replace(/["“”]/g, '').trim());
  }
}

module.exports = new AIService();
