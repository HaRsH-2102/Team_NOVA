import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

export const getMockMetrics = () => {
    return {
        total_requests: 0,
        active_connections: 0,
        rps: 0,
        blocked_requests: 0,
        waf_blocks: 0,
        rate_limit_blocks: 0,
        blacklist_blocks: 0,
        jwt_failures: 0
    };
};

export const getMockLogs = () => {
    return [];
};
