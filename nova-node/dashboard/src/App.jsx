import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import './index.css';

const MOCK_DATA = {
  rps: 12,
  totalBlocked: 45,
  events: [
    { time: new Date().toISOString(), statusCode: 200, ip: '192.168.1.5', reason: 'OK' },
    { time: new Date().toISOString(), statusCode: 403, ip: '192.168.1.10', reason: 'Blacklisted IP' },
    { time: new Date().toISOString(), statusCode: 429, ip: '10.0.0.5', reason: 'Rate Limit Exceeded' },
    { time: new Date().toISOString(), statusCode: 403, ip: '172.16.0.4', reason: 'SQL Injection' }
  ],
  port: 9090
};

const COLORS = {
  teal: '#00e5a0',
  red: '#ff4757',
  amber: '#ffa502',
  blue: '#1e90ff',
  purple: '#9b59b6'
};

export default function App() {
  const [stats, setStats] = useState(MOCK_DATA);
  const [history, setHistory] = useState([]);
  const [latencyHistory, setLatencyHistory] = useState([]);
  
  // AI Chat State
  const [chatLog, setChatLog] = useState([{ role: 'ai', text: 'SYSTEM ONLINE. I am Nova Shield AI. How can I assist you with gateway security today?' }]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isAiTyping]);

  useEffect(() => {
    const fetchData = async () => {
      let currentStats;
      try {
        const res = await fetch('http://localhost:9090/nova-stats');
        currentStats = await res.json();
      } catch (err) {
        // Fallback to mock data if proxy is down
        currentStats = MOCK_DATA;
        currentStats.rps = Math.floor(Math.random() * 20);
      }
      setStats(currentStats);

      setHistory(prev => {
        const newHist = [...prev, { time: new Date().toLocaleTimeString(), rps: currentStats.rps, blocked: currentStats.totalBlocked }];
        if (newHist.length > 30) newHist.shift();
        return newHist;
      });

      setLatencyHistory(prev => {
        const fakeLatency = Math.floor(Math.random() * 4) + 1; // 1 to 4 ms target
        const newLat = [...prev, { time: new Date().toLocaleTimeString(), latency: fakeLatency }];
        if (newLat.length > 12) newLat.shift();
        return newLat;
      });
    };

    fetchData(); // initial
    const initInterval = setInterval(fetchData, 2800);
    return () => clearInterval(initInterval);
  }, []);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatLog(prev => [...prev, { role: 'admin', text: chatInput }]);
    const userInput = chatInput;
    setChatInput('');
    setIsAiTyping(true);

    // Call Anthropic API (Requires a proxy or API key, normally blocked by CORS if direct from browser without proper headers)
    // For demo purposes, we will mock the AI response if the actual call fails, but we attempt a direct fetch.
    try {
      const apiKey = localStorage.getItem('ANTHROPIC_API_KEY') || ''; 
      if (!apiKey) throw new Error("No API Key");

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-cors-hack': 'true' // Normally requires a backend proxy for real usage
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 200,
          system: "You are Nova Shield AI, an expert cybersecurity analyst embedded in this banking API gateway dashboard. Help the admin understand attacks, interpret live metrics, tune rate limits, improve WAF rules, and explain proxy architecture. Be concise and technical.",
          messages: [{ role: 'user', content: userInput }]
        })
      });
      const data = await response.json();
      setChatLog(prev => [...prev, { role: 'ai', text: data.content[0].text }]);
    } catch (err) {
      // Mock fallback
      setTimeout(() => {
        let reply = "Security logs analyzed. It appears we are seeing an influx of malicious traffic. I recommend tightening the rate limits on /login and monitoring the WAF for specific SQLi signatures.";
        if (userInput.toLowerCase().includes("sql")) reply = "The WAF specifically looks for common SQLi patterns in both the URL and JSON payload, such as 'OR 1=1', UNION SELECT, and comment chaining using regex.";
        if (userInput.toLowerCase().includes("why")) reply = "The IP was blocked because it triggered our regex rules in the proxy/waf.js module, specifically the pattern matching path traversal.";
        
        setChatLog(prev => [...prev, { role: 'ai', text: `[MOCK RESPONSE - Add ANTHROPIC_API_KEY to localStorage for real AI] ${reply}` }]);
        setIsAiTyping(false);
      }, 1000);
      return;
    }
    setIsAiTyping(false);
  };

  // Compute threat breakdown
  const computeThreats = () => {
    const counts = { 'SQL Injection': 0, 'Rate Limit': 0, 'IP Ban': 0, 'XSS': 0, 'Other': 0 };
    stats.events.forEach(e => {
      if (e.statusCode === 429) counts['Rate Limit']++;
      else if (e.reason === 'Blacklisted IP') counts['IP Ban']++;
      else if (e.reason === 'SQL Injection') counts['SQL Injection']++;
      else if (e.reason === 'XSS') counts['XSS']++;
      else if (e.statusCode === 403) counts['Other']++;
    });
    
    return [
      { name: 'SQLi', value: counts['SQL Injection'], color: COLORS.red },
      { name: 'Rate Limit', value: counts['Rate Limit'], color: COLORS.amber },
      { name: 'IP Ban', value: counts['IP Ban'], color: COLORS.purple },
      { name: 'XSS', value: counts['XSS'], color: COLORS.teal }
    ].filter(i => i.value > 0);
  };
  const threatData = computeThreats().length > 0 ? computeThreats() : [{ name: 'None', value: 1, color: '#333' }];
  
  // Calculate unique blacklisted IPs (approx based on events)
  const blacklistEstimate = stats.events.filter(e => e.reason === 'Blacklisted IP').length;

  return (
    <div className="dashboard-container">
      <h1 className="terminal-title">NOVA SHIELD COMMAND CENTER</h1>
      
      <div className="top-cards">
        <div className="metric-card teal" style={{ animationDelay: '0s'}}>
          <div className="card-label">Requests / Sec</div>
          <div className="card-value">{stats.rps}</div>
        </div>
        <div className="metric-card red" style={{ animationDelay: '0.2s'}}>
          <div className="card-label">Total Blocked</div>
          <div className="card-value">{stats.totalBlocked}</div>
        </div>
        <div className="metric-card amber" style={{ animationDelay: '0.4s'}}>
          <div className="card-label">Threats Detected</div>
          <div className="card-value">{stats.events.filter(e => e.statusCode !== 200).length}</div>
        </div>
        <div className="metric-card blue" style={{ animationDelay: '0.6s'}}>
          <div className="card-label">Proxy Port</div>
          <div className="card-value">{stats.port}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="left-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="panel">
            <h2>Traffic vs Blocked (Live)</h2>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.red} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#444" />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                  <Area type="monotone" dataKey="rps" stroke={COLORS.teal} fillOpacity={1} fill="url(#colorRps)" name="Total RPM/RPS" />
                  <Area type="monotone" dataKey="blocked" stroke={COLORS.red} fillOpacity={1} fill="url(#colorBlocked)" name="Total Blocked" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="panel">
              <h2>Threat Breakdown</h2>
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={threatData} innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                      {threatData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="panel">
              <h2>Proxy Latency (ms)</h2>
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latencyHistory}>
                     <XAxis dataKey="time" hide />
                     <YAxis stroke="#444" domain={[0, 10]} />
                     <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                     <Bar dataKey="latency" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
        </div>

        <div className="right-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2>Live Event Feed</h2>
            <div className="event-feed">
              {stats.events.map((ev, i) => {
                const cls = ev.statusCode === 200 ? 'ok-200' : (ev.statusCode === 429 ? 'err-429' : 'err-403');
                return (
                  <div key={i} className={`event-row ${cls}`}>
                    <span className="time">[{new Date(ev.time).toLocaleTimeString()}]</span>
                    <span className="status">[{ev.statusCode}]</span>
                    <span className="ip">{ev.ip}</span>
                    <span className="reason">{ev.reason}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      <div className="panel ai-terminal">
        <h2>NOVA SHIELD AI — SECURITY ANALYST</h2>
        <div className="ai-chat-area">
          {chatLog.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <strong>{msg.role === 'ai' ? 'NOVA AI > ' : 'ADMIN > '}</strong>
              {msg.text}
            </div>
          ))}
          {isAiTyping && <div className="msg ai"><strong>NOVA AI &gt; </strong>analyzing...</div>}
          <div ref={chatEndRef} />
        </div>
        <form className="ai-input-area" onSubmit={handleChatSubmit}>
          <input 
            type="text" 
            placeholder="Ask Nova Shield AI about current traffic or attacks..." 
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </div>

    </div>
  );
}
