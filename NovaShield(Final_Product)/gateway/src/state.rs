use crate::{config::GatewayConfig, metrics::Observability, security::WafEngine};
use arc_swap::ArcSwap;
use dashmap::DashMap;
use reqwest::Client;
use shared::BlacklistedIpEntry;
use std::{
    sync::Arc,
    time::{Duration, Instant},
};

pub struct RateWindow {
    pub window_started: Instant,
    pub hits: u32,
}

pub struct AppState {
    pub config: Arc<ArcSwap<GatewayConfig>>,
    pub http_client: Client,
    pub blacklist: DashMap<String, String>,
    pub rate_store: DashMap<String, RateWindow>,
    pub observability: Observability,
    pub waf: WafEngine,
}

impl AppState {
    pub fn from_config(config: GatewayConfig) -> anyhow::Result<Arc<Self>> {
        let observability = Observability::new(config.dashboard_history_limit)?;
        let client = Client::builder()
            .timeout(Duration::from_millis(config.request_timeout_ms))
            .pool_max_idle_per_host(config.upstream.max_idle_per_host)
            .pool_idle_timeout(Duration::from_secs(config.upstream.pool_idle_timeout_secs))
            .tcp_nodelay(true)
            .build()?;

        Ok(Arc::new(Self {
            config: Arc::new(ArcSwap::from_pointee(config.clone())),
            http_client: client,
            blacklist: config
                .blacklist
                .into_iter()
                .map(|entry| (entry.ip, entry.reason))
                .collect(),
            rate_store: DashMap::new(),
            observability,
            waf: WafEngine::new()?,
        }))
    }

    pub fn current_config(&self) -> Arc<GatewayConfig> {
        self.config.load_full()
    }

    pub fn blacklisted_ips(&self) -> Vec<BlacklistedIpEntry> {
        let mut entries: Vec<_> = self
            .blacklist
            .iter()
            .map(|entry| BlacklistedIpEntry {
                ip: entry.key().clone(),
                reason: entry.value().clone(),
            })
            .collect();
        entries.sort_by(|left, right| left.ip.cmp(&right.ip));
        entries
    }

    pub fn blacklist_ip(&self, ip: impl Into<String>, reason: impl Into<String>) {
        self.blacklist.insert(ip.into(), reason.into());
    }

    pub fn remove_blacklisted_ip(&self, ip: &str) -> bool {
        self.blacklist.remove(ip).is_some()
    }
}
