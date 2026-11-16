//! Recursive Spintax parser (`{Option 1|Option 2|{Nested A|Nested B}}`).

use rand::Rng;
use regex::Regex;
use std::sync::LazyLock;

static INNER_SPINTAX_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\{([^{}]+)\}").expect("valid spintax regex"));

/// Expand nested `{a|b|{c|d}}` templates up to 50 iterations.
pub fn parse_spintax(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }

    let mut current = text.to_string();
    let mut rng = rand::thread_rng();

    for _ in 0..50 {
        if !INNER_SPINTAX_RE.is_match(&current) {
            break;
        }
        let next = INNER_SPINTAX_RE
            .replace_all(&current, |caps: &regex::Captures<'_>| -> String {
                let choices: Vec<&str> = caps[1].split('|').collect();
                if choices.is_empty() {
                    String::new()
                } else {
                    let idx = rng.gen_range(0..choices.len());
                    choices[idx].to_string()
                }
            })
            .into_owned();
        current = next;
    }

    current.trim().to_string()
}

pub fn get_random_template(templates: &[String]) -> String {
    if templates.is_empty() {
        return "Great insights, thanks for sharing! 🔥".to_string();
    }
    let idx = rand::thread_rng().gen_range(0..templates.len());
    parse_spintax(&templates[idx])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expands_nested_spintax() {
        let out = parse_spintax("{Hello|Hi} {world|{Rust|Axum}}!");
        assert!(out == "Hello world!" || out == "Hello Rust!" || out == "Hello Axum!" || out == "Hi world!" || out == "Hi Rust!" || out == "Hi Axum!");
        assert!(!out.contains('{') && !out.contains('}'));
    }
}
