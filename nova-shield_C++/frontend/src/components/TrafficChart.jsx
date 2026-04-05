import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrafficChart({ history }) {
    if (!history || history.length === 0) return null;
    
    return (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-lg h-full">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-white">Live Traffic Analysis</h3>
                <p className="text-slate-400 text-sm">Requests per second (Allowed vs Blocked)</p>
            </div>
            <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => val.split(':').slice(1).join(':')} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                            itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="rps" name="Allowed (RPS)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRps)" isAnimationActive={false} />
                        <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorBlocked)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
