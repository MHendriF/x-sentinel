/**
 * Spintax Parser & Text Generator
 * Supports format: {Option 1|Option 2|{Nested A|Nested B}}
 */

function parseSpintax(text) {
  if (!text || typeof text !== 'string') return '';

  const testRegex = /\{([^{}]+)\}/;
  let current = text;
  let maxIterations = 50;

  while (testRegex.test(current) && maxIterations-- > 0) {
    current = current.replace(/\{([^{}]+)\}/g, (_match, contents) => {
      const choices = contents.split('|');
      const randomIndex = Math.floor(Math.random() * choices.length);
      return choices[randomIndex];
    });
  }

  return current.trim();
}

function getRandomTemplate(templates) {
  if (!Array.isArray(templates) || templates.length === 0) {
    return 'Keren banget infonya bang! 🔥';
  }
  const randomIndex = Math.floor(Math.random() * templates.length);
  return parseSpintax(templates[randomIndex]);
}

/**
 * Generate AI-assisted reply if API key is provided
 */
async function generateAiReply(tweetText, author, provider, apiKey, customPrompt) {
  if (!apiKey || provider === 'none') {
    return null;
  }

  const prompt = `${customPrompt || 'Tulis 1 komentar singkat, positif, dan natural untuk tweet berikut'}\nPenulis: @${author || 'user'}\nIsi Tweet: "${tweetText}"\nKomentar:`;

  try {
    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 60,
              temperature: 0.7,
            },
          }),
        }
      );
      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim().replace(/^["']|["']$/g, '');
      }
    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 60,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    console.error('AI generation error:', err.message);
  }
  return null;
}

module.exports = {
  parseSpintax,
  getRandomTemplate,
  generateAiReply,
};
