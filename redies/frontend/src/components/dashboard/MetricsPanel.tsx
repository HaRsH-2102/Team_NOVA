import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldX, Gauge, Clock, Wifi } from 'lucide-react';
import type { SystemMetrics } from '@/lib/mockData';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

function MetricCard({ label, value, icon, color, delay }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-panel p-4 flex items-center gap-4"
    >
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
        <p className="stat-value text-foreground">{value}</p>
      </div>
    </motion.div>
  );
}

export default function MetricsPanel({ metrics }: { metrics: SystemMetrics }) {
  const cards = [
    { label: 'Total Requests', value: (metrics.totalRequests || 0).toLocaleString(), icon: <Gauge className="w-5 h-5 text-cyber-blue" />, color: 'bg-cyber-blue/10' },
    { label: 'Allowed', value: (metrics.totalRequests || 0).toLocaleString(), icon: <ShieldCheck className="w-5 h-5 text-success" />, color: 'bg-success/10' },
    { label: 'Blocked', value: (metrics.totalRequests || 0).toLocaleString(), icon: <ShieldX className="w-5 h-5 text-destructive" />, color: 'bg-destructive/10' },
    { label: 'Rate Limited', value: (metrics.totalRequests || 0).toLocaleString(), icon: <Shield className="w-5 h-5 text-warning" />, color: 'bg-warning/10' },
    { label: 'Req/s', value: metrics.requestsPerSecond, icon: <Wifi className="w-5 h-5 text-cyber-purple" />, color: 'bg-cyber-purple/10' },
    { label: 'Uptime', value: `${metrics.uptime}%`, icon: <Clock className="w-5 h-5 text-primary" />, color: 'bg-primary/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <MetricCard key={card.label} {...card} delay={i * 0.1} />
      ))}
    </div>
  );
}
