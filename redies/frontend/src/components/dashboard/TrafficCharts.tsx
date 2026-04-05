import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TimeSeriesPoint, AttackLog } from '@/lib/mockData';

const COLORS = {
  allowed: 'hsl(160, 100%, 45%)',
  blocked: 'hsl(0, 85%, 55%)',
  rateLimited: 'hsl(45, 100%, 55%)',
  purple: 'hsl(280, 100%, 65%)',
  blue: 'hsl(210, 100%, 60%)',
};

const pieColors = [COLORS.blocked, COLORS.rateLimited, COLORS.purple, COLORS.blue, COLORS.allowed];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="glass-panel p-2 text-xs">
      <p className="text-foreground font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export default function TrafficCharts({ timeSeries, attacks }: { timeSeries: TimeSeriesPoint[]; attacks: AttackLog[] }) {
  const typeDistribution = attacks.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(typeDistribution).map(([name, value]) => ({
    name: name.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-4 lg:col-span-2">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Requests Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(220, 15%, 18%, 0.8)" />
            <XAxis dataKey="time" tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="allowed" stroke={COLORS.allowed} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="blocked" stroke={COLORS.blocked} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="rateLimited" stroke={COLORS.rateLimited} strokeWidth={2} dot={false} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(220, 10%, 55%)' }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Attack Distribution</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'hsl(220, 10%, 55%)' }} />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
