//! Tweet URL parsing and FxTwitter / VxTwitter content extraction.

use regex::Regex;
use serde::Serialize;
use std::sync::LazyLock;
use std::time::Duration;

static TWEET_URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)https?://(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)/(?:#!/)?(?:[a-zA-Z0-9_]+|i)/status/(\d+)")
        .expect("valid tweet URL regex")
});
static STATUS_ID_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)/status/(\d+)").expect("valid status ID regex"));
static NUMERIC_ID_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\d{8,25}$").expect("valid numeric ID regex"));

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedTweet {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tweet_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub fn is_tweet_url(raw: &str) -> bool {
    TWEET_URL_RE.is_match(raw.trim())
}

pub fn extract_tweet_id(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if let Some(caps) = STATUS_ID_RE.captures(trimmed) {
        return caps.get(1).map(|m| m.as_str().to_string());
    }
    if NUMERIC_ID_RE.is_match(trimmed) {
        return Some(trimmed.to_string());
    }
    None
}

pub fn decode_html_entities(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

async fn fetch_fxtwitter(client: &reqwest::Client, tweet_id: &str) -> Result<ExtractedTweet, String> {
    let url = format!("https://api.fxtwitter.com/status/{tweet_id}");
    let resp = client
        .get(&url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
        )
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("FxTwitter returned status {}", resp.status().as_u16()));
    }
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let tweet = data.get("tweet").ok_or("Missing tweet field")?;
    let text = tweet
        .get("text")
        .and_then(|v| v.as_str())
        .ok_or("FxTwitter did not return valid tweet text")?;

    Ok(ExtractedTweet {
        success: true,
        tweet_id: Some(tweet_id.to_string()),
        text: Some(decode_html_entities(text.trim())),
        author: tweet
            .pointer("/author/screen_name")
            .and_then(|v| v.as_str())
            .map(String::from),
        author_name: tweet
            .pointer("/author/name")
            .and_then(|v| v.as_str())
            .map(String::from),
        provider: Some("fxtwitter".to_string()),
        error: None,
    })
}

async fn fetch_vxtwitter(client: &reqwest::Client, tweet_id: &str) -> Result<ExtractedTweet, String> {
    let url = format!("https://api.vxtwitter.com/Twitter/status/{tweet_id}");
    let resp = client
        .get(&url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
        )
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("VxTwitter returned status {}", resp.status().as_u16()));
    }
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let text = data
        .get("text")
        .and_then(|v| v.as_str())
        .ok_or("VxTwitter did not return valid tweet data")?;

    Ok(ExtractedTweet {
        success: true,
        tweet_id: Some(tweet_id.to_string()),
        text: Some(decode_html_entities(text.trim())),
        author: data
            .get("user_screen_name")
            .and_then(|v| v.as_str())
            .map(String::from),
        author_name: data
            .get("user_name")
            .and_then(|v| v.as_str())
            .map(String::from),
        provider: Some("vxtwitter".to_string()),
        error: None,
    })
}

pub async fn fetch_tweet_content(url_or_id: &str) -> ExtractedTweet {
    let Some(tweet_id) = extract_tweet_id(url_or_id) else {
        return ExtractedTweet {
            success: false,
            tweet_id: None,
            text: None,
            author: None,
            author_name: None,
            provider: None,
            error: Some(
                "Invalid Twitter / X tweet link or ID. Please provide a link like https://x.com/user/status/123456."
                    .to_string(),
            ),
        };
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(6))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    match fetch_fxtwitter(&client, &tweet_id).await {
        Ok(res) => res,
        Err(_) => match fetch_vxtwitter(&client, &tweet_id).await {
            Ok(res) => res,
            Err(_) => ExtractedTweet {
                success: false,
                tweet_id: Some(tweet_id.clone()),
                text: None,
                author: None,
                author_name: None,
                provider: None,
                error: Some(format!(
                    "Unable to fetch tweet content from link ({tweet_id}). Please check the link or paste the text directly."
                )),
            },
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_ids_and_validates_urls() {
        assert!(is_tweet_url("https://x.com/elonmusk/status/1891234567890123456"));
        assert!(is_tweet_url("https://twitter.com/i/status/1891234567890123456"));
        assert!(!is_tweet_url("https://example.com/status/123"));
        assert_eq!(
            extract_tweet_id("https://x.com/user/status/1891234567890123456?s=20").as_deref(),
            Some("1891234567890123456")
        );
        assert_eq!(decode_html_entities("A &amp; B &gt; C"), "A & B > C");
    }
}
