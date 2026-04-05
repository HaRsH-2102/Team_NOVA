export interface AttackLog {
id: string;
timestamp: Date;
type: 'sql_injection' | 'xss' | 'rate_limit' | 'brute_force' | 'ddos';
ip: string;
country: string;
lat: number;
lng: number;
path: string;
status: 'blocked' | 'detected';
severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SystemMetrics {
totalRequests: number;
allowedRequests: number;
blockedRequests: number;
rateLimitedRequests: number;
requestsPerSecond: number;
uptime: number;
activeConnections: number;
cpuUsage: number;
memoryUsage: number;
}

export interface TimeSeriesPoint {
time: string;
allowed: number;
blocked: number;
rateLimited: number;
}

const attackTypes: AttackLog['type'][] = ['sql_injection', 'xss', 'rate_limit', 'brute_force', 'ddos'];
const severities: AttackLog['severity'][] = ['low', 'medium', 'high', 'critical'];
const paths = ['/api/login', '/api/users', '/api/admin', '/api/data', '/api/config', '/wp-admin', '/phpmyadmin'];

const locations = [
{ country: 'China', lat: 39.9, lng: 116.4 },
{ country: 'Russia', lat: 55.7, lng: 37.6 },
{ country: 'USA', lat: 40.7, lng: -74.0 },
{ country: 'Brazil', lat: -23.5, lng: -46.6 },
{ country: 'India', lat: 28.6, lng: 77.2 },
{ country: 'Germany', lat: 52.5, lng: 13.4 },
{ country: 'Nigeria', lat: 6.5, lng: 3.4 },
{ country: 'Iran', lat: 35.7, lng: 51.4 },
{ country: 'North Korea', lat: 39.0, lng: 125.7 },
{ country: 'Ukraine', lat: 50.4, lng: 30.5 },
];

function randomIp() {
return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

let attackIdCounter = 0;

export function generateAttack(): AttackLog {
const loc = locations[Math.floor(Math.random() * locations.length)];
return {
id: `atk-${++attackIdCounter}`,
timestamp: new Date(),
type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
ip: randomIp(),
country: loc.country,
lat: loc.lat + (Math.random() - 0.5) * 10,
lng: loc.lng + (Math.random() - 0.5) * 10,
path: paths[Math.floor(Math.random() * paths.length)],
status: Math.random() > 0.15 ? 'blocked' : 'detected',
severity: severities[Math.floor(Math.random() * severities.length)],
};
}

export function generateInitialAttacks(count = 20): AttackLog[] {
return Array.from({ length: count }, () => {
const atk = generateAttack();
atk.timestamp = new Date(Date.now() - Math.random() * 3600000);
return atk;
}).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function getAttackTypeLabel(type: AttackLog['type']): string {
const labels: Record<AttackLog['type'], string> = {
sql_injection: 'SQL Injection',
xss: 'XSS Attack',
rate_limit: 'Rate Limit',
brute_force: 'Brute Force',
ddos: 'DDoS',
};
return labels[type];
}

// ==========================
// 🔌 API CONFIG
// ==========================
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:9090';

// ==========================
// 📊 FETCH METRICS (REAL)
// ==========================
export async function fetchMetrics(): Promise<SystemMetrics> {
const res = await fetch(`${API_BASE}/metrics`);

if (!res.ok) {
throw new Error("Backend not reachable");
}

const data = await res.json();

return {
totalRequests: data.totalRequests,
allowedRequests: data.allowedRequests,
blockedRequests: data.blockedRequests,
rateLimitedRequests: data.rateLimited || data.rateLimitedRequests,
requestsPerSecond: data.requestsPerSecond,
uptime: data.uptime,
activeConnections: data.activeConnections || 0,
cpuUsage: data.cpuUsage || 0,
memoryUsage: data.memoryUsage || 0,
};
}

// ==========================
// 🌍 FETCH ATTACK LOGS (REAL)
// ==========================
export async function fetchAttacks(): Promise<AttackLog[]> {
const res = await fetch(`${API_BASE}/logs`);

if (!res.ok) {
throw new Error("Failed to fetch attack logs");
}

const data = await res.json();

return data.map((a: any, index: number) => ({
id: a.id || `atk-${index}`,
timestamp: new Date(a.timestamp || Date.now()),
type: a.type || 'ddos',
ip: a.ip,
country: a.country || 'Unknown',
lat: a.lat || 0,
lng: a.lng || 0,
path: a.path || '/',
status: a.status || 'blocked',
severity: a.severity || 'medium',
}));
}

// ==========================
// 🚫 BLOCK IP
// ==========================
export async function blockIp(ip: string): Promise<boolean> {
try {
const res = await fetch(`${API_BASE}/block-ip`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ ip }),
});

```
return res.ok;
```

} catch (err) {
console.error("Block IP failed:", err);
return false;
}
}

// ==========================
// 📊 AI INSIGHTS ENGINE
// ==========================
export function generateAiInsights(attacks: AttackLog[], metrics: SystemMetrics): string[] {
const insights: string[] = [];

const ipCount: Record<string, number> = {};
attacks.forEach(a => { ipCount[a.ip] = (ipCount[a.ip] || 0) + 1; });

const topIp = Object.entries(ipCount).sort((a, b) => b[1] - a[1])[0];

if (topIp && topIp[1] > 3) {
insights.push(`🔴 Repeated attacks from IP ${topIp[0]} (${topIp[1]} attempts) — brute-force suspected.`);
}

const bruteIPs = Object.entries(ipCount).filter(([_, count]) => count > 5);
if (bruteIPs.length > 0) {
insights.push(`🚨 Multiple brute-force sources detected (${bruteIPs.length} IPs).`);
}

if (metrics.requestsPerSecond > 150) {
insights.push(`🔥 Traffic spike: ${metrics.requestsPerSecond} req/s — possible DDoS.`);
}

const sqlCount = attacks.filter(a => a.type === 'sql_injection').length;
if (sqlCount > 3) {
insights.push(`🛡️ ${sqlCount} SQL injection attempts detected.`);
}

const criticalCount = attacks.filter(a => a.severity === 'critical').length;
if (criticalCount > 2) {
insights.push(`🚨 ${criticalCount} critical threats detected.`);
}

const countryCount: Record<string, number> = {};
attacks.forEach(a => { countryCount[a.country] = (countryCount[a.country] || 0) + 1; });

const topCountry = Object.entries(countryCount).sort((a, b) => b[1] - a[1])[0];
if (topCountry) {
insights.push(`🌍 Most attacks from ${topCountry[0]} (${topCountry[1]}).`);
}

if (metrics.blockedRequests / metrics.totalRequests > 0.1) {
insights.push(`📊 High block rate detected.`);
}

if (metrics.cpuUsage > 70) {
insights.push(`⚡ High CPU usage (${metrics.cpuUsage.toFixed(0)}%).`);
}

if (insights.length === 0) {
insights.push('✅ System operating normally.');
}

return insights;
}
