//! Multi-provider AI gateway, resilient JSON/SSE parser, and anti-slop fallback generators.

use rand::seq::SliceRandom;
use regex::Regex;
use serde::Serialize;
use serde_json::{Value, json};
use std::sync::LazyLock;
use std::time::Duration;

use crate::domain::models::Settings;

static CODE_BLOCK_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"```(?:json)?\s*([\s\S]*?)\s*```").expect("valid codeblock regex"));
static ENUM_PREFIX_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*\d+[.)\-*]\s*").expect("valid enum prefix regex"));
static INDO_WORDS_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(dan|yang|di|ini|itu|ke|bisa|untuk|dengan|kita|kalian|udah|banget|nggak|aja|kalo|dari|buat)\b")
        .expect("valid indo regex")
});
static STOP_WORDS_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(about|their|there|which|would|could|should|these|those)$")
        .expect("valid stopword regex")
});

#[derive(Debug, Clone)]
pub struct ProviderConfig {
    pub base_url: String,
    pub default_model: String,
    pub extra_headers: Vec<(&'static str, &'static str)>,
}

#[derive(Debug, Clone, Default)]
pub struct AiOverrides {
    pub ai_provider: Option<String>,
    pub ai_api_key: Option<String>,
    pub ai_model: Option<String>,
    pub ai_base_url: Option<String>,
    pub ai_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PostGenerationResult {
    pub success: bool,
    pub is_fallback: bool,
    pub provider: String,
    pub posts: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadRepliesResult {
    pub success: bool,
    pub is_fallback: bool,
    pub provider: String,
    pub count: usize,
    pub replies: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sample_output: Option<String>,
    pub message: String,
}

pub fn merge_settings(stored: &Settings, overrides: &AiOverrides) -> Settings {
    let mut merged = stored.clone();
    if let Some(p) = &overrides.ai_provider {
        merged.ai_provider = p.clone();
    }
    if let Some(k) = &overrides.ai_api_key {
        merged.ai_api_key = k.clone();
    }
    if let Some(m) = &overrides.ai_model {
        merged.ai_model = Some(m.clone());
    }
    if let Some(b) = &overrides.ai_base_url {
        if stored.ai_base_url.as_deref() != Some(b.as_str()) && overrides.ai_api_key.is_none() {
            merged.ai_api_key.clear();
        }
        merged.ai_base_url = Some(b.clone());
    }
    if let Some(prompt) = &overrides.ai_prompt {
        merged.ai_prompt = prompt.clone();
    }
    merged
}

pub fn get_provider_config(settings: &Settings) -> Option<ProviderConfig> {
    let provider = settings.ai_provider.trim().to_ascii_lowercase();
    let custom_base = settings
        .ai_base_url
        .as_deref()
        .map(str::trim)
        .unwrap_or("")
        .trim_end_matches('/')
        .to_string();

    let base = |default_url: &str| {
        if custom_base.is_empty() {
            default_url.to_string()
        } else {
            custom_base.clone()
        }
    };

    match provider.as_str() {
        "9router" => Some(ProviderConfig {
            base_url: base("https://api.9router.com/v1"),
            default_model: "openai/gpt-4o-mini".to_string(),
            extra_headers: vec![
                ("HTTP-Referer", "https://x-sentinel.local"),
                ("X-Title", "X-SENTINEL Cockpit"),
            ],
        }),
        "openrouter" => Some(ProviderConfig {
            base_url: base("https://openrouter.ai/api/v1"),
            default_model: "openai/gpt-4o-mini".to_string(),
            extra_headers: vec![
                ("HTTP-Referer", "https://x-sentinel.local"),
                ("X-Title", "X-SENTINEL Cockpit"),
            ],
        }),
        "openai" => Some(ProviderConfig {
            base_url: base("https://api.openai.com/v1"),
            default_model: "gpt-4o-mini".to_string(),
            extra_headers: vec![],
        }),
        "groq" => Some(ProviderConfig {
            base_url: base("https://api.groq.com/openai/v1"),
            default_model: "llama-3.3-70b-versatile".to_string(),
            extra_headers: vec![],
        }),
        "gemini" => Some(ProviderConfig {
            base_url: base("https://generativelanguage.googleapis.com/v1beta/openai"),
            default_model: "gemini-1.5-flash".to_string(),
            extra_headers: vec![],
        }),
        "ollama" => Some(ProviderConfig {
            base_url: base("http://localhost:11434/v1"),
            default_model: "llama3".to_string(),
            extra_headers: vec![],
        }),
        "custom" => Some(ProviderConfig {
            base_url: base("https://api.openai.com/v1"),
            default_model: "gpt-4o-mini".to_string(),
            extra_headers: vec![],
        }),
        _ => None,
    }
}

/// Extract first balanced JSON object `{...}` when trailing characters exist.
fn extract_balanced_json_object(trimmed: &str) -> Option<Value> {
    let start = trimmed.find('{')?;
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escape = false;

    for (offset, ch) in trimmed[start..].char_indices() {
        if escape {
            escape = false;
            continue;
        }
        if ch == '\\' {
            escape = true;
            continue;
        }
        if ch == '"' {
            in_string = !in_string;
            continue;
        }
        if !in_string {
            if ch == '{' {
                depth += 1;
            } else if ch == '}' {
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    let end = start + offset + ch.len_utf8();
                    return serde_json::from_str::<Value>(&trimmed[start..end]).ok();
                }
            }
        }
    }
    None
}

/// Resiliently parse standard JSON, markdown fenced JSON, SSE chunks, concatenated JSON, or raw text.
pub fn safe_parse_response(raw_text: &str) -> Result<Value, String> {
    let trimmed = raw_text.trim();
    if trimmed.is_empty() {
        return Err("Empty response from AI endpoint.".to_string());
    }

    if let Ok(val) = serde_json::from_str::<Value>(trimmed) {
        return Ok(val);
    }

    if let Some(caps) = CODE_BLOCK_RE.captures(trimmed)
        && let Some(inner) = caps.get(1)
        && let Ok(val) = serde_json::from_str::<Value>(inner.as_str().trim())
    {
        return Ok(val);
    }

    if trimmed.contains("data:") {
        let mut combined = String::new();
        let mut last_obj: Option<Value> = None;

        for line in trimmed.lines() {
            let lt = line.trim();
            if lt.starts_with("data:") && !lt.contains("[DONE]") {
                let json_str = lt.trim_start_matches("data:").trim();
                if !json_str.is_empty()
                    && let Ok(chunk) = serde_json::from_str::<Value>(json_str)
                {
                    let delta = chunk
                        .pointer("/choices/0/delta/content")
                        .or_else(|| chunk.pointer("/choices/0/message/content"))
                        .or_else(|| chunk.pointer("/choices/0/text"))
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    combined.push_str(delta);
                    last_obj = Some(chunk);
                }
            }
        }

        if !combined.is_empty() || last_obj.as_ref().and_then(|v| v.get("choices")).is_some() {
            let content = if !combined.is_empty() {
                combined
            } else {
                last_obj
                    .as_ref()
                    .and_then(|v| {
                        v.pointer("/choices/0/message/content")
                            .or_else(|| v.pointer("/choices/0/text"))
                    })
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string()
            };
            return Ok(json!({ "choices": [{ "message": { "content": content } }] }));
        }
    }

    if let Some(val) = extract_balanced_json_object(trimmed) {
        return Ok(val);
    }

    if !trimmed.starts_with('<') {
        return Ok(json!({ "choices": [{ "message": { "content": trimmed } }] }));
    }

    let preview: String = trimmed.chars().take(100).collect();
    Err(format!("Invalid AI response format: {preview}"))
}

fn extract_choice_content(data: &Value) -> String {
    data.pointer("/choices/0/message/content")
        .or_else(|| data.pointer("/choices/0/text"))
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("")
        .to_string()
}

pub fn generate_fallback_posts(
    keyword: &str,
    style: &str,
    language: &str,
    count: usize,
) -> Vec<String> {
    let is_indo = language == "id" || style == "indo_community";
    let kw = keyword.trim();

    let mut source = if is_indo {
        vec![
            format!("Banyak yang masih underestimate potensi {kw}, padahal kalau dilihat dari flow likuiditas & traction belakangan ini, posisinya udah jauh lebih matang dibanding siklus sebelumnya. Apa POV kalian? 👀"),
            format!("Catatan riset seputar {kw}: metrik on-chain & user retention terus naik konsisten, ekosistem dev makin luas, tinggal tunggu katalis makro buat trigger ekspansi. Jangan sampai FOMO pas udah breakout."),
            format!("Satu hal yang paling menarik dari {kw} adalah bagaimana dia menyelesaikan masalah efisiensi tanpa mengorbankan kecepatan. Yang udah riset mendalam pasti paham arahnya kemana. 🔥"),
            format!("POV: Orang-orang terlalu fokus sama noise jangka pendek, sampai lupa fundamental riil dari {kw}. Fokus pada builders & arsitektur jangka panjang."),
            format!("Lagi breakdown arsitektur & ekosistem {kw} hari ini. Banyak angle menarik yang belum banyak dibahas di timeline. Drop pertanyaan atau insight kalian di bawah 👇"),
        ]
    } else {
        vec![
            format!("Most people are still fading {kw} because they look at short-term price rather than architecture & developer velocity. The real compounding happens when nobody is watching."),
            format!("Quick breakdown on {kw}: Scalability & execution throughput hitting new highs, ecosystem tooling maturing significantly, and asymmetric risk/reward setup forming. Are you positioned or still sidelined?"),
            format!("The inflection point for {kw} is approaching faster than most realize. When liquidity rotates, infrastructure that actually works wins every single time. ⚡"),
            format!("Unpopular opinion: {kw} is currently one of the most misunderstood plays in the entire space. Focus on actual retention and verifiable metrics, not timeline consensus."),
            format!("Building and exploring around {kw} today. The UX improvements and speed compared to previous cycles are genuinely night and day. What's your take?"),
        ]
    };

    source.shuffle(&mut rand::thread_rng());
    source.into_iter().take(count).collect()
}

pub fn generate_fallback_replies_from_post(
    post_text: &str,
    count: usize,
    language: &str,
    tone: &str,
) -> Vec<String> {
    let is_indo = language == "id" || tone == "indo_community";
    let focal = post_text
        .split(|c: char| !c.is_alphanumeric())
        .find(|w| w.len() > 4 && !STOP_WORDS_RE.is_match(w))
        .unwrap_or(if is_indo { "tren ini" } else { "this dynamic" });

    let mut pool = if is_indo {
        vec![
            "Poin kuncinya emang di distribusi sih, tech bagus tanpa user onboarding yang mulus bakal susah scale.".to_string(),
            format!("Banyak yang masih fokus ke hype jangka pendek, padahal pondasi infrastruktur {focal} yang justru makin solid."),
            "Menarik banget ngeliat pergeseran tren ini, apalagi kalau diliat dari data retention belakangan ini.".to_string(),
            "Tantangan terbesarnya nanti pas volume transaksi naik drastis, kuat nahan beban gas fee atau nggak.".to_string(),
            format!("Masih banyak yang underestimate potensi {focal} cuma gara-gara harganya lagi sideways."),
            "Tooling ekosistemnya emang belum semulus web2, tapi potensi akselerasinya gila-gilaan.".to_string(),
            "POV yang jarang dibahas di timeline tapi justru paling relevan buat builders jangka panjang.".to_string(),
            "Yang paling penting itu konsistensi dev activity, bukan sekadar metrik vanity di awal rilis.".to_string(),
            "Bakal menarik liat respon market dalam beberapa minggu ke depan setelah katalis ini jalan.".to_string(),
            "Simpel tapi kena banget esensinya, fokus ke fundamental daripada kebawa panik arus timeline.".to_string(),
            "Tinggal tunggu waktu sampai adopsinya mulai meluas ke layer retail.".to_string(),
            "Infrastruktur yang handal bakal selalu menang lawan narasi kosong pas siklus rotasi likuiditas.".to_string(),
            format!("Catatan riset yang solid, terutama soal efisiensi dan komparasi arsitektur seputar {focal}."),
            "Eksekusi lapangan selalu lebih sulit daripada whitepaper, tapi arah geraknya udah tepat.".to_string(),
            "Setuju, bottleneck utamanya sekarang bukan di komputasi tapi di kemudahan akses end-user.".to_string(),
        ]
    } else {
        vec![
            format!("The distribution side of {focal} will matter ten times more than raw benchmark figures."),
            "Most people are sleeping on the second-order effects of how this actually scales in production.".to_string(),
            "Execution speed here is everything, whoever captures developer mindshare first wins.".to_string(),
            "Curious how this holds up once network load and gas fees test throughput under peak stress.".to_string(),
            format!("The tooling around {focal} is still surprisingly primitive, which creates massive builder upside."),
            "Sounds good on paper, but the true test will be 60-day user retention after initial hype cools down.".to_string(),
            "Been thinking through this exact tradeoff lately and the friction points are very real.".to_string(),
            "The moat here is proprietary context and data pipelining, not the raw underlying model.".to_string(),
            "Everyone focuses on the tech stack while ignoring the incentive mechanisms that drive adoption.".to_string(),
            "Clean breakdown of the dynamics at play, especially the observation around infrastructure maturity.".to_string(),
            "Feels like an inflection point that most observers will only recognize in hindsight.".to_string(),
            "Simple architectures that actually ship beat complex theoretical models every single time.".to_string(),
            "The real alpha is in how quickly this integrates with existing legacy workflows.".to_string(),
            "Completely aligned on the bottleneck shifting from compute throughput to distribution velocity.".to_string(),
            "Quiet compounding happens during these phases when mainstream attention is elsewhere.".to_string(),
        ]
    };

    pool.shuffle(&mut rand::thread_rng());
    let mut result = Vec::new();
    let prefixes = if is_indo {
        ["Secara garis besar, ", "Kalau dicermati, ", "Menariknya, ", "Faktanya, ", "Poin pentingnya: "]
    } else {
        ["Honestly, ", "From an infra lens, ", "In reality, ", "Key takeaway: ", "Crucial nuance: "]
    };

    for item in &pool {
        if result.len() >= count {
            break;
        }
        let clean = item.replace(['"', '“', '”'], "").trim().to_string();
        if !result.contains(&clean) {
            result.push(clean);
        }
    }

    let mut idx = 0usize;
    while result.len() < count {
        let base = &pool[result.len() % pool.len()];
        let prefix = prefixes[idx % prefixes.len()];
        idx += 1;
        let mut chars = base.chars();
        let lower_first = match chars.next() {
            Some(c) => format!("{}{}", c.to_lowercase(), chars.as_str()),
            None => String::new(),
        };
        let candidate = format!("{prefix}{lower_first}")
            .replace(['"', '“', '”'], "")
            .trim()
            .to_string();
        if !result.contains(&candidate) {
            result.push(candidate);
        } else {
            result.push(format!("{candidate} ({})", result.len() + 1));
        }
    }

    result.truncate(count);
    result
}

pub async fn generate_contextual_reply(
    tweet_text: &str,
    stored_settings: &Settings,
    overrides: &AiOverrides,
) -> Option<String> {
    let settings = merge_settings(stored_settings, overrides);
    let provider = settings.ai_provider.trim().to_ascii_lowercase();
    if provider == "none" || provider.is_empty() {
        return None;
    }
    let prov = get_provider_config(&settings)?;
    let api_key = settings.ai_api_key.trim();
    if provider != "ollama" && api_key.is_empty() {
        return None;
    }
    let model = settings
        .ai_model
        .as_deref()
        .map(str::trim)
        .filter(|m| !m.is_empty())
        .unwrap_or(&prov.default_model);

    let system_prompt = format!(
        "You are a sharp, native, authentic human commenter on X (Twitter).\n\
        Your task is to write a single, natural, human-grade reply to the focal tweet.\n\n\
        STRICT ANTI-AI-SLOP & HUMAN CADENCE RULES:\n\
        1. ZERO AI SLOP OR BOT CLICHES.\n\
        2. ZERO SYCOPHANCY.\n\
        3. CONCISE & PUNCHY: Exactly 1 single sentence (12-25 words max).\n\
        4. NO FORMATTING ARTIFACTS: Never use quotation marks, bullet points, or hashtags.\n\
        5. ADHERE TO THIS USER PERSONA: \"{}\"",
        settings.ai_prompt
    );

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .ok()?;

    let mut req = client
        .post(format!("{}/chat/completions", prov.base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {api_key}"));
    for (k, v) in &prov.extra_headers {
        req = req.header(*k, *v);
    }

    let resp = req
        .json(&json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": format!("Tweet Content:\n\"{tweet_text}\"\n\nWrite your single natural human reply:") }
            ],
            "max_tokens": 100,
            "temperature": 0.8,
            "stream": false
        }))
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }
    let raw = resp.text().await.ok()?;
    let parsed = safe_parse_response(&raw).ok()?;
    let content = extract_choice_content(&parsed);
    if content.is_empty() {
        None
    } else {
        Some(content.trim_matches(|c| matches!(c, '"' | '\'' | '`')).trim().to_string())
    }
}

pub async fn test_connection(
    stored_settings: &Settings,
    overrides: &AiOverrides,
) -> ConnectionTestResult {
    let settings = merge_settings(stored_settings, overrides);
    let provider = settings.ai_provider.trim().to_ascii_lowercase();
    if provider == "none" || provider.is_empty() {
        return ConnectionTestResult {
            success: false,
            status: None,
            model: None,
            provider: None,
            sample_output: None,
            message: "Please select an AI provider first.".to_string(),
        };
    }

    let Some(prov) = get_provider_config(&settings) else {
        return ConnectionTestResult {
            success: false,
            status: None,
            model: None,
            provider: None,
            sample_output: None,
            message: format!("Provider \"{}\" is not supported.", settings.ai_provider),
        };
    };

    let api_key = settings.ai_api_key.trim();
    if provider != "ollama" && api_key.is_empty() {
        return ConnectionTestResult {
            success: false,
            status: None,
            model: None,
            provider: None,
            sample_output: None,
            message: "API Key is required to test connectivity.".to_string(),
        };
    }

    let model = settings
        .ai_model
        .as_deref()
        .map(str::trim)
        .filter(|m| !m.is_empty())
        .unwrap_or(&prov.default_model)
        .to_string();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(25))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let mut req = client
        .post(format!("{}/chat/completions", prov.base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {api_key}"));
    for (k, v) in &prov.extra_headers {
        req = req.header(*k, *v);
    }

    match req
        .json(&json!({
            "model": model,
            "messages": [{ "role": "user", "content": "Say \"X-SENTINEL AI ONLINE\" in 4 words." }],
            "max_tokens": 30,
            "temperature": 0.5,
            "stream": false
        }))
        .send()
        .await
    {
        Ok(resp) => {
            let status_code = resp.status().as_u16();
            let raw = resp.text().await.unwrap_or_default();
            if !(200..300).contains(&status_code) {
                let preview: String = raw.chars().take(180).collect();
                return ConnectionTestResult {
                    success: false,
                    status: Some(status_code),
                    model: None,
                    provider: None,
                    sample_output: None,
                    message: format!("API Error ({status_code}): {preview}"),
                };
            }
            let reply = safe_parse_response(&raw)
                .ok()
                .map(|v| extract_choice_content(&v))
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "Connected".to_string());
            ConnectionTestResult {
                success: true,
                status: None,
                model: Some(model.clone()),
                provider: Some(provider.clone()),
                sample_output: Some(reply),
                message: format!(
                    "Connection established to {} ({})!",
                    provider.to_uppercase(),
                    model
                ),
            }
        }
        Err(err) => ConnectionTestResult {
            success: false,
            status: None,
            model: None,
            provider: None,
            sample_output: None,
            message: if err.is_timeout() {
                "Connection Timeout (25s)".to_string()
            } else {
                err.to_string()
            },
        },
    }
}

pub async fn generate_post_from_keyword(
    stored_settings: &Settings,
    keyword: &str,
    style: &str,
    language: &str,
    count: usize,
    custom_prompt: &str,
    overrides: &AiOverrides,
) -> PostGenerationResult {
    let settings = merge_settings(stored_settings, overrides);
    let safe_count = count.clamp(1, 5);
    let provider = settings.ai_provider.trim().to_ascii_lowercase();

    let fallback = || PostGenerationResult {
        success: true,
        is_fallback: true,
        provider: "fallback-spintax".to_string(),
        posts: generate_fallback_posts(keyword, style, language, safe_count),
    };

    if provider == "none" || provider.is_empty() {
        return fallback();
    }
    let Some(prov) = get_provider_config(&settings) else {
        return fallback();
    };
    let api_key = settings.ai_api_key.trim();
    if provider != "ollama" && api_key.is_empty() {
        return fallback();
    }
    let model = settings
        .ai_model
        .as_deref()
        .map(str::trim)
        .filter(|m| !m.is_empty())
        .unwrap_or(&prov.default_model);

    let style_instructions = match style {
        "viral_hook" => "Format: Punchy, contrarian, or high-curiosity opening hook. Under 220 chars.",
        "alpha_insight" => "Format: Deep industry alpha or sharp technical observation.",
        "educational_mini" => "Format: Concise actionable framework or high-value observation.",
        "story_builder" => "Format: Authentic first-person builder/founder perspective.",
        "indo_community" => "Format: Bahasa Indonesia santai, relevan, berbobot gaya komunitas tech/crypto.",
        _ => "Format: Sharp, authentic human-grade post.",
    };
    let lang_instruction = if language == "id" || style == "indo_community" {
        "Output Language: Bahasa Indonesia."
    } else {
        "Output Language: English."
    };

    let system_prompt = format!(
        "You are a ghostwriter for X (Twitter). Write exactly {safe_count} unique single-line standalone post drafts.\n\
        {style_instructions}\n{lang_instruction}\n\
        RULES: NO newlines; max 280 chars; max 0-1 hashtag; output ONLY JSON {{\"posts\": [\"...\"]}}.\n{}",
        if custom_prompt.trim().is_empty() {
            String::new()
        } else {
            format!("SPECIAL USER INSTRUCTION: {}", custom_prompt.trim())
        }
    );

    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(35))
        .build()
    else {
        return fallback();
    };

    let mut req = client
        .post(format!("{}/chat/completions", prov.base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {api_key}"));
    for (k, v) in &prov.extra_headers {
        req = req.header(*k, *v);
    }

    let Ok(resp) = req
        .json(&json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": format!("Keyword / Topic: \"{}\"\nGenerate {} single-line post drafts:", keyword.trim(), safe_count) }
            ],
            "response_format": { "type": "json_object" },
            "max_tokens": 600,
            "temperature": 0.85,
            "stream": false
        }))
        .send()
        .await
    else {
        return fallback();
    };

    if !resp.status().is_success() {
        return fallback();
    }
    let Ok(raw) = resp.text().await else {
        return fallback();
    };
    let Ok(parsed) = safe_parse_response(&raw) else {
        return fallback();
    };
    let content_str = extract_choice_content(&parsed);

    let mut extracted = Vec::new();
    if let Some(json_obj) = extract_balanced_json_object(&content_str)
        && let Some(arr) = json_obj.get("posts").and_then(Value::as_array)
    {
        for p in arr {
            if let Some(s) = p.as_str() {
                let clean = s.replace(['\r', '\n'], " ");
                let collapsed: String = clean.split_whitespace().collect::<Vec<_>>().join(" ");
                let trimmed = collapsed
                    .trim_matches(|c| matches!(c, '"' | '\'' | '`'))
                    .trim()
                    .to_string();
                if !trimmed.is_empty() {
                    extracted.push(trimmed);
                }
            }
        }
    }

    if extracted.is_empty() && !content_str.is_empty() {
        for line in content_str.lines() {
            let clean = ENUM_PREFIX_RE
                .replace(line.trim(), "")
                .trim_matches(|c| matches!(c, '"' | '\'' | '`'))
                .trim()
                .to_string();
            if clean.len() > 10 && !clean.starts_with('{') && !clean.starts_with('}') {
                extracted.push(clean);
            }
        }
    }

    if extracted.is_empty() {
        return fallback();
    }

    extracted.truncate(safe_count);
    PostGenerationResult {
        success: true,
        is_fallback: false,
        provider: format!("{} ({model})", provider.to_uppercase()),
        posts: extracted,
    }
}

pub async fn generate_payload_replies_from_post(
    stored_settings: &Settings,
    post_text: &str,
    count: usize,
    tone: &str,
    language: &str,
    custom_instruction: &str,
    overrides: &AiOverrides,
) -> PayloadRepliesResult {
    let settings = merge_settings(stored_settings, overrides);
    let safe_count = count.clamp(1, 50);
    let clean_post = post_text.trim();
    let resolved_lang = if language == "auto" {
        if INDO_WORDS_RE.is_match(clean_post) || tone == "indo_community" {
            "id"
        } else {
            "en"
        }
    } else {
        language
    };

    let fallback = || {
        let replies = generate_fallback_replies_from_post(clean_post, safe_count, resolved_lang, tone);
        let len = replies.len();
        PayloadRepliesResult {
            success: true,
            is_fallback: true,
            provider: "fallback-spintax".to_string(),
            count: len,
            replies,
        }
    };

    let provider = settings.ai_provider.trim().to_ascii_lowercase();
    if provider == "none" || provider.is_empty() {
        return fallback();
    }
    let Some(prov) = get_provider_config(&settings) else {
        return fallback();
    };
    let api_key = settings.ai_api_key.trim();
    if provider != "ollama" && api_key.is_empty() {
        return fallback();
    }
    let model = settings
        .ai_model
        .as_deref()
        .map(str::trim)
        .filter(|m| !m.is_empty())
        .unwrap_or(&prov.default_model);

    let system_prompt = format!(
        "Write exactly {safe_count} unique single-sentence human replies to the target post.\n\
        RULES: NO double quotes (\"); NO AI cliches; 10-25 words max; NO hashtags; tone={tone}; lang={resolved_lang}.\n\
        Output ONLY valid JSON: {{\"replies\": [\"...\"]}}\n{}",
        if custom_instruction.trim().is_empty() {
            String::new()
        } else {
            format!("SPECIAL DIRECTIVE: {}", custom_instruction.trim())
        }
    );

    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(45))
        .build()
    else {
        return fallback();
    };

    let mut req = client
        .post(format!("{}/chat/completions", prov.base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {api_key}"));
    for (k, v) in &prov.extra_headers {
        req = req.header(*k, *v);
    }

    let max_tokens = (safe_count * 70).clamp(500, 2500);
    let Ok(resp) = req
        .json(&json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": format!("Create {safe_count} reply from this post without double quotes.\n\nPost:\n{clean_post}") }
            ],
            "response_format": { "type": "json_object" },
            "max_tokens": max_tokens,
            "temperature": 0.85,
            "stream": false
        }))
        .send()
        .await
    else {
        return fallback();
    };

    if !resp.status().is_success() {
        return fallback();
    }
    let Ok(raw) = resp.text().await else {
        return fallback();
    };
    let Ok(parsed) = safe_parse_response(&raw) else {
        return fallback();
    };
    let content_str = extract_choice_content(&parsed);

    let mut raw_replies = Vec::new();
    if let Some(json_obj) = extract_balanced_json_object(&content_str) {
        let arr = json_obj
            .get("replies")
            .or_else(|| json_obj.get("posts"))
            .and_then(Value::as_array);
        if let Some(items) = arr {
            for item in items {
                if let Some(s) = item.as_str() {
                    raw_replies.push(s.to_string());
                }
            }
        }
    }

    if raw_replies.is_empty() {
        for line in content_str.lines() {
            let trimmed = line.trim();
            if trimmed.len() > 10 && !trimmed.starts_with('{') && !trimmed.starts_with('}') {
                raw_replies.push(trimmed.to_string());
            }
        }
    }

    let mut cleaned: Vec<String> = raw_replies
        .into_iter()
        .map(|r| {
            let no_quotes = r.replace(['"', '“', '”'], "").replace(['\r', '\n'], " ");
            let no_enum = ENUM_PREFIX_RE.replace(&no_quotes, "");
            no_enum
                .trim_matches(|c| matches!(c, '\'' | '`'))
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
        })
        .filter(|r| r.len() > 5)
        .collect();

    if cleaned.is_empty() {
        return fallback();
    }

    cleaned.truncate(safe_count);
    if cleaned.len() < safe_count {
        for fb in generate_fallback_replies_from_post(clean_post, safe_count, resolved_lang, tone) {
            if cleaned.len() >= safe_count {
                break;
            }
            if !cleaned.contains(&fb) {
                cleaned.push(fb);
            }
        }
    }

    let len = cleaned.len();
    PayloadRepliesResult {
        success: true,
        is_fallback: false,
        provider: format!("{} ({model})", provider.to_uppercase()),
        count: len,
        replies: cleaned,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_providers_and_parses_sse_and_trailing_json() {
        let s = Settings {
            ai_provider: "9router".into(),
            ..Default::default()
        };
        let cfg = get_provider_config(&s).unwrap();
        assert!(cfg.base_url.contains("9router.com"));
        assert_eq!(cfg.default_model, "openai/gpt-4o-mini");

        let sse = "data: {\"id\":\"1\",\"choices\":[{\"delta\":{\"content\":\"X-SENTINEL \"}}]}\n\ndata: {\"id\":\"2\",\"choices\":[{\"delta\":{\"content\":\"AI ONLINE\"}}]}\n\ndata: [DONE]";
        let parsed_sse = safe_parse_response(sse).unwrap();
        assert_eq!(
            parsed_sse["choices"][0]["message"]["content"],
            "X-SENTINEL AI ONLINE"
        );

        let trailing = "{\"id\":\"test\",\"choices\":[{\"message\":{\"content\":\"Online OK\"}}]}extra_chars";
        let parsed_trailing = safe_parse_response(trailing).unwrap();
        assert_eq!(parsed_trailing["choices"][0]["message"]["content"], "Online OK");

        let md = "```json\n{\"choices\":[{\"message\":{\"content\":\"OK\"}}]}\n```";
        assert_eq!(
            safe_parse_response(md).unwrap()["choices"][0]["message"]["content"],
            "OK"
        );
    }
}
