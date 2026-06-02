/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './ContinueWatchingWidget.css';

export default function ContinueWatchingWidget() {
  const { continueWatching } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissedId, setDismissedId] = useState(null);

  // If there's no active profile or watchlist history, show nothing
  const lastWatched = continueWatching && continueWatching[0];

  // Auto-reset dismissal if they watch a different item
  useEffect(() => {
    if (lastWatched) {
      // If we see a new item, clear the dismissal state
      if (dismissedId !== lastWatched.id) {
        setDismissedId(null);
      }
    }
  }, [lastWatched, dismissedId]);

  // Don't show the widget on the Watch page itself (it's distracting/redundant)
  const isWatchPage = location.pathname.includes('/watch/');

  if (!lastWatched || isWatchPage || dismissedId === lastWatched.id) {
    return null;
  }

  const handleResume = () => {
    const mediaType = lastWatched.type === 'series' ? 'series' : 'movie';
    let path = `/watch/${mediaType}/${lastWatched.id}`;
    
    // Add season and episode params for series if they exist
    if (lastWatched.type === 'series') {
      const s = lastWatched.season || 1;
      const e = lastWatched.episode || 1;
      path += `?s=${s}&e=${e}`;
    }
    
    navigate(path);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    setDismissedId(lastWatched.id);
  };

  // Determine media label
  const labelText = lastWatched.type === 'series' 
    ? `Continue Series` 
    : `Resume Movie`;

  // Format subtitle
  const subtitleText = lastWatched.type === 'series' && lastWatched.season
    ? `S${lastWatched.season} E${lastWatched.episode}`
    : 'Movie';

  return (
    <AnimatePresence>
      <motion.div
        className="continue-watching-widget glass"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="cww-content">
          <button className="cww-close-btn" onClick={handleClose} aria-label="Dismiss">
            <X size={14} />
          </button>
          
          {lastWatched.poster ? (
            <img 
              src={`https://image.tmdb.org/t/p/w200${lastWatched.poster}`} 
              alt={lastWatched.title} 
              className="cww-poster"
            />
          ) : (
            <div className="cww-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={20} className="text-secondary" />
            </div>
          )}

          <div className="cww-info">
            <span className="cww-label">{labelText}</span>
            <h4 className="cww-title" title={lastWatched.title}>{lastWatched.title}</h4>
            <span className="cww-subtitle">{subtitleText}</span>
            
            <div className="cww-actions">
              <button className="btn btn-primary cww-resume-btn" onClick={handleResume}>
                <Play size={10} /> Resume
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {lastWatched.progress !== undefined && (
          <div className="cww-progress-container">
            <div 
              className="cww-progress-bar" 
              style={{ width: `${lastWatched.progress}%` }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
