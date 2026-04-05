import { Activity, Users, Zap, ShieldAlert, Lock, AlertTriangle, XOctagon, Key } from 'lucide-react';

const Card = ({ title, value, icon: Icon, colorClass, textColorClass }) => (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:bg-slate-800 transition duration-300 shadow-lg relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-32 h-32 ${colorClass} opacity-10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-20 transition`}></div>
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{title}</p>
                <h3 className="text-4xl font-extrabold text-white font-mono">{value != null ? value.toLocaleString() : 0}</h3>
            </div>
            <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20 backdrop-blur-sm border ${colorClass.replace('bg-', 'border-').replace('500', '500/30')}`}>
                <Icon className={`w-7 h-7 ${textColorClass}`} />
            </div>
        </div>
    </div>
);

export default function MetricsCards({ metrics }) {
    if (!metrics || typeof metrics !== 'object') return null;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card title="Total Requests" value={metrics.total_requests} icon={Activity} colorClass="bg-blue-500" textColorClass="text-blue-400" />
            <Card title="Active Conn" value={metrics.active_connections} icon={Users} colorClass="bg-emerald-500" textColorClass="text-emerald-400" />
            <Card title="Current RPS" value={metrics.rps} icon={Zap} colorClass="bg-yellow-500" textColorClass="text-yellow-400" />
            <Card title="Total Blocked" value={metrics.blocked_requests} icon={ShieldAlert} colorClass="bg-red-500" textColorClass="text-red-400" />
            
            <Card title="WAF Blocks" value={metrics.waf_blocks} icon={AlertTriangle} colorClass="bg-orange-500" textColorClass="text-orange-400" />
            <Card title="Rate Limited" value={metrics.rate_limit_blocks} icon={Lock} colorClass="bg-purple-500" textColorClass="text-purple-400" />
            <Card title="IP Blacklisted" value={metrics.blacklist_blocks} icon={XOctagon} colorClass="bg-rose-500" textColorClass="text-rose-400" />
            <Card title="JWT Failures" value={metrics.jwt_failures} icon={Key} colorClass="bg-pink-500" textColorClass="text-pink-400" />
        </div>
    );
}
