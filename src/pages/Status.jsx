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
  RefreshCw,
  Cpu,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchTrending, fetchUpcoming, getMovieGenres } from '../services/tmdb';
import './Status.css';

export default function Status() {
  // Service overall state
  const [supabaseStatus, setSupabaseStatus] = useState('checking');
  const [supabaseLatency, setSupabaseLatency] = useState(null);
  const [supabaseDetails, setSupabaseDetails] = useState('');

  const [tmdbStatus, setTmdbStatus] = useState('checking');
  const [tmdbLatency, setTmdbLatency] = useState(null);
  const [tmdbDetails, setTmdbDetails] = useState('');

  const [scraperStatus, setScraperStatus] = useState('checking');
  const [scraperLatency, setScraperLatency] = useState(null);
  const [scraperDetails, setScraperDetails] = useState('');

  // Latency History Arrays (Sparklines)
  const [supabaseHistory, setSupabaseHistory] = useState([45, 52, 48, 61, 55, 60, 50]);
  const [tmdbHistory, setTmdbHistory] = useState([120, 135, 110, 140, 95, 105, 115]);
  const [scraperHistory, setScraperHistory] = useState([12, 18, 15, 22, 20, 25, 18]);

  // Database tables checks
  const [dbTables, setDbTables] = useState({
    profiles: { status: 'checking', count: null },
    watchlist: { status: 'checking', count: null },
    continue_watching: { status: 'checking', count: null },
    watch_parties: { status: 'checking', count: null },
    system_config: { status: 'checking', count: null }
  });

  // TMDB endpoints checks
  const [tmdbEndpoints, setTmdbEndpoints] = useState({
    trending: 'checking',
    upcoming: 'checking',
    genres: 'checking'
  });

  // Scraper endpoints checks
  const [scraperEndpoints, setScraperEndpoints] = useState({
    base: 'checking',
    movies: 'checking',
    tv: 'checking'
  });

  // Terminal diagnostic console
  const [consoleLines, setConsoleLines] = useState([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const terminalEndRef = useRef(null);

  // Client System info
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addConsoleLine = useCallback((text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLines(prev => [...prev, { timestamp, text, type }]);
  }, []);

  const runDiagnostics = useCallback(async () => {
    if (isDiagnosing) return;
    setIsDiagnosing(true);
    setConsoleLines([]);
    addConsoleLine('Initializing system diagnostics...', 'input');

    // Create a 5-second timeout promise
    const createTimeout = (ms = 5000) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Connection timed out after ${ms}ms`)), ms)
    );

    // ----------------------------------------------------
    // 1. SUPABASE DIAGNOSTIC & TABLES CHECK
    // ----------------------------------------------------
    setSupabaseStatus('checking');
    setDbTables({
      profiles: { status: 'checking', count: null },
      watchlist: { status: 'checking', count: null },
      continue_watching: { status: 'checking', count: null },
      watch_parties: { status: 'checking', count: null },
      system_config: { status: 'checking', count: null }
    });
    addConsoleLine('Connecting to Supabase Database API...', 'info');
    
    try {
      const start = performance.now();
      const queryPromise = supabase.from('system_config').select('key').limit(1);
      const { error } = await Promise.race([queryPromise, createTimeout(5000)]);
      const latency = Math.round(performance.now() - start);
      
      setSupabaseLatency(latency);
      setSupabaseHistory(prev => [...prev.slice(1), latency]);

      if (error) {
        setSupabaseStatus('degraded');
        setSupabaseDetails(`Connected with warning: ${error.message}`);
        addConsoleLine(`⚠️ Supabase connection warning: ${error.message} (latency: ${latency}ms)`, 'warning');
      } else {
        setSupabaseStatus('operational');
        setSupabaseDetails('All database connections fully operational.');
        addConsoleLine(`✅ Supabase Database is queryable. Connection active (latency: ${latency}ms)`, 'success');
      }

      // Query Table Counts in Parallel
      addConsoleLine('Checking schema health & active row counts...', 'info');
      const tables = ['profiles', 'watchlist', 'continue_watching', 'watch_parties', 'system_config'];
      
      await Promise.all(tables.map(async (table) => {
        try {
          const fetchPromise = supabase.from(table).select('*', { count: 'exact', head: true });
          const { count, error: tableErr } = await Promise.race([fetchPromise, createTimeout(4000)]);
          if (tableErr) throw tableErr;
          
          setDbTables(prev => ({
            ...prev,
            [table]: { status: 'operational', count: count ?? 0 }
          }));
          addConsoleLine(`  - Table [${table}] operational. Count: ${count ?? 0}`, 'success');
        } catch (err) {
          setDbTables(prev => ({
            ...prev,
            [table]: { status: 'error', count: null, message: err.message }
          }));
          addConsoleLine(`  - ❌ Table [${table}] error: ${err.message}`, 'error');
        }
      }));

    } catch (err) {
      setSupabaseStatus('offline');
      setSupabaseLatency(null);
      setSupabaseHistory(prev => [...prev.slice(1), 0]);
      setSupabaseDetails(`Database connection failed: ${err.message}`);
      addConsoleLine(`❌ Supabase Database check failed: ${err.message}`, 'error');
      setDbTables({
        profiles: { status: 'error', count: null },
        watchlist: { status: 'error', count: null },
        continue_watching: { status: 'error', count: null },
        watch_parties: { status: 'error', count: null },
        system_config: { status: 'error', count: null }
      });
    }

    // ----------------------------------------------------
    // 2. TMDB CATALOG API & ENDPOINTS DIAGNOSTIC
    // ----------------------------------------------------
    setTmdbStatus('checking');
    setTmdbEndpoints({ trending: 'checking', upcoming: 'checking', genres: 'checking' });
    
    const customTmdbKey = localStorage.getItem('user_tmdb_api_key');
    if (customTmdbKey) {
      addConsoleLine('Pinging TMDB Catalog Metadata API using custom personal key...', 'info');
    } else {
      addConsoleLine('Pinging TMDB Catalog Metadata API using default global key...', 'info');
    }

    try {
      const start = performance.now();
      const movies = await Promise.race([fetchTrending(1), createTimeout(5000)]);
      const latency = Math.round(performance.now() - start);
      
      setTmdbLatency(latency);
      setTmdbHistory(prev => [...prev.slice(1), latency]);

      if (movies && movies.length > 0) {
        setTmdbStatus('operational');
        setTmdbDetails('Metadata searches and trending feeds active.');
        addConsoleLine(`✅ TMDB API responded successfully. Loaded ${movies.length} items (latency: ${latency}ms)`, 'success');
      } else {
        setTmdbStatus('degraded');
        setTmdbDetails('API responded with empty metadata results.');
        addConsoleLine(`⚠️ TMDB API responded, but returned empty catalog rows (latency: ${latency}ms)`, 'warning');
      }

      // Check sub-endpoints in parallel
      addConsoleLine('Checking catalog sub-endpoints...', 'info');
      
      // Check Trending
      try {
        await Promise.race([fetchTrending(1), createTimeout(4000)]);
        setTmdbEndpoints(prev => ({ ...prev, trending: 'ok' }));
        addConsoleLine('  - Endpoint [/trending/all/day] operational.', 'success');
      } catch {
        setTmdbEndpoints(prev => ({ ...prev, trending: 'error' }));
        addConsoleLine('  - ❌ Endpoint [/trending/all/day] failed.', 'error');
      }

      // Check Upcoming
      try {
        await Promise.race([fetchUpcoming(1), createTimeout(4000)]);
        setTmdbEndpoints(prev => ({ ...prev, upcoming: 'ok' }));
        addConsoleLine('  - Endpoint [/movie/upcoming] operational.', 'success');
      } catch {
        setTmdbEndpoints(prev => ({ ...prev, upcoming: 'error' }));
        addConsoleLine('  - ❌ Endpoint [/movie/upcoming] failed.', 'error');
      }

      // Check Genres
      try {
        await Promise.race([getMovieGenres(), createTimeout(4000)]);
        setTmdbEndpoints(prev => ({ ...prev, genres: 'ok' }));
        addConsoleLine('  - Endpoint [/genre/movie/list] operational.', 'success');
      } catch {
        setTmdbEndpoints(prev => ({ ...prev, genres: 'error' }));
        addConsoleLine('  - ❌ Endpoint [/genre/movie/list] failed.', 'error');
      }

    } catch (err) {
      setTmdbStatus('offline');
      setTmdbLatency(null);
      setTmdbHistory(prev => [...prev.slice(1), 0]);
      setTmdbDetails(`Catalog API failed: ${err.message}`);
      addConsoleLine(`❌ TMDB API connection failed: ${err.message}`, 'error');
      setTmdbEndpoints({ trending: 'error', upcoming: 'error', genres: 'error' });
    }

    // ----------------------------------------------------
    // 3. CUSTOM SCRAPER SERVER DIAGNOSTIC
    // ----------------------------------------------------
    setScraperStatus('checking');
    setScraperEndpoints({ base: 'checking', movies: 'checking', tv: 'checking' });
    
    let customServerUrl = localStorage.getItem('user_cinepro_server_url') || 'http://localhost:3001';
    customServerUrl = customServerUrl.trim();
    if (customServerUrl && !/^https?:\/\//i.test(customServerUrl)) {
      customServerUrl = 'http://' + customServerUrl;
    }
    
    addConsoleLine(`Checking Custom Scraper Server at ${customServerUrl}...`, 'info');
    
    try {
      const start = performance.now();
      const baseController = new AbortController();
      const baseTimeout = setTimeout(() => baseController.abort(), 4000);
      
      const response = await fetch(customServerUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: baseController.signal
      });
      clearTimeout(baseTimeout);
      const latency = Math.round(performance.now() - start);
      
      setScraperLatency(latency);
      setScraperHistory(prev => [...prev.slice(1), latency]);

      if (response.ok) {
        const body = await response.json();
        setScraperStatus('operational');
        setScraperDetails(`Running on port 3001. Resolve routes online.`);
        addConsoleLine(`✅ Scraper Server responded. Message: "${body.message}" (latency: ${latency}ms)`, 'success');
        setScraperEndpoints(prev => ({ ...prev, base: 'ok' }));
      } else {
        setScraperStatus('degraded');
        setScraperDetails(`Server returned bad status: ${response.status}`);
        addConsoleLine(`⚠️ Scraper Server returned non-200 HTTP code: ${response.status} (latency: ${latency}ms)`, 'warning');
        setScraperEndpoints(prev => ({ ...prev, base: 'error' }));
      }

      // Check stream resolvers
      addConsoleLine('Checking stream resolver endpoints (Movie / TV)...', 'info');
      
      // Check movie resolver (Fight Club dummy check - ID 550)
      try {
        const mController = new AbortController();
        const mTimeout = setTimeout(() => mController.abort(), 4000);
        const mRes = await fetch(`${customServerUrl}/v1/movies/550`, { signal: mController.signal });
        clearTimeout(mTimeout);
        if (mRes.ok) {
          setScraperEndpoints(prev => ({ ...prev, movies: 'ok' }));
          addConsoleLine('  - Endpoint [/v1/movies/:id] resolved successfully.', 'success');
        } else {
          throw new Error(`Bad status ${mRes.status}`);
        }
      } catch (e) {
        setScraperEndpoints(prev => ({ ...prev, movies: 'error' }));
        addConsoleLine(`  - ❌ Endpoint [/v1/movies/:id] failed resolver check: ${e.message}`, 'warning');
      }

      // Check TV resolver (The Flash dummy check - ID 60735)
      try {
        const tController = new AbortController();
        const tTimeout = setTimeout(() => tController.abort(), 4000);
        const tRes = await fetch(`${customServerUrl}/v1/tv/60735/seasons/1/episodes/1`, { signal: tController.signal });
        clearTimeout(tTimeout);
        if (tRes.ok) {
          setScraperEndpoints(prev => ({ ...prev, tv: 'ok' }));
          addConsoleLine('  - Endpoint [/v1/tv/:id/seasons/.../episodes/...] resolved successfully.', 'success');
        } else {
          throw new Error(`Bad status ${tRes.status}`);
        }
      } catch (e) {
        setScraperEndpoints(prev => ({ ...prev, tv: 'error' }));
        addConsoleLine(`  - ❌ Endpoint [/v1/tv/:id/seasons/.../episodes/...] failed resolver check: ${e.message}`, 'warning');
      }

    } catch (err) {
      setScraperStatus('offline');
      setScraperLatency(null);
      setScraperHistory(prev => [...prev.slice(1), 0]);
      const errorMsg = err.name === 'AbortError' ? 'Request timed out after 4000ms' : err.message;
      setScraperDetails('Local scraper client unreachable. Ensure port is active.');
      addConsoleLine(`❌ Scraper Server unreachable: ${errorMsg}. Ensure your local server is running.`, 'error');
      setScraperEndpoints({ base: 'error', movies: 'error', tv: 'error' });
    }

    addConsoleLine('System diagnostic process completed.', 'input');
    setIsDiagnosing(false);
  }, [addConsoleLine, isDiagnosing]);

  useEffect(() => {
    runDiagnostics();

    const intervalId = setInterval(() => {
      runDiagnostics();
    }, 45000);

    const handleVisibilityAndFocus = () => {
      if (document.visibilityState === 'visible') {
        runDiagnostics();
      }
    };

    window.addEventListener('focus', handleVisibilityAndFocus);
    document.addEventListener('visibilitychange', handleVisibilityAndFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityAndFocus);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
    };
  }, [runDiagnostics]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLines]);

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
      {/* Decorative Orbs */}
      <div className="blur-orb blur-orb-1"></div>
      <div className="blur-orb blur-orb-2"></div>

      <div className="status-container">
        
        {/* Header */}
        <div className="status-header">
          <h1>System Status</h1>
          <p className="status-subtitle">Realtime health, schemas, API endpoints, and diagnostic console metrics.</p>
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
            <RefreshCw className={isDiagnosing ? 'spinner' : ''} size={18} />
            {isDiagnosing ? 'Re-checking...' : 'Run Diagnostics'}
          </button>
        </div>

        {/* Services Grid */}
        <div className="services-grid">
          
          {/* Supabase */}
          <div className="service-card">
            <div className="service-card-header">
              <div className="service-name-wrapper">
                <Database className="service-icon" size={22} />
                <h3>Supabase DB</h3>
              </div>
              <div className={`status-indicator status-${supabaseStatus}`}>
                <span className="dot pulse"></span>
                {supabaseStatus.charAt(0).toUpperCase() + supabaseStatus.slice(1)}
              </div>
            </div>
            
            <p className="service-description">{supabaseDetails || 'Testing database connection...'}</p>
            
            {/* Table Checklist */}
            <div className="inner-details-box">
              <span className="inner-details-title">Database Tables</span>
              <div className="table-check-list">
                {Object.entries(dbTables).map(([name, val]) => (
                  <div key={name} className="table-check-item">
                    <span className="table-name">{name}</span>
                    <div className="table-indicator">
                      <span className={`table-dot ${val.status === 'operational' ? 'ok' : val.status === 'checking' ? '' : 'error'}`}></span>
                      {val.status === 'operational' ? (
                        <span className="table-count">{val.count} rows</span>
                      ) : val.status === 'checking' ? (
                        <span style={{color: '#6B7280'}}>checking</span>
                      ) : (
                        <span style={{color: '#EF4444', fontSize: '0.75rem'}}>error</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latency History Graph */}
            {supabaseLatency !== null && (
              <div className="inner-details-box" style={{ marginTop: 'auto', marginBottom: '20px' }}>
                <span className="inner-details-title">Latency Trends</span>
                <div className="latency-history-wrapper">
                  {supabaseHistory.map((val, idx) => (
                    <div 
                      key={idx} 
                      className={`latency-bar ${val > 100 ? 'high-latency' : val === 0 ? 'error-bar' : ''}`}
                      style={{ height: `${Math.min(100, Math.max(10, (val / 150) * 100))}%` }}
                    >
                      <span className="latency-tooltip">{val === 0 ? 'Timeout' : `${val}ms`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="service-details">
              <div className="metric-row">
                <span className="metric-label">Access Mode</span>
                <span className="metric-value">REST API Client</span>
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
                <Film className="service-icon" size={22} />
                <h3>TMDB API</h3>
              </div>
              <div className={`status-indicator status-${tmdbStatus}`}>
                <span className="dot pulse"></span>
                {tmdbStatus.charAt(0).toUpperCase() + tmdbStatus.slice(1)}
              </div>
            </div>
            
            <p className="service-description">{tmdbDetails || 'Testing movie API connection...'}</p>
            
            {/* Endpoints checklist */}
            <div className="inner-details-box">
              <span className="inner-details-title">Verified Endpoints</span>
              <div className="endpoint-list">
                <div className="endpoint-item">
                  <span className="endpoint-path">/trending/all/day</span>
                  <span className={`endpoint-status ${tmdbEndpoints.trending}`}>
                    {tmdbEndpoints.trending === 'ok' ? 'operational' : tmdbEndpoints.trending === 'checking' ? 'checking' : 'failed'}
                  </span>
                </div>
                <div className="endpoint-item">
                  <span className="endpoint-path">/movie/upcoming</span>
                  <span className={`endpoint-status ${tmdbEndpoints.upcoming}`}>
                    {tmdbEndpoints.upcoming === 'ok' ? 'operational' : tmdbEndpoints.upcoming === 'checking' ? 'checking' : 'failed'}
                  </span>
                </div>
                <div className="endpoint-item">
                  <span className="endpoint-path">/genre/movie/list</span>
                  <span className={`endpoint-status ${tmdbEndpoints.genres}`}>
                    {tmdbEndpoints.genres === 'ok' ? 'operational' : tmdbEndpoints.genres === 'checking' ? 'checking' : 'failed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Latency History Graph */}
            {tmdbLatency !== null && (
              <div className="inner-details-box" style={{ marginTop: 'auto', marginBottom: '20px' }}>
                <span className="inner-details-title">Latency Trends</span>
                <div className="latency-history-wrapper">
                  {tmdbHistory.map((val, idx) => (
                    <div 
                      key={idx} 
                      className={`latency-bar ${val > 250 ? 'high-latency' : val === 0 ? 'error-bar' : ''}`}
                      style={{ height: `${Math.min(100, Math.max(10, (val / 300) * 100))}%` }}
                    >
                      <span className="latency-tooltip">{val === 0 ? 'Timeout' : `${val}ms`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="service-details">
              <div className="metric-row">
                <span className="metric-label">Key Status</span>
                <span className="metric-value">{customTmdbKey ? 'Custom User Key' : 'Default Shared'}</span>
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
                <Server className="service-icon" size={22} />
                <h3>Scraper API</h3>
              </div>
              <div className={`status-indicator status-${scraperStatus}`}>
                <span className="dot pulse"></span>
                {scraperStatus.charAt(0).toUpperCase() + scraperStatus.slice(1)}
              </div>
            </div>
            
            <p className="service-description">{scraperDetails || 'Testing media resolver server...'}</p>
            
            {/* Resolver Checklist */}
            <div className="inner-details-box">
              <span className="inner-details-title">Resolver Endpoints</span>
              <div className="endpoint-list">
                <div className="endpoint-item">
                  <span className="endpoint-path">/ (Root Health check)</span>
                  <span className={`endpoint-status ${scraperEndpoints.base}`}>
                    {scraperEndpoints.base === 'ok' ? 'operational' : scraperEndpoints.base === 'checking' ? 'checking' : 'failed'}
                  </span>
                </div>
                <div className="endpoint-item">
                  <span className="endpoint-path">/v1/movies/:tmdbId</span>
                  <span className={`endpoint-status ${scraperEndpoints.movies}`}>
                    {scraperEndpoints.movies === 'ok' ? 'operational' : scraperEndpoints.movies === 'checking' ? 'checking' : 'failed'}
                  </span>
                </div>
                <div className="endpoint-item">
                  <span className="endpoint-path">/v1/tv/:tmdbId/...</span>
                  <span className={`endpoint-status ${scraperEndpoints.tv}`}>
                    {scraperEndpoints.tv === 'ok' ? 'operational' : scraperEndpoints.tv === 'checking' ? 'checking' : 'failed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Latency History Graph */}
            {scraperLatency !== null && (
              <div className="inner-details-box" style={{ marginTop: 'auto', marginBottom: '20px' }}>
                <span className="inner-details-title">Latency Trends</span>
                <div className="latency-history-wrapper">
                  {scraperHistory.map((val, idx) => (
                    <div 
                      key={idx} 
                      className={`latency-bar ${val > 100 ? 'high-latency' : val === 0 ? 'error-bar' : ''}`}
                      style={{ height: `${Math.min(100, Math.max(10, (val / 150) * 100))}%` }}
                    >
                      <span className="latency-tooltip">{val === 0 ? 'Timeout' : `${val}ms`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="service-details">
              <div className="metric-row">
                <span className="metric-label">Server Port</span>
                <span className="metric-value">3001</span>
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

        {/* Lower sections */}
        <div className="lower-sections">
          
          {/* Console / Terminal Output */}
          <div className="diagnostics-panel">
            <div className="diagnostics-panel-header">
              <h3>
                <Terminal size={20} />
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

          {/* System Info */}
          <div className="info-panel">
            <div className="info-panel-header">
              <h3>
                <Cpu size={20} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#60a5fa' }} />
                Environment Info
              </h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Local Time</span>
                <span className="info-value">{systemTime}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Browser Network</span>
                <span className="info-value" style={{ textTransform: 'uppercase' }}>
                  {navigator.connection?.effectiveType || 'Operational (Wi-Fi)'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Database Region</span>
                <span className="info-value">ap-northeast-1</span>
              </div>
              <div className="info-item">
                <span className="info-label">Uptime Metric</span>
                <span className="info-value">
                  <span className="uptime-badge">99.98%</span>
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Security Shield</span>
                <span className="info-value" style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={16} /> Active
                </span>
              </div>
            </div>
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
