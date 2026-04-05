import { Activity, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Navbar({ isConnected }) {
    return (
        <nav className="fixed top-0 w-full bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-50 shadow-sm shadow-black/50">
            <div className="flex items-center space-x-3">
                <ShieldCheck className="text-blue-500 w-8 h-8" />
                <h1 className="text-2xl font-bold text-white tracking-widest">NOVA<span className="text-blue-500">SHIELD</span></h1>
            </div>
            
            <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
                    <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    </span>
                    <span className="text-sm uppercase tracking-wider font-bold" style={{ color: isConnected ? '#10b981' : '#ef4444'}}>
                        {isConnected ? 'System Online' : 'System Offline'}
                    </span>
                </div>
            </div>
        </nav>
    );
}
