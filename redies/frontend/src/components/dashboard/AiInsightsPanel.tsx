import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';

export default function AiInsightsPanel({ insights }: { insights: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-panel p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-cyber-purple" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">AI Threat Intelligence</h3>
        <Sparkles className="w-3 h-3 text-cyber-purple animate-pulse-glow ml-1" />
      </div>

      <div className="space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            className="p-3 rounded-lg bg-secondary/30 text-sm text-card-foreground leading-relaxed border border-border/50"
          >
            {insight}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
