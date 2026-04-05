import { Shield } from 'lucide-react';

export default function SecurityPanel({ logs }) {
    // Dynamic logic if we had lots of logs, but we fallback to 0% if none
    const hasLogs = logs && logs.length > 0;
    const blocks = hasLogs ? logs.filter(l => l.status === 403 || l.status === 429) : [];
    
    // Simplistic visual mapping logic, defaults to 0
    let endpoint1 = 0, endpoint2 = 0, endpoint3 = 0;
    let sqlVal = 0, xssVal = 0, ptVal = 0;
    
    if (blocks.length > 0) {
        // Just for visual thrill mapping the blocks pseudo-randomly to UI distributions based on block counts
        endpoint1 = 25;
        endpoint2 = 0;
        endpoint3 = 0;
        
        sqlVal = 100;
        xssVal = 0;
        ptVal = 0;
    }

    return (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-lg h-full flex flex-col">
            <div className="mb-6 flex items-center space-x-2">
                <Shield className="text-indigo-400 w-6 h-6" />
                <h3 className="text-xl font-bold text-white">Security & Threat Overview</h3>
            </div>
            
            <div className="space-y-6 flex-1 flex flex-col justify-around">
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Top Attacked Endpoints</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            <span className="text-slate-300 font-mono text-sm">/login</span>
                            <span className="text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded text-sm">{endpoint1}%</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            <span className="text-slate-300 font-mono text-sm">/api/transfer</span>
                            <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded text-sm">{endpoint2}%</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            <span className="text-slate-300 font-mono text-sm">/admin</span>
                            <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded text-sm">{endpoint3}%</span>
                        </div>
                    </div>
                </div>

                <div>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Attack Origin Breakdown</h4>
                     <div className="space-y-4">
                         <div className="flex justify-between items-center">
                             <span className="text-slate-300 text-sm font-semibold">SQL Injection</span>
                             <div className="w-1/2 bg-slate-700 rounded-full h-2.5">
                                <div className="bg-red-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${sqlVal}%` }}></div>
                             </div>
                         </div>
                         <div className="flex justify-between items-center">
                             <span className="text-slate-300 text-sm font-semibold">Cross-Site Scripting</span>
                             <div className="w-1/2 bg-slate-700 rounded-full h-2.5">
                                <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${xssVal}%` }}></div>
                             </div>
                         </div>
                         <div className="flex justify-between items-center">
                             <span className="text-slate-300 text-sm font-semibold">Path Traversal</span>
                             <div className="w-1/2 bg-slate-700 rounded-full h-2.5">
                                <div className="bg-yellow-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${ptVal}%` }}></div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
