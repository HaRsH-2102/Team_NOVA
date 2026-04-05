import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const palette = {
  shell: "#06121e",
  card: "rgba(12, 25, 40, 0.86)",
  border: "rgba(81, 224, 192, 0.18)",
  text: "#e8fff8",
  muted: "rgba(232, 255, 248, 0.62)",
  accent: "#51e0c0",
  warning: "#ffcc66",
  danger: "#ff6b6b",
  info: "#58a6ff",
};

const outcomeTone = {
  forwarded: palette.accent,
  rate_limited: palette.warning,
  waf_blocked: palette.danger,
  blacklisted: "#ff8f5a",
  backend_error: palette.info,
};

function formatUptime(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function useSnapshot() {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadSnapshot = async () => {
      try {
        const response = await fetch("/internal/metrics/snapshot");
        if (!response.ok) {
          throw new Error(`Dashboard API returned ${response.status}`);
        }

        const data = await response.json();
        if (!active) {
          return;
        }

        setSnapshot(data);
        setError("");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message);
      }
    };

    loadSnapshot();
    const interval = setInterval(loadSnapshot, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { snapshot, error };
}

function MetricCard({ label, value, tone, helper }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: tone }}>{value}</div>
      <div className="metric-helper">{helper}</div>
    </div>
  );
}

function SectionCard({ title, caption, children }) {
  return (
    <section className="section-card">
      <div className="section-head">
        <div>
          <div className="section-title">{title}</div>
          <div className="section-caption">{caption}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const { snapshot, error } = useSnapshot();

  const breakdown = useMemo(() => (
    (snapshot?.threatBreakdown || []).map((item, index) => ({
      ...item,
      fill: [palette.warning, palette.danger, "#ff8f5a", palette.info][index % 4],
    }))
  ), [snapshot]);

  if (!snapshot) {
    return (
      <div className="app-shell">
        <div className="loading-panel">
          <h1>Nova Shield</h1>
          <p>Waiting for the proxy metrics feed...</p>
          {error ? <code>{error}</code> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="background-grid" />
      <main className="dashboard">
        <header className="hero">
          <div>
            <div className="kicker">Security Pipeline Console</div>
            <h1>Nova Shield</h1>
            <p>
              Reverse proxy, WAF, blacklist engine, and rate-limiter telemetry in one live command surface.
            </p>
          </div>
          <div className="hero-status">
            <div className="status-pill">Proxy :{snapshot.config.listenPort}</div>
            <div className="status-pill">Backend {snapshot.config.backendUrl}</div>
            <div className="status-pill">Updated {new Date(snapshot.generatedAt).toLocaleTimeString()}</div>
          </div>
        </header>

        {error ? <div className="error-banner">Dashboard refresh warning: {error}</div> : null}

        <section className="metrics-grid">
          <MetricCard
            label="Live Requests / Sec"
            value={snapshot.summary.liveRps}
            tone={palette.accent}
            helper="calculated over the last 10 seconds"
          />
          <MetricCard
            label="Forwarded Requests"
            value={snapshot.summary.forwarded}
            tone={palette.info}
            helper="traffic that cleared every policy stage"
          />
          <MetricCard
            label="Blocked Requests"
            value={snapshot.summary.blocked}
            tone={palette.danger}
            helper={`${snapshot.summary.blockRate}% of total traffic`}
          />
          <MetricCard
            label="Uptime"
            value={formatUptime(snapshot.uptimeSeconds)}
            tone={palette.warning}
            helper={`${snapshot.summary.activeBlacklist} blacklisted IPs active`}
          />
        </section>

        <section className="layout-two">
          <SectionCard title="Traffic Flow" caption="Requests vs blocked volume">
            <div className="chart-wrap tall">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshot.traffic}>
                  <defs>
                    <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.danger} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={palette.danger} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="tick" tick={{ fill: palette.muted, fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: palette.muted, fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#0c1b29",
                      border: `1px solid ${palette.border}`,
                      borderRadius: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="requests" stroke={palette.accent} fill="url(#requestsGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="blocked" stroke={palette.danger} fill="url(#blockedGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Threat Mix" caption="Which stage is doing the blocking">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdown} dataKey="value" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {breakdown.map((slice) => (
                      <Cell key={slice.name} fill={slice.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0c1b29",
                      border: `1px solid ${palette.border}`,
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend-list">
              {breakdown.map((item) => (
                <div key={item.name} className="legend-row">
                  <span className="legend-chip" style={{ background: item.fill }} />
                  <span>{item.name}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="layout-two">
          <SectionCard title="Latency Window" caption="Average response latency per second">
            <div className="chart-wrap medium">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.traffic}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="tick" tick={{ fill: palette.muted, fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: palette.muted, fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#0c1b29",
                      border: `1px solid ${palette.border}`,
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="latencyMs" fill={palette.info} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Policy Surface" caption="Active runtime policy from config.json">
            <div className="policy-stack">
              <div className="policy-row">
                <span>SQLi Block</span>
                <strong>{snapshot.config.security.block_sql_injection ? "On" : "Off"}</strong>
              </div>
              <div className="policy-row">
                <span>XSS Block</span>
                <strong>{snapshot.config.security.block_xss ? "On" : "Off"}</strong>
              </div>
              <div className="policy-row">
                <span>Path Traversal</span>
                <strong>{snapshot.config.security.block_path_traversal ? "On" : "Off"}</strong>
              </div>
              <div className="policy-row">
                <span>Command Injection</span>
                <strong>{snapshot.config.security.block_command_injection ? "On" : "Off"}</strong>
              </div>
              <div className="policy-row">
                <span>Demo IP Header</span>
                <strong>{snapshot.config.security.demo_ip_header}</strong>
              </div>
            </div>
            <div className="limits-list">
              {snapshot.config.rateLimits.map((rule) => (
                <div key={`${rule.method}-${rule.path}`} className="limit-pill">
                  <span>{rule.method} {rule.path}</span>
                  <strong>{rule.limit} / {rule.window_seconds}s</strong>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="layout-two">
          <SectionCard title="Live Event Feed" caption="Newest pipeline decisions first">
            <div className="event-feed">
              {snapshot.recentEvents.map((event) => (
                <div key={event.id} className="event-row">
                  <span className="event-code" style={{ color: outcomeTone[event.outcome] || palette.accent }}>
                    {event.statusCode}
                  </span>
                  <span className="event-ip">{event.ip}</span>
                  <span className="event-path">{event.method} {event.path}</span>
                  <span className="event-reason">{event.reason}</span>
                  <span className="event-time">{event.time}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Top Routes" caption="Most active paths and average latency">
            <div className="routes-table">
              <div className="routes-head">
                <span>Route</span>
                <span>Total</span>
                <span>Blocked</span>
                <span>Avg Latency</span>
              </div>
              {snapshot.routeStats.map((route) => (
                <div key={route.route} className="routes-row">
                  <span>{route.route}</span>
                  <span>{route.total}</span>
                  <span>{route.blocked}</span>
                  <span>{route.averageLatencyMs} ms</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>
      </main>
    </div>
  );
}
