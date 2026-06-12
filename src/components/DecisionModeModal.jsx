import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, RefreshCw, Play, Film, Award } from 'lucide-react';
import { discoverMovies, discoverSeries, fetchTrending } from '../services/tmdb';
import './DecisionModeModal.css';

const MOODS = [
  {
    id: 'adrenaline',
    name: 'Adrenaline Rush',
    emoji: '💥',
    description: 'Action, adventure, and high stakes.',
    genres: [28, 12, 53], // Action, Adventure, Thriller
  },
  {
    id: 'cozy',
    name: 'Chilled & Cozy',
    emoji: '☕',
    description: 'Lighthearted comedy and romance.',
    genres: [35, 10749], // Comedy, Romance
  },
  {
    id: 'mindbending',
    name: 'Mind-Bending',
    emoji: '🧠',
    description: 'Mystery, Sci-Fi, and puzzles.',
    genres: [9648, 878], // Mystery, Sci-Fi
  },
  {
    id: 'spooky',
    name: 'Spooky Night',
    emoji: '👻',
    description: 'Thrilling horror and dark suspense.',
    genres: [27, 53], // Horror, Thriller
  },
  {
    id: 'family',
    name: 'Family Time',
    emoji: '🍿',
    description: 'Great for everyone to watch.',
    genres: [16, 10751], // Animation, Family
  }
];

export default function DecisionModeModal({ isOpen, onClose, onSelectContent }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [mediaType, setMediaType] = useState('movie'); // 'movie' | 'tv'

  const handleSelectMood = async (mood) => {
    setSelectedMood(mood);
    setLoading(true);
    setRecommendations([]);
    
    try {
      let results = [];
      const randomPage = Math.floor(Math.random() * 3) + 1; // Randomize page to avoid seeing the same titles
      
      const genresStr = mood.genres.join(',');
      
      if (mediaType === 'movie') {
        results = await discoverMovies({
          with_genres: genresStr,
          page: randomPage,
          sort_by: 'vote_average.desc',
          'vote_count.gte': 100, // Make sure it's decently rated
        });
      } else {
        results = await discoverSeries({
          with_genres: genresStr,
          page: randomPage,
          sort_by: 'vote_average.desc',
          'vote_count.gte': 100,
        });
      }
      
      // Shuffle results and select 3
      const shuffled = [...results].sort(() => 0.5 - Math.random());
      setRecommendations(shuffled.slice(0, 3));
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPick = async () => {
    setSelectedMood({ name: 'Quick Pick', emoji: '🎲' });
    setLoading(true);
    setRecommendations([]);
    
    try {
      const randomPage = Math.floor(Math.random() * 5) + 1;
      const trending = await fetchTrending(randomPage);
      
      const shuffled = [...trending].sort(() => 0.5 - Math.random());
      setRecommendations(shuffled.slice(0, 3));
    } catch (err) {
      console.error('Error fetching quick pick:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedMood(null);
    setRecommendations([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="decision-modal-overlay" onClick={onClose}>
        <motion.div 
          className="decision-modal-content glass"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        >
          <button className="decision-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>

          <div className="decision-modal-header">
            <Sparkles className="sparkles-icon" size={24} />
            <h2>Decision Mode</h2>
            <p>Can't decide what to watch? Tell us your vibe or take a random pick.</p>
          </div>

          {/* Toggle Type Selector */}
          {!selectedMood && (
            <div className="media-type-toggle glass">
              <button 
                className={`type-toggle-btn ${mediaType === 'movie' ? 'active' : ''}`}
                onClick={() => setMediaType('movie')}
              >
                Movies
              </button>
              <button 
                className={`type-toggle-btn ${mediaType === 'tv' ? 'active' : ''}`}
                onClick={() => setMediaType('tv')}
              >
                TV Series
              </button>
            </div>
          )}

          {!selectedMood ? (
            <div className="mood-selection-grid">
              {MOODS.map((mood) => (
                <button 
                  key={mood.id}
                  className="mood-card glass"
                  onClick={() => handleSelectMood(mood)}
                >
                  <span className="mood-emoji">{mood.emoji}</span>
                  <div className="mood-details">
                    <h3>{mood.name}</h3>
                    <p>{mood.description}</p>
                  </div>
                </button>
              ))}

              <button className="mood-card glass quick-pick-card" onClick={handleQuickPick}>
                <span className="mood-emoji">🎲</span>
                <div className="mood-details">
                  <h3>Surprise Me!</h3>
                  <p>A random trending pick across everything.</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="recommendations-container">
              <div className="selected-mood-banner glass">
                <span className="mood-banner-emoji">{selectedMood.emoji}</span>
                <div>
                  <h3>Vibe: {selectedMood.name}</h3>
                  <p>Recommended matching {mediaType === 'movie' ? 'movies' : 'tv series'}</p>
                </div>
                <button className="reset-mood-btn glass" onClick={handleReset}>
                  <RefreshCw size={16} /> Change Vibe
                </button>
              </div>

              {loading ? (
                <div className="recs-loading">
                  <div className="spinner-glow"></div>
                  <span>Shuffling the deck...</span>
                </div>
              ) : (
                <div className="recs-grid">
                  {recommendations.map((item, idx) => (
                    <motion.div 
                      key={item.id}
                      className="rec-card glass"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                    >
                      <div className="rec-card-image-wrapper">
                        <img src={item.backdrop || item.poster} alt={item.title} />
                        <div className="rec-card-badge">
                          <Award size={14} />
                          <span>{item.match}% Match</span>
                        </div>
                      </div>
                      <div className="rec-card-info">
                        <h4>{item.title}</h4>
                        <p className="rec-card-meta">{item.year} &bull; {item.genre?.slice(0, 2).join(', ')}</p>
                        <p className="rec-card-desc">{item.description}</p>
                        <button 
                          className="rec-watch-btn"
                          onClick={() => {
                            onSelectContent(item);
                            onClose();
                          }}
                        >
                          <Play size={14} fill="currentColor" /> Watch Now
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
