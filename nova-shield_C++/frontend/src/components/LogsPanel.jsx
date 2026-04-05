import { Terminal, Pause, Play, Search } from 'lucide-react';
import { useState } from 'react';

export default function LogsPanel({ logs, isPaused, setIsPaused }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLogs = logs.filter(log => 
        log.path.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.ip.includes(searchTerm) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        if (status >= 200 && status < 300) return 'text-emerald-400';
        if (status >= 400 && status < 500) return 'text-orange-400';
        if (status >= 500) return 'text-red-500';
        return 'text-slate-400';
    };

    const getActionBadge = (action) => {
        switch(action) {
            case 'WAF_BLOCK': return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs font-bold w-full text-center tracking-widest">WAF BLOCK</span>;
            case 'IP_BLOCK': return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-xs font-bold w-full text-center tracking-widest">IP BLOCK</span>;
            case 'RATE_LIMITED': return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-xs font-bold w-full text-center tracking-widest">RATE LIMIT</span>;
            case 'JWT_INVALID': return <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded text-xs font-bold w-full text-center tracking-widest">INVALID JWT</span>;
            default: return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-bold w-full text-center tracking-widest">ALLOWED</span>;
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl shadow-lg flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2">
                    <Terminal className="text-slate-400 w-5 h-5" />
                    <h3 className="text-xl font-bold text-white">Live Traffic Logs</h3>
                </div>
                
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Filter IP, Path, Action..." 
                            className="bg-slate-900/50 border border-slate-700 text-sm text-slate-300 rounded-lg pl-9 pr-4 py-2 w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className={`p-2 rounded-lg border flex items-center transition ${isPaused ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 hover:bg-amber-500/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                        title={isPaused ? "Resume Logs" : "Pause Logs"}
                    >
                        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-x-auto p-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-900/40 text-slate-400 font-mono text-xs uppercase sticky top-0 z-10">
                        <tr>
                            <th className="px-5 py-3 font-semibold tracking-wider">Time</th>
                            <th className="px-5 py-3 font-semibold tracking-wider">Status</th>
                            <th className="px-5 py-3 font-semibold tracking-wider">Method</th>
                            <th className="px-5 py-3 font-semibold tracking-wider">Path</th>
                            <th className="px-5 py-3 font-semibold tracking-wider">Client IP</th>
                            <th className="px-5 py-3 font-semibold text-center tracking-wider w-40">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/40 transition duration-150">
                                <td className="px-5 py-3 text-slate-500">{log.time}</td>
                                <td className={`px-5 py-3 font-bold ${getStatusColor(log.status)}`}>{log.status}</td>
                                <td className="px-5 py-3 text-blue-400 font-bold">{log.method}</td>
                                <td className="px-5 py-3 text-slate-300 truncate max-w-[200px]">{log.path}</td>
                                <td className="px-5 py-3 text-slate-400">{log.ip}</td>
                                <td className="px-5 py-3 flex justify-center">{getActionBadge(log.action)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                        <Terminal className="w-10 h-10 mb-2 opacity-50" />
                        <p>No matching logs found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
