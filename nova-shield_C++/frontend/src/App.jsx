import Navbar from './components/Navbar';
import MetricsCards from './components/MetricsCards';
import TrafficChart from './components/TrafficChart';
import SecurityPanel from './components/SecurityPanel';
import LogsPanel from './components/LogsPanel';
import { useMetrics } from './hooks/useMetrics';
import { useLogs } from './hooks/useLogs';

function App() {
  const { metrics, history, isConnected } = useMetrics(2000);
  const { logs, isPaused, setIsPaused } = useLogs(2000);

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-300 font-sans selection:bg-blue-500/30">
      <Navbar isConnected={isConnected} />
      
      <main className="pt-24 pb-12 px-2 sm:px-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* Top layer: KPI Metric Cards */}
        <MetricsCards metrics={metrics} />
        
        {/* Middle Layer: Charts and Security Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[400px]">
          <div className="lg:col-span-2 h-full min-h-[300px]">
            <TrafficChart history={history} />
          </div>
          <div className="h-full min-h-[400px]">
            <SecurityPanel logs={logs} />
          </div>
        </div>

        {/* Bottom Layer: Live Logs */}
        <div className="h-[400px]">
          <LogsPanel logs={logs} isPaused={isPaused} setIsPaused={setIsPaused} />
        </div>

      </main>
    </div>
  );
}

export default App;
