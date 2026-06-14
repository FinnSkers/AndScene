import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Terminal, 
  ArrowLeft, 
  Database, 
  Film, 
  Server, 
  RefreshCw 
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchTrending } from '../services/tmdb';
import './Status.css';

export default function Status() {
  const [supabaseStatus, setSupabaseStatus] = useState('checking');
  const [supabaseLatency, setSupabaseLatency] = useState(null);
  const [supabaseDetails, setSupabaseDetails] = useState('');

  const [tmdbStatus, setTmdbStatus] = useState('checking');
  const [tmdbLatency, setTmdbLatency] = useState(null);
  const [tmdbDetails, setTmdbDetails] = useState('');

  const [scraperStatus, setScraperStatus] = useState('checking');
  const [scraperLatency, setScraperLatency] = useState(null);
  const [scraperDetails, setScraperDetails] = useState('');

  const [consoleLines, setConsoleLines] = useState([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const terminalEndRef = useRef(null);

  const addConsoleLine = useCallback((text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLines(prev => [...prev, { timestamp, text, type }]);
  }, []);

  const runDiagnostics = useCallback(async () => {
    if (isDiagnosing) return;
    setIsDiagnosing(true);
    setConsoleLines([]);
    addConsoleLine('Initializing system diagnostics...', 'input');

    // ----------------------------------------------------
    // 1. SUPABASE DIAGNOSTIC
    // ----------------------------------------------------
    setSupabaseStatus('checking');
    addConsoleLine('Connecting to Supabase Database Api...', 'info');
    try {
      const start = performance.now();
      const { data, error } = await supabase
        .from('system_config')
        .select('key')
        .limit(1);
      
      const latency = Math.round(performance.now() - start);
      setSupabaseLatency(latency);

      if (error) {
        setSupabaseStatus('degraded');
        setSupabaseDetails(`Connected with warning: ${error.message}`);
        addConsoleLine(`⚠️ Supabase connection warning: ${error.message} (latency: ${latency}ms)`, 'warning');
      } else {
        setSupabaseStatus('operational');
        setSupabaseDetails('All database connections fully operational.');
        addConsoleLine(`✅ Supabase Database is queryable. Connection active (latency: ${latency}ms)`, 'success');
      }
    } catch (err) {
      setSupabaseStatus('offline');
      setSupabaseDetails(`Database connection failed: ${err.message}`);
      addConsoleLine(`❌ Supabase Database check failed: ${err.message}`, 'error');
    }

    // ----------------------------------------------------
    // 2. TMDB CATALOG API DIAGNOSTIC
    // ----------------------------------------------------
    setTmdbStatus('checking');
    addConsoleLine('Pinging TMDB Catalog Metadata API...', 'info');
    try {
      const start = performance.now();
      const movies = await fetchTrending(1);
      const latency = Math.round(performance.now() - start);
      setTmdbLatency(latency);

      if (movies && movies.length > 0) {
        setTmdbStatus('operational');
        setTmdbDetails('Metadata searches and trending feeds active.');
        addConsoleLine(`✅ TMDB API responded successfully. Loaded ${movies.length} items (latency: ${latency}ms)`, 'success');
      } else {
        setTmdbStatus('degraded');
        setTmdbDetails('API responded with empty metadata results.');
        addConsoleLine(`⚠️ TMDB API responded, but returned empty catalog rows (latency: ${latency}ms)`, 'warning');
      }
    } catch (err) {
      setTmdbStatus('offline');
      setTmdbDetails(`Catalog API failed: ${err.message}`);
      addConsoleLine(`❌ TMDB API connection failed: ${err.message}`, 'error');
    }

    // ----------------------------------------------------
    // 3. CUSTOM SCRAPER SERVER DIAGNOSTIC
    // ----------------------------------------------------
    setScraperStatus('checking');
    const customServerUrl = localStorage.getItem('user_cinepro_server_url') || 'http://localhost:3001';
    addConsoleLine(`Checking Custom Scraper Server at ${customServerUrl}...`, 'info');
    try {
      const start = performance.now();
      const response = await fetch(customServerUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const latency = Math.round(performance.now() - start);
      setScraperLatency(latency);

      if (response.ok) {
        const body = await response.json();
        setScraperStatus('operational');
        setScraperDetails(`Running on port 3001. Resolve routes online.`);
        addConsoleLine(`✅ Scraper Server responded. Message: "${body.message}" (latency: ${latency}ms)`, 'success');
      } else {
        setScraperStatus('degraded');
        setScraperDetails(`Server returned bad status: ${response.status}`);
        addConsoleLine(`⚠️ Scraper Server returned non-200 HTTP code: ${response.status} (latency: ${latency}ms)`, 'warning');
      }
    } catch (err) {
      setScraperStatus('offline');
      setScraperDetails('Local scraper client unreachable. Ensure port is active.');
      addConsoleLine(`❌ Scraper Server unreachable: ${err.message}. Ensure your local server is running.`, 'error');
    }

    addConsoleLine('System diagnostic process completed.', 'input');
    setIsDiagnosing(false);
  }, [addConsoleLine, isDiagnosing]);

  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom of terminal when lines are added
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLines]);

  // Determine overall status
  const getOverallStatus = () => {
    const statuses = [supabaseStatus, tmdbStatus, scraperStatus];
    if (statuses.includes('checking')) return { class: 'checking', text: 'Checking Systems...', msg: 'Diagnosing system dependencies.' };
    if (statuses.every(s => s === 'operational')) return { class: 'all-good', text: 'All Systems Operational', msg: 'Supabase Database, TMDB API, and Scraper Server are online.' };
    if (statuses.every(s => s === 'offline')) return { class: 'all-down', text: 'Major System Outage', msg: 'Critical systems are currently unreachable.' };
    return { class: 'partial-issue', text: 'Partial System Outage / Degraded', msg: 'One or more systems are experiencing downtime or are offline.' };
  };

  const overall = getOverallStatus();

  return (
    <div className="status-page">
      <div className="status-container">
        
        {/* Header */}
        <div className="status-header">
          <h1>System Status</h1>
          <p className="status-subtitle">Realtime health and diagnostic dashboard for AndScene! services.</p>
        </div>

        {/* Overall Banner */}
        <div className={`overall-status-banner ${overall.class}`}>
          <div className="overall-info">
            <h2>{overall.text}</h2>
            <p>{overall.msg}</p>
          </div>
          <button 
            className="btn-diagnostics" 
            onClick={runDiagnostics} 
            disabled={isDiagnosing}
          >
            <RefreshCw className={isDiagnosing ? 'spinner' : ''} size={16} style={isDiagnosing ? { animation: 'spin 1s linear infinite' } : {}} />
            {isDiagnosing ? 'Testing...' : 'Refresh'}
          </button>
        </div>

        {/* Services Grid */}
        <div className="services-grid">
          
          {/* Supabase */}
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-name-wrapper">
                <Database className="service-icon" size={20} />
                <h3>Supabase API</h3>
              </div>
              <div className={`status-indicator status-${supabaseStatus}`}>
                <span className="dot pulse"></span>
                {supabaseStatus.charAt(0).toUpperCase() + supabaseStatus.slice(1)}
              </div>
            </div>
            <p style={{ color: '#9CA3B0', fontSize: '0.9rem', minHeight: '40px', margin: '0 0 16px' }}>
              {supabaseDetails || 'Testing database connection...'}
            </p>
            <div className="service-details">
              <div className="metric-row">
                <span className="metric-label">Service Type</span>
                <span className="metric-value">Database & Auth</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Latency</span>
                <span className="metric-value latency">
                  {supabaseLatency ? `${supabaseLatency} ms` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* TMDB */}
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-name-wrapper">
                <Film className="service-icon" size={20} />
                <h3>TMDB API</h3>
              </div>
              <div className={`status-indicator status-${tmdbStatus}`}>
                <span className="dot pulse"></span>
                {tmdbStatus.charAt(0).toUpperCase() + tmdbStatus.slice(1)}
              </div>
            </div>
            <p style={{ color: '#9CA3B0', fontSize: '0.9rem', minHeight: '40px', margin: '0 0 16px' }}>
              {tmdbDetails || 'Testing movie API connection...'}
            </p>
            <div className="service-details">
              <div className="metric-row">
                <span className="metric-label">Service Type</span>
                <span className="metric-value">Metadata Catalog</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Latency</span>
                <span className="metric-value latency">
                  {tmdbLatency ? `${tmdbLatency} ms` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Scraper Server */}
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-name-wrapper">
                <Server className="service-icon" size={20} />
                <h3>Scraper Server</h3>
              </div>
              <div className={`status-indicator status-${scraperStatus}`}>
                <span className="dot pulse"></span>
                {scraperStatus.charAt(0).toUpperCase() + scraperStatus.slice(1)}
              </div>
            </div>
            <p style={{ color: '#9CA3B0', fontSize: '0.9rem', minHeight: '40px', margin: '0 0 16px' }}>
              {scraperDetails || 'Testing media resolver server...'}
            </p>
            <div className="service-details">
              <div className="metric-row">
                <span className="metric-label">Service Type</span>
                <span className="metric-value">Video Stream Resolver</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Latency</span>
                <span className="metric-value latency">
                  {scraperLatency ? `${scraperLatency} ms` : '--'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Console / Terminal Output */}
        <div className="diagnostics-panel">
          <div className="diagnostics-panel-header">
            <h3>
              <Terminal size={18} />
              Diagnostic Console
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#9CA3B0' }}>Client-safe diagnostic stream</span>
          </div>
          <div className="terminal-screen">
            {consoleLines.length === 0 ? (
              <div className="terminal-line info">Ready to run diagnostics...</div>
            ) : (
              consoleLines.map((line, idx) => (
                <div key={idx} className={`terminal-line ${line.type}`}>
                  [{line.timestamp}] {line.text}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Back Button */}
        <div className="status-back">
          <Link to="/" className="btn-back">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
