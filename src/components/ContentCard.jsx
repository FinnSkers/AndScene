import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Check, ThumbsUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchTrailer } from '../services/tmdb';
import './ContentCard.css';

export default function ContentCard({ item, index = 0, isTop10 = false, showProgress = false }) {
  const { toggleMyList, isInMyList, openModal } = useApp();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const hoverTimeout = useRef(null);

  const inList = isInMyList(item.id);

  const handleCardClick = () => openModal(item);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    navigate(`/watch/${item.type || 'movie'}/${item.id}`);
  };

  const imageSrc = isTop10
    ? (item.poster || item.backdrop)
    : (item.backdrop || item.poster);

  // Delayed hover to avoid flicker on fast mouse movements
  const onMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => setIsHovered(true), 200);
  };
  const onMouseLeave = () => {
    clearTimeout(hoverTimeout.current);
    setIsHovered(false);
  };

  // Fetch trailer when hovered for 1.5s
  useEffect(() => {
    let timeout;
    if (isHovered) {
      timeout = setTimeout(async () => {
        if (!trailerKey) {
          const key = await fetchTrailer(item.id, item.type || 'movie');
          if (key) setTrailerKey(key);
        }
      }, 1500);
    }
    return () => clearTimeout(timeout);
  }, [isHovered, item.id, item.type, trailerKey]);

  const cardClass = [
    'content-card',
    isTop10 ? 'content-card--top10' : '',
  ].filter(Boolean).join(' ');

  return (
    <motion.div
      className={cardClass}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={handleCardClick}
    >
      {/* Top 10 rank number */}
      {isTop10 && (
        <div className="content-card__rank">
          <span className="content-card__rank-number">{index + 1}</span>
        </div>
      )}

      {/* Card wrapper — this is what scales up on hover */}
      <div
        className="content-card__wrapper"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Thumbnail */}
        <div className="content-card__image-container">
          <img
            className={`content-card__image ${imgLoaded ? 'loaded' : 'loading'}`}
            src={imageSrc}
            alt={item.title || item.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />

          {/* Title overlay on thumbnail */}
          <div className="content-card__title-overlay">
            <span className="content-card__title">{item.title || item.name}</span>
          </div>

          {/* Progress bar */}
          {showProgress && item.progress != null && (
            <div className="content-card__progress">
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Hover popout info panel */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="content-card__info"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Inline trailer if loaded */}
              {trailerKey && (
                <div className="content-card__trailer-container">
                  <iframe
                    className="content-card__video"
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailerKey}&fs=0`}
                    title="Trailer"
                    allow="autoplay; encrypted-media"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="content-card__actions">
                <button className="content-card__play-btn" onClick={handlePlayClick} aria-label="Play">
                  <Play size={14} fill="currentColor" />
                </button>
                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); toggleMyList(item); }} aria-label="My List">
                  {inList ? <Check size={14} /> : <Plus size={14} />}
                </button>
                <button className="btn-icon" onClick={(e) => e.stopPropagation()} aria-label="Like">
                  <ThumbsUp size={14} />
                </button>
                <span className="content-card__actions-spacer" />
                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); openModal(item); }} aria-label="More Info">
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Meta line */}
              <div className="content-card__meta">
                {(item.voteAverage || item.match) && (
                  <span className="content-card__match">
                    ⭐ {item.voteAverage || (item.match / 10).toFixed(1)}
                  </span>
                )}
                {item.rating && <span className="content-card__rating">{item.rating}</span>}
                {item.year && <span className="content-card__year">{item.year}</span>}
              </div>

              {/* Genre tags */}
              {item.genres && item.genres.length > 0 && (
                <div className="content-card__genres">
                  {item.genres.slice(0, 3).map((g, i) => (
                    <span key={i}>
                      {g}{i < Math.min(item.genres.length, 3) - 1 && <span className="dot">•</span>}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
