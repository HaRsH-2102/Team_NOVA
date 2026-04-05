import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

import MetricsPanel from '@/components/dashboard/MetricsPanel';
import AttackMonitor from '@/components/dashboard/AttackMonitor';
import TrafficCharts from '@/components/dashboard/TrafficCharts';
import AiInsightsPanel from '@/components/dashboard/AiInsightsPanel';
import CyberGlobe from '@/components/dashboard/CyberGlobe';
import StatusBar from '@/components/dashboard/StatusBar';

import {
fetchMetrics,
fetchAttacks,
generateAiInsights,
type SystemMetrics,
type AttackLog,
} from '@/lib/mockData';

export default function Index() {
const [metrics, setMetrics] = useState<SystemMetrics>({
totalRequests: 0,
allowedRequests: 0,
blockedRequests: 0,
rateLimitedRequests: 0,
requestsPerSecond: 0,
uptime: 0,
activeConnections: 0,
cpuUsage: 0,
memoryUsage: 0,
});

const [attacks, setAttacks] = useState<AttackLog[]>([]);
const [insights, setInsights] = useState<string[]>([]);

// 🔥 Fetch real data
useEffect(() => {
const loadData = async () => {
try {
const metricsData = await fetchMetrics();
setMetrics(metricsData);


    const attackData = await fetchAttacks();
    setAttacks(attackData);
  } catch (err) {
    console.error("Data fetch error:", err);
  }
};

loadData();

const interval = setInterval(loadData, 2000); // real-time refresh

return () => clearInterval(interval);


}, []);

// 🧠 AI Insights
useEffect(() => {
setInsights(generateAiInsights(attacks, metrics));
}, [attacks, metrics]);

return ( <div className="min-h-screen bg-background cyber-grid"> 
      <div className="max-w-[1600px] mx-auto p-3 md:p-4 space-y-3">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 py-2"
          >
            <div className="p-2 rounded-lg bg-primary/10 neon-glow">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Cyber<span className="neon-text">Shield</span> SOC
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Security Operations Center
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              LIVE
            </div>
          </motion.div>

          {/* Metrics */}
          <MetricsPanel metrics={metrics} />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <CyberGlobe attacks={attacks} />
            <AttackMonitor attacks={attacks} />
          </div>

    {/* Charts (can be updated later with real data) */}
    <TrafficCharts timeSeries={[]} attacks={attacks} />

    {/* AI Insights */}
    <AiInsightsPanel insights={insights} />

    {/* Status */}
    <StatusBar metrics={metrics} />

  </div>
</div>
);
}