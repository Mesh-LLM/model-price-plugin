//! Fixed public feeds; no caller-controlled URL, credentials or Mesh data leaves the process.
use anyhow::{Context, Result, ensure};
use serde_json::{Value, json};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
const TTL: Duration = Duration::from_secs(300);
const MAX_AGE: Duration = Duration::from_secs(3600);
const BACKOFF: Duration = Duration::from_secs(60);
const LIMIT: usize = 8 * 1024 * 1024;
#[derive(Clone, Copy)]
pub enum Kind {
    Fx,
    Models,
}
impl Kind {
    fn url(self) -> &'static str {
        match self {
            Self::Fx => "https://api.coinbase.com/v2/prices/BTC-USD/spot",
            Self::Models => "https://openrouter.ai/api/v1/models",
        }
    }
}
#[derive(Default)]
struct Cache {
    value: Option<Value>,
    success: Option<Instant>,
    retrieved: Option<u64>,
    attempt: Option<Instant>,
    failed: bool,
}
impl Cache {
    fn due(&self, now: Instant) -> bool {
        self.attempt
            .is_none_or(|t| now.duration_since(t) >= if self.failed { BACKOFF } else { TTL })
    }
    fn record(&mut self, now: Instant, wall: u64, result: Result<Value>) {
        self.attempt = Some(now);
        self.failed = result.is_err();
        if let Ok(value) = result {
            self.value = Some(value);
            self.success = Some(now);
            self.retrieved = Some(wall);
        }
    }
    fn view(&self, now: Instant, source: &str) -> Value {
        let age = self.success.map(|t| now.duration_since(t));
        let available = age.is_some_and(|a| a <= MAX_AGE);
        json!({"source":source, "retrieved_at":self.retrieved,
            "state": if !available { "unavailable" } else if self.failed || age.unwrap() >= TTL { "stale" } else { "fresh" },
            "data": if available { self.value.clone() } else { None },
            "refresh_failed": self.failed})
    }
}
pub struct Feed {
    kind: Kind,
    client: reqwest::Client,
    cache: Mutex<Cache>,
}
impl Feed {
    pub fn new(kind: Kind) -> Result<Self> {
        Ok(Self {
            kind,
            client: reqwest::Client::builder()
                .https_only(true)
                .no_proxy()
                .redirect(reqwest::redirect::Policy::none())
                .timeout(Duration::from_secs(8))
                .connect_timeout(Duration::from_secs(3))
                .build()?,
            cache: Mutex::new(Cache::default()),
        })
    }
    pub async fn get(&self) -> Value {
        // One refresh per feed; parallel callers reuse the completed result.
        let mut cache = self.cache.lock().await;
        if cache.due(Instant::now()) {
            let result = self.fetch().await;
            cache.record(
                Instant::now(),
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
                result,
            );
        }
        cache.view(Instant::now(), self.kind.url())
    }
    async fn fetch(&self) -> Result<Value> {
        let mut response = self
            .client
            .get(self.kind.url())
            .send()
            .await?
            .error_for_status()?;
        ensure!(response.status().is_success(), "unsuccessful feed");
        ensure!(
            response.content_length().is_none_or(|n| n <= LIMIT as u64),
            "oversized feed"
        );
        let mut bytes = Vec::new();
        while let Some(chunk) = response.chunk().await? {
            ensure!(bytes.len() + chunk.len() <= LIMIT, "oversized feed");
            bytes.extend_from_slice(&chunk);
        }
        normalize(self.kind, &serde_json::from_slice(&bytes)?)
    }
}
fn price(v: &Value) -> Option<f64> {
    let n = match v {
        Value::String(s) if !s.trim().is_empty() => s.parse().ok()?,
        Value::Number(n) => n.as_f64()?,
        _ => return None,
    };
    (n >= 0.0 && n.is_finite() && (n * 1_000_000.0).is_finite()).then_some(n)
}
fn normalize(kind: Kind, body: &Value) -> Result<Value> {
    match kind {
        Kind::Fx => {
            ensure!(
                body["data"]["base"] == "BTC" && body["data"]["currency"] == "USD",
                "unexpected currency"
            );
            let rate = price(&body["data"]["amount"])
                .filter(|n| *n > 0.0)
                .context("invalid FX rate")?;
            Ok(json!({"btc_usd": rate}))
        }
        Kind::Models => {
            let rows = body["data"].as_array().context("invalid models")?;
            ensure!(rows.len() <= 10000, "too many models");
            let mut out = serde_json::Map::new();
            for row in rows {
                let Some(id) = row["id"]
                    .as_str()
                    .filter(|id| !id.is_empty() && id.len() <= 512)
                else {
                    continue;
                };
                // Duplicate IDs are ambiguous; never select a provider by iteration order.
                if out.contains_key(id) {
                    out.insert(id.into(), Value::Null);
                    continue;
                }
                out.insert(
                    id.into(),
                    json!({"input_usd_million":price(&row["pricing"]["prompt"]).map(|n|n*1e6),
                    "output_usd_million":price(&row["pricing"]["completion"]).map(|n|n*1e6)}),
                );
            }
            Ok(Value::Object(out))
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn prices_reject_bad_values() {
        for v in [
            json!(null),
            json!(true),
            json!(""),
            json!("NaN"),
            json!("inf"),
            json!("-1"),
            json!("1e309"),
        ] {
            assert_eq!(price(&v), None);
        }
        assert_eq!(price(&json!("0")), Some(0.0));
        let v = normalize(
            Kind::Models,
            &json!({"data":[{"id":"a/b","pricing":{"prompt":"0.000001","completion":"-1"}}]}),
        )
        .unwrap();
        assert_eq!(v["a/b"]["input_usd_million"], 1.0);
        assert!(v["a/b"]["output_usd_million"].is_null());
    }
    #[test]
    fn currencies_and_duplicates() {
        assert!(
            normalize(
                Kind::Fx,
                &json!({"data":{"base":"ETH","currency":"USD","amount":"2"}})
            )
            .is_err()
        );
        assert!(
            normalize(
                Kind::Fx,
                &json!({"data":{"base":"BTC","currency":"USD","amount":"0"}})
            )
            .is_err()
        );
        assert_eq!(
            normalize(
                Kind::Fx,
                &json!({"data":{"base":"BTC","currency":"USD","amount":"50000"}})
            )
            .unwrap()["btc_usd"],
            50000.0
        );
        assert!(normalize(Kind::Models, &json!({})).is_err());
        assert!(
            normalize(Kind::Models, &json!({"data":[{"id":"x"},{"id":"x"}]})).unwrap()["x"]
                .is_null()
        );
    }
    #[test]
    fn cache_failure_backoff_staleness_and_expiry() {
        let now = Instant::now();
        let mut c = Cache::default();
        assert!(c.due(now));
        c.record(now, 123, Err(anyhow::anyhow!("offline")));
        assert!(!c.due(now));
        assert_eq!(c.view(now, "test")["state"], "unavailable");
        assert!(c.due(now + BACKOFF));
        c.record(now, 124, Ok(json!({"btc_usd":50000})));
        assert!(!c.due(now + BACKOFF));
        assert!(c.due(now + TTL));
        c.record(now + TTL, 125, Err(anyhow::anyhow!("offline")));
        assert_eq!(c.view(now + TTL, "test")["state"], "stale");
        assert_eq!(c.view(now + TTL, "test")["retrieved_at"], 124);
        assert!(c.view(now + MAX_AGE + BACKOFF, "test")["data"].is_null());
    }
}
