import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export const useLogs = (intervalMs = 2000) => {
    const [logs, setLogs] = useState([]);
    const [isPaused, setIsPaused] = useState(false);

    const fetchLogs = useCallback(async () => {
        if (isPaused) return;
        
        try {
            const res = await api.get('/logs');
            const newLogs = res.data;
            setLogs(prev => {
                const combined = [...newLogs, ...prev];
                return combined.slice(0, 100); 
            });
        } catch (error) {
            console.error('Failed to fetch logs', error);
        }
    }, [isPaused]);

    useEffect(() => {
        const interval = setInterval(fetchLogs, intervalMs);
        fetchLogs();
        return () => clearInterval(interval);
    }, [fetchLogs, intervalMs]);

    return { logs, isPaused, setIsPaused };
};
