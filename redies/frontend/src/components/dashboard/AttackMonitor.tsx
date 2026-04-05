import { motion, AnimatePresence } from 'framer-motion';
import { Ban, AlertTriangle } from 'lucide-react';
import { type AttackLog, getAttackTypeLabel, blockIp } from '@/lib/mockData';
import { useState } from 'react';
import { toast } from 'sonner';

const severityColors: Record<AttackLog['severity'], string> = {
  low: 'text-muted-foreground bg-muted',
  medium: 'text-warning bg-warning/10',
  high: 'text-cyber-amber bg-cyber-amber/10',
  critical: 'text-destructive bg-destructive/10',
};

const typeColors: Record<AttackLog['type'], string> = {
  sql_injection: 'text-destructive',
  xss: 'text-cyber-amber',
  rate_limit: 'text-warning',
  brute_force: 'text-cyber-purple',
  ddos: 'text-cyber-red',
};

export default function AttackMonitor({ attacks }: { attacks: AttackLog[] }) {
  const [blockedIps, setBlockedIps] = useState<Set<string>>(new Set());

  const handleBlock = async (ip: string) => {
    const success = await blockIp(ip);
    if (success) {
      setBlockedIps(prev => new Set(prev).add(ip));
      toast.success(`IP ${ip} has been blocked`, { description: 'Added to firewall blocklist' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-panel p-4 h-[400px] flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-destructive animate-pulse-glow" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Live Attack Monitor</h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{attacks.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-cyber space-y-1.5">
        <AnimatePresence initial={false}>
          {attacks.slice(0, 50).map((atk) => (
            <motion.div
              key={atk.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs group"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${atk.severity === 'critical' ? 'bg-destructive animate-pulse-glow' : atk.severity === 'high' ? 'bg-cyber-amber' : 'bg-muted-foreground'}`} />
              <span className="text-muted-foreground font-mono w-14 shrink-0">
                {atk.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`font-semibold w-24 shrink-0 ${typeColors[atk.type]}`}>
                {getAttackTypeLabel(atk.type)}
              </span>
              <span className="text-foreground font-mono truncate">{atk.ip}</span>
              <span className="text-muted-foreground truncate hidden md:inline">{atk.path}</span>
              <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${severityColors[atk.severity]}`}>
                {atk.severity}
              </span>
              <button
                onClick={() => handleBlock(atk.ip)}
                disabled={blockedIps.has(atk.ip)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20 disabled:opacity-30"
                title={`Block ${atk.ip}`}
              >
                <Ban className="w-3 h-3 text-destructive" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
