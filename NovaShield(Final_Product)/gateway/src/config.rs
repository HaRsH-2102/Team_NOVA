use anyhow::Context;
use serde::Deserialize;
use std::{fs, path::Path};

#[derive(Debug, Clone, Deserialize)]
pub struct GatewayConfig {
    pub listen_addr: String,
    pub tls_listen_addr: String,
    pub backend_base_url: String,
    pub request_timeout_ms: u64,
    pub dashboard_history_limit: usize,
    pub max_inspection_body_bytes: usize,
    pub websocket_ping_interval_secs: u64,
    pub jwt_secret: String,
    pub tls: TlsConfig,
    pub rate_limits: RateLimits,
    pub blacklist: Vec<BlacklistConfigEntry>,
    pub upstream: UpstreamPoolConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BlacklistConfigEntry {
    pub ip: String,
    pub reason: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TlsConfig {
    pub enabled: bool,
    pub cert_path: String,
    pub key_path: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RateLimits {
    pub default_per_minute: u32,
    pub login_per_minute: u32,
    pub transfer_per_minute: u32,
    pub balance_per_minute: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpstreamPoolConfig {
    pub max_idle_per_host: usize,
    pub pool_idle_timeout_secs: u64,
}

impl GatewayConfig {
    pub fn load(path: impl AsRef<Path>) -> anyhow::Result<Self> {
        let path = path.as_ref();
        let raw = fs::read_to_string(path)
            .with_context(|| format!("failed to read gateway config at {}", path.display()))?;
        serde_json::from_str(&raw)
            .with_context(|| format!("failed to parse gateway config at {}", path.display()))
    }
}
