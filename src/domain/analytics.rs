//! Analytics aggregation and server-side SVG chart geometry generation (Option 3A).

use chrono::{DateTime, Duration, Local, Timelike, Utc};
use serde::Serialize;
use std::collections::{BTreeMap, HashMap};

use crate::domain::models::{Account, HistoryItem, Stats};

/// Non-violet categorical chart palette complying with `/design-taste-frontend`.
pub const CHART_PALETTE: [&str; 8] = [
    "#f59e0b", // Amber (primary accent)
    "#3b82f6", // Cobalt
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#f43f5e", // Rose
    "#84cc16", // Lime
    "#f97316", // Orange
    "#64748b", // Slate
];

#[derive(Debug, Clone, Serialize)]
pub struct VelocityPoint {
    pub label: String,
    pub x: f64,
    pub likes: u64,
    pub retweets: u64,
    pub comments: u64,
    pub posts: u64,
    pub total: u64,
    pub y_total: f64,
    pub hit_x: f64,
    pub hit_w: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct VelocitySvgData {
    pub points: Vec<VelocityPoint>,
    pub polyline_points: String,
    pub area_path: String,
    pub max_val: u64,
    pub has_data: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct HourlyBar {
    pub hour_label: String,
    pub total: u64,
    pub failures: u64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub is_peak: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DonutSlice {
    pub name: String,
    pub count: u64,
    pub percent: u64,
    pub color: String,
    pub dash_array: String,
    pub dash_offset: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LeaderboardRow {
    pub id: String,
    pub name: String,
    pub username: String,
    pub count: u64,
    pub likes: u64,
    pub retweets: u64,
    pub comments: u64,
    pub posts: u64,
    pub success_rate: u64,
    pub health_status: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct FailureCategoryRow {
    pub label: String,
    pub count: u64,
    pub percentage: u64,
    pub color: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnalyticsViewData {
    pub timeframe: String,
    pub selected_node_id: String,
    pub selected_node_label: String,
    pub total_likes: u64,
    pub total_retweets: u64,
    pub total_comments: u64,
    pub total_posts: u64,
    pub total_actions: u64,
    pub success_rate: u64,
    pub today_likes: u64,
    pub today_retweets: u64,
    pub today_comments: u64,
    pub today_posts: u64,
    pub peak_hour_label: String,
    pub peak_hour_count: u64,
    pub velocity_svg: VelocitySvgData,
    pub hourly_bars: Vec<HourlyBar>,
    pub donut_slices: Vec<DonutSlice>,
    pub leaderboard: Vec<LeaderboardRow>,
    pub failure_count: u64,
    pub failure_categories: Vec<FailureCategoryRow>,
}

pub fn compute_analytics(
    history: &[HistoryItem],
    stats: &Stats,
    accounts: &[Account],
    timeframe: &str,
    selected_node_id: &str,
) -> AnalyticsViewData {
    let now = Utc::now();
    let cutoff = match timeframe {
        "24h" => Some(now - Duration::hours(24)),
        "7d" => Some(now - Duration::days(7)),
        "30d" => Some(now - Duration::days(30)),
        _ => None,
    };

    let filtered: Vec<&HistoryItem> = history
        .iter()
        .filter(|h| {
            if selected_node_id != "all" && h.account_id.as_deref() != Some(selected_node_id) {
                return false;
            }
            if let Some(cut) = cutoff
                && let Ok(ts) = DateTime::parse_from_rfc3339(&h.timestamp)
            {
                return ts.with_timezone(&Utc) >= cut;
            }
            true
        })
        .collect();

    let mut total_likes = 0u64;
    let mut total_retweets = 0u64;
    let mut total_comments = 0u64;
    let mut total_posts = 0u64;
    let mut success_count = 0u64;
    let mut failure_count = 0u64;

    let mut hourly_totals = [0u64; 24];
    let mut hourly_failures = [0u64; 24];

    // Bucket by YYYY-MM-DD (or HH:00 for 24h)
    let mut buckets: BTreeMap<String, (u64, u64, u64, u64)> = BTreeMap::new();
    let mut failure_map: HashMap<&'static str, u64> = HashMap::new();

    struct NodeAgg {
        likes: u64,
        retweets: u64,
        comments: u64,
        posts: u64,
        success: u64,
        total: u64,
    }
    let mut node_aggs: HashMap<String, NodeAgg> = HashMap::new();

    for item in &filtered {
        let is_ok = item.status == "SUCCESS";
        let is_fail = item.status == "FAILED";
        if is_ok {
            success_count += 1;
        } else if is_fail {
            failure_count += 1;
            let msg = item
                .message
                .as_deref()
                .unwrap_or("")
                .to_ascii_lowercase();
            let cat = if msg.contains("limit") || msg.contains("344") || msg.contains("185") || msg.contains("226") {
                "Rate Limit / Soft Flag"
            } else if msg.contains("proxy") || msg.contains("timeout") || msg.contains("net") {
                "Proxy / Network"
            } else if msg.contains("session") || msg.contains("login") || msg.contains("cookie") {
                "Session Expired"
            } else {
                "DOM / Other"
            };
            *failure_map.entry(cat).or_insert(0) += 1;
        }

        if let Ok(ts) = DateTime::parse_from_rfc3339(&item.timestamp) {
            let local_ts = ts.with_timezone(&Local);
            let hr = local_ts.hour() as usize;
            if hr < 24 {
                if is_ok {
                    hourly_totals[hr] += 1;
                } else if is_fail {
                    hourly_failures[hr] += 1;
                }
            }
            let key = if timeframe == "24h" {
                local_ts.format("%m-%d %H:00").to_string()
            } else {
                local_ts.format("%Y-%m-%d").to_string()
            };
            if is_ok {
                let b = buckets.entry(key).or_insert((0, 0, 0, 0));
                match item.action.as_str() {
                    "LIKE" => b.0 += 1,
                    "RETWEET" => b.1 += 1,
                    "COMMENT" => b.2 += 1,
                    "POST" | "TWEET" => b.3 += 1,
                    _ => {}
                }
            }
        }

        if is_ok {
            match item.action.as_str() {
                "LIKE" => total_likes += 1,
                "RETWEET" => total_retweets += 1,
                "COMMENT" => total_comments += 1,
                "POST" | "TWEET" => total_posts += 1,
                _ => {}
            }
        }

        if let Some(acc_id) = &item.account_id {
            let entry = node_aggs.entry(acc_id.clone()).or_insert(NodeAgg {
                likes: 0,
                retweets: 0,
                comments: 0,
                posts: 0,
                success: 0,
                total: 0,
            });
            entry.total += 1;
            if is_ok {
                entry.success += 1;
                match item.action.as_str() {
                    "LIKE" => entry.likes += 1,
                    "RETWEET" => entry.retweets += 1,
                    "COMMENT" => entry.comments += 1,
                    "POST" | "TWEET" => entry.posts += 1,
                    _ => {}
                }
            }
        }
    }

    if timeframe == "all" && selected_node_id == "all" && filtered.is_empty() {
        total_likes = stats.total_likes;
        total_retweets = stats.total_retweets;
        total_comments = stats.total_comments;
        total_posts = stats.total_posts;
    }

    let total_actions = total_likes + total_retweets + total_comments + total_posts;
    let total_attempts = success_count + failure_count;
    let success_rate = if total_attempts > 0 {
        (success_count * 100) / total_attempts
    } else {
        100
    };

    // Velocity SVG coordinates inside viewBox 0..640 x 0..220 (plot area x: 44..620, y: 18..180)
    let plot_x0 = 44.0_f64;
    let plot_w = 576.0_f64;
    let plot_y0 = 18.0_f64;
    let plot_y1 = 180.0_f64;
    let max_val = buckets
        .values()
        .map(|(l, r, c, p)| l + r + c + p)
        .max()
        .unwrap_or(1)
        .max(1);

    let bucket_count = buckets.len();
    let mut points = Vec::with_capacity(bucket_count);
    let mut poly_parts = Vec::with_capacity(bucket_count);

    for (idx, (label, (likes, retweets, comments, posts))) in buckets.iter().enumerate() {
        let total = likes + retweets + comments + posts;
        let x = if bucket_count <= 1 {
            plot_x0 + plot_w / 2.0
        } else {
            plot_x0 + (idx as f64 / (bucket_count - 1) as f64) * plot_w
        };
        let ratio = total as f64 / max_val as f64;
        let y_total = plot_y1 - ratio * (plot_y1 - plot_y0);
        let hit_w = if bucket_count <= 1 {
            plot_w
        } else {
            plot_w / bucket_count as f64
        };
        let hit_x = (x - hit_w / 2.0).max(plot_x0);

        poly_parts.push(format!("{x:.1},{y_total:.1}"));
        points.push(VelocityPoint {
            label: label.clone(),
            x,
            likes: *likes,
            retweets: *retweets,
            comments: *comments,
            posts: *posts,
            total,
            y_total,
            hit_x,
            hit_w,
        });
    }

    let polyline_points = poly_parts.join(" ");
    let area_path = if let (Some(first), Some(last)) = (points.first(), points.last()) {
        format!(
            "M {:.1},{:.1} L {} L {:.1},{:.1} Z",
            first.x,
            plot_y1,
            poly_parts.join(" L "),
            last.x,
            plot_y1
        )
    } else {
        String::new()
    };

    let velocity_svg = VelocitySvgData {
        has_data: !points.is_empty(),
        points,
        polyline_points,
        area_path,
        max_val,
    };

    // 24-Hour Density bars inside viewBox 0..640 x 0..220
    let max_hr_val = hourly_totals.iter().copied().max().unwrap_or(1).max(1);
    let (peak_idx, &peak_cnt) = hourly_totals
        .iter()
        .enumerate()
        .max_by_key(|(_, v)| *v)
        .unwrap_or((0, &0));

    let bar_slot = plot_w / 24.0;
    let bar_w = (bar_slot - 6.0).max(8.0);
    let hourly_bars: Vec<HourlyBar> = (0..24)
        .map(|hr| {
            let total = hourly_totals[hr];
            let h_px = if total == 0 {
                3.0
            } else {
                ((total as f64 / max_hr_val as f64) * (plot_y1 - plot_y0)).max(6.0)
            };
            HourlyBar {
                hour_label: format!("{hr:02}"),
                total,
                failures: hourly_failures[hr],
                x: plot_x0 + hr as f64 * bar_slot + (bar_slot - bar_w) / 2.0,
                y: plot_y1 - h_px,
                width: bar_w,
                height: h_px,
                is_peak: peak_cnt > 0 && hr == peak_idx,
            }
        })
        .collect();

    // Leaderboard + Donut Slices (r=72 -> circumference ~ 452.389)
    let mut leaderboard: Vec<LeaderboardRow> = accounts
        .iter()
        .enumerate()
        .map(|(i, acc)| {
            let agg = node_aggs.get(&acc.id);
            let likes = agg.map(|a| a.likes).unwrap_or(0);
            let retweets = agg.map(|a| a.retweets).unwrap_or(0);
            let comments = agg.map(|a| a.comments).unwrap_or(0);
            let posts = agg.map(|a| a.posts).unwrap_or(0);
            let count = likes + retweets + comments + posts;
            let sr = agg
                .map(|a| {
                    if a.total > 0 {
                        (a.success * 100) / a.total
                    } else {
                        100
                    }
                })
                .unwrap_or(100);
            LeaderboardRow {
                id: acc.id.clone(),
                name: acc.label.clone(),
                username: acc.username.clone(),
                count,
                likes,
                retweets,
                comments,
                posts,
                success_rate: sr,
                health_status: acc
                    .health_status
                    .clone()
                    .unwrap_or_else(|| if acc.is_valid { "HEALTHY" } else { "UNCHECKED" }.to_string()),
                color: CHART_PALETTE[i % CHART_PALETTE.len()].to_string(),
            }
        })
        .collect();
    leaderboard.sort_by(|a, b| b.count.cmp(&a.count));

    let circ = 2.0 * std::f64::consts::PI * 72.0;
    let slice_sum: u64 = leaderboard.iter().map(|r| r.count).sum();
    let mut offset_acc = 0.0_f64;
    let mut donut_slices = Vec::new();
    if slice_sum > 0 {
        for (idx, row) in leaderboard.iter().filter(|r| r.count > 0).take(7).enumerate() {
            let frac = row.count as f64 / slice_sum as f64;
            let arc_len = frac * circ;
            donut_slices.push(DonutSlice {
                name: if row.username.is_empty() {
                    row.name.clone()
                } else {
                    format!("@{}", row.username)
                },
                count: row.count,
                percent: (frac * 100.0).round() as u64,
                color: CHART_PALETTE[idx % CHART_PALETTE.len()].to_string(),
                dash_array: format!("{arc_len:.2} {:.2}", circ - arc_len),
                dash_offset: format!("{:.2}", -offset_acc),
            });
            offset_acc += arc_len;
        }
    }

    let failure_categories: Vec<FailureCategoryRow> = [
        ("Rate Limit / Soft Flag", "#f59e0b"),
        ("Proxy / Network", "#ef4444"),
        ("Session Expired", "#3b82f6"),
        ("DOM / Other", "#64748b"),
    ]
    .into_iter()
    .filter_map(|(label, color)| {
        let cnt = failure_map.get(label).copied().unwrap_or(0);
        if cnt == 0 {
            None
        } else {
            Some(FailureCategoryRow {
                label: label.to_string(),
                count: cnt,
                percentage: if failure_count > 0 {
                    (cnt * 100) / failure_count
                } else {
                    0
                },
                color: color.to_string(),
            })
        }
    })
    .collect();

    let selected_node_label = if selected_node_id == "all" {
        "All nodes".to_string()
    } else {
        accounts
            .iter()
            .find(|a| a.id == selected_node_id)
            .map(|a| {
                if a.username.is_empty() {
                    a.label.clone()
                } else {
                    format!("@{}", a.username)
                }
            })
            .unwrap_or_else(|| "Selected node".to_string())
    };

    AnalyticsViewData {
        timeframe: timeframe.to_string(),
        selected_node_id: selected_node_id.to_string(),
        selected_node_label,
        total_likes,
        total_retweets,
        total_comments,
        total_posts,
        total_actions,
        success_rate,
        today_likes: stats.today_likes,
        today_retweets: stats.today_retweets,
        today_comments: stats.today_comments,
        today_posts: stats.today_posts,
        peak_hour_label: format!("{peak_idx:02}:00"),
        peak_hour_count: peak_cnt,
        velocity_svg,
        hourly_bars,
        donut_slices,
        leaderboard,
        failure_count,
        failure_categories,
    }
}
