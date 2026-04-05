import { useState, useEffect } from 'react';
import { api, getMockMetrics } from '../services/api';

export const useMetrics = (intervalMs = 2000) => {
    const [metrics, setMetrics] = useState(getMockMetrics());
    const [history, setHistory] = useState([]);
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                // Hit real backend!
                const res = await api.get('/metrics');
                const data = res.data;
                
                setMetrics(prev => {
                    const rps = prev ? Math.max(0, Math.floor((data.total_requests - prev.total_requests) / (intervalMs / 1000))) : 0;
                    data.rps = rps;
                    
                    // Update History Array inside the setMetrics callback since it relies on the newly computed RPS
                    setHistory(prevHist => {
                        const newPoint = { 
                            time: new Date().toLocaleTimeString([], { hour12: false }), 
                            rps: rps, 
                            blocked: prev ? Math.max(0, Math.floor((data.blocked_requests - prev.blocked_requests) / (intervalMs / 1000))) : 0
                        };
                        const newHistory = [...prevHist, newPoint];
                        if (newHistory.length > 30) newHistory.shift();
                        return newHistory;
                    });
                    
                    return data;
                });
                
                setIsConnected(true);
            } catch (err) {
                setIsConnected(false);
            }
        };

        const interval = setInterval(fetchMetrics, intervalMs);
        fetchMetrics();
        return () => clearInterval(interval);
    }, [intervalMs]);

    return { metrics, history, isConnected };
};
