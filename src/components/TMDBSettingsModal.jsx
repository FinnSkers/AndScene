/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Info, HelpCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './TMDBSettingsModal.css';

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 25 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 15,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

export default function TMDBSettingsModal() {
  const { isTMDBSettingsOpen, setIsTMDBSettingsOpen, showToast } = useApp();
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState('global'); // 'global' | 'custom'
  const [cineProInput, setCineProInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load existing configuration on open
  useEffect(() => {
    if (isTMDBSettingsOpen) {
      const stored = localStorage.getItem('user_tmdb_api_key') || '';
      const storedCinePro = localStorage.getItem('user_cinepro_server_url') || '';
      setKeyInput(stored);
      setCineProInput(storedCinePro);
      setKeyStatus(stored ? 'custom' : 'global');
      setError('');
      setSuccess(false);
    }
  }, [isTMDBSettingsOpen]);

  if (!isTMDBSettingsOpen) return null;

  const handleSaveAndTest = async (e) => {
    e.preventDefault();
    setTesting(true);
    setError('');
    setSuccess(false);

    const trimmedKey = keyInput.trim();
    const trimmedCinePro = cineProInput.trim();

    if (trimmedCinePro) {
      localStorage.setItem('user_cinepro_server_url', trimmedCinePro);
    } else {
      localStorage.removeItem('user_cinepro_server_url');
    }

    if (!trimmedKey) {
      // Revert to global free key
      localStorage.removeItem('user_tmdb_api_key');
      setKeyStatus('global');
      setSuccess(true);
      showToast('Settings saved successfully.');
      setTimeout(() => {
        setIsTMDBSettingsOpen(false);
      }, 1000);
      setTesting(false);
      return;
    }

    try {
      // Validate key by querying TMDB configuration endpoint
      const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${trimmedKey}`);
      if (!response.ok) {
        throw new Error('API request failed. Verify your key structure.');
      }
      
      // Save custom key
      localStorage.setItem('user_tmdb_api_key', trimmedKey);
      setKeyStatus('custom');
      setSuccess(true);
      showToast('Custom TMDB API connected successfully!');
      
      // Short delay for visual success indicator feedback
      setTimeout(() => {
        setIsTMDBSettingsOpen(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError('Connection check failed. Ensure the key is correct and not your v3 read-only token.');
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('user_tmdb_api_key');
    localStorage.removeItem('user_cinepro_server_url');
    setKeyInput('');
    setCineProInput('');
    setKeyStatus('global');
    setError('');
    setSuccess(false);
    showToast('Reverted to default system settings.');
    setIsTMDBSettingsOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="tmdb-settings-portal">
        {/* Backdrop */}
        <motion.div 
          className="tmdb-modal-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={() => setIsTMDBSettingsOpen(false)}
        />

        {/* Modal Window */}
        <motion.div 
          className="tmdb-modal-card glass"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Close button */}
          <button 
            type="button" 
            className="tmdb-close-btn"
            onClick={() => setIsTMDBSettingsOpen(false)}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="tmdb-modal-header">
            <div className="header-icon-wrap">
              <Key size={24} className="text-secondary" />
            </div>
            <h2>TMDB API Connections</h2>
            <p>Customize your movie/show indexing connection to avoid global rate limits.</p>
          </div>

          {/* Current Status Badge */}
          <div className={`connection-status-banner ${keyStatus}`}>
            <Info size={14} />
            <span>
              {keyStatus === 'global' 
                ? 'Using Shared Global Free Key (Rate limits apply across users)' 
                : 'Using Custom Personal Key (Connected)'
              }
            </span>
          </div>

          {/* Setup Guide */}
          <div className="tmdb-setup-guide">
            <h3><HelpCircle size={14} /> How to get a free personal API key:</h3>
            <ol className="setup-steps">
              <li>
                <span className="step-num">1</span>
                <span className="step-text">Register a free account at <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer">themoviedb.org/signup</a>.</span>
              </li>
              <li>
                <span className="step-num">2</span>
                <span className="step-text">Go to your **Account Settings** (click your profile icon) and select **API** in the sidebar.</span>
              </li>
              <li>
                <span className="step-num">3</span>
                <span className="step-text">Click **Create** under API Key to request a Developer Key. Fill out the brief developer registration details.</span>
              </li>
              <li>
                <span className="step-num">4</span>
                <span className="step-text">Copy your **API Key (v3 auth)** (a 32-character hex code) and paste it below.</span>
              </li>
            </ol>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSaveAndTest} className="tmdb-key-form">
            <div className="input-field-group">
              <label htmlFor="tmdbApiKey">Your TMDB API Key (v3 auth)</label>
              <input 
                id="tmdbApiKey"
                type="text" 
                placeholder="e.g. 8fca932e650db818290fa83c..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                autoFocus
              />
            </div>

            <div className="input-field-group" style={{ marginTop: '16px' }}>
              <label htmlFor="cineproServerUrl">CinePro Core Resolver Server URL</label>
              <input 
                id="cineproServerUrl"
                type="url" 
                placeholder="e.g. http://localhost:3000"
                value={cineProInput}
                onChange={(e) => setCineProInput(e.target.value)}
              />
              <span className="input-helper-text" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                Run your local CinePro Core server instance to stream direct, ad-free video streams (.mp4 / .m3u8).
              </span>
            </div>

            {error && (
              <div className="settings-error-banner animate-fade-in">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="settings-success-banner animate-fade-in">
                <CheckCircle size={14} />
                <span>Verification successful! Connection established.</span>
              </div>
            )}

            <div className="form-buttons-row">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={testing}
              >
                {testing ? (
                  <><Loader2 className="spinner" size={16} /> Verifying...</>
                ) : (
                  'Connect API Key'
                )}
              </button>
              
              {keyStatus === 'custom' && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleClearKey}
                  disabled={testing}
                >
                  Remove Key
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
