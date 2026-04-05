import { motion } from 'framer-motion';
import { Activity, Cpu, HardDrive } from 'lucide-react';
import type { SystemMetrics } from '@/lib/mockData';

export default function StatusBar({ metrics }: { metrics: SystemMetrics }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-panel px-4 py-2 flex items-center justify-between text-xs font-mono text-muted-foreground"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-foreground font-semibold">SOC DASHBOARD</span>
          <span>v2.0</span>
        </div>
        <span className="hidden md:inline">|</span>
        <span className="hidden md:inline">Reverse Proxy Gateway Active</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          <span>{metrics.activeConnections} conn</span>
        </div>
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          <span>{metrics.cpuUsage.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          <span>{metrics.memoryUsage.toFixed(0)}%</span>
        </div>
      </div>
    </motion.div>
  );
}
