import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchTrending, fetchDetails } from '../services/tmdb';
import { supabase } from '../services/supabaseClient';
import './Hero.css';

const ROTATE_INTERVAL = 8000;

const contentVariants = {
  enter: { opacity: 0, y: 30 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.4, ease: 'easeIn' },
  },
};

const backdropVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.6, ease: 'easeIn' } },
};

export default function Hero() {
  const [featured, setFeatured] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef(null);
  const { openModal } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const loadHero = async () => {
      try {
        const { data: configData, error: configError } = await supabase
          .from('watch_parties')
          .select('*')
          .eq('room_code', 'SYSTEM_HERO_MEDIA')
          .single();

        if (!configError && configData && configData.room_name) {
          const [mediaType, mediaId] = configData.room_name.split(':');
          if (mediaId && mediaType) {
            const detailItem = await fetchDetails(mediaId, mediaType);
            if (detailItem) {
              setFeatured([detailItem]);
              return;
            }
          }
        }

        const data = await fetchTrending();
        setFeatured(data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load hero data', err);
        try {
          const data = await fetchTrending();
          setFeatured(data.slice(0, 5));
        } catch {
          // Final fallback catch
        }
      }
    };
    loadHero();
  }, []);

  const currentItem = featured[activeIndex];

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (featured.length === 0) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featured.length);
    }, ROTATE_INTERVAL);
  }, [featured.length]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(intervalRef.current);
  }, [resetTimer]);

  const goTo = (index) => {
    setActiveIndex(index);
    resetTimer();
  };

  if (!featured.length || !currentItem) return <section className="hero" style={{ background: '#141414' }}></section>;

  return (
    <section className="hero">
      <AnimatePresence mode="wait">
        <motion.div
          key={`backdrop-${currentItem.id}`}
          className="hero__backdrop"
          variants={backdropVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          <img
            src={currentItem.backdrop}
            alt=""
            className="hero__backdrop-img ken-burns"
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      <div className="hero__gradient-bottom" />
      <div className="hero__gradient-left" />

      <AnimatePresence mode="wait">
        <motion.div
          key={`content-${currentItem.id}`}
          className="hero__content"
          variants={contentVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          <div className="hero__meta">
            {currentItem.match && (
              <span className="match-score">{currentItem.match}% Match</span>
            )}
            {currentItem.year && (
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                {currentItem.year}
              </span>
            )}
            {currentItem.rating && (
              <span className="maturity-badge">{currentItem.rating}</span>
            )}
          </div>

          <h1 className="hero__title">{currentItem.title}</h1>

          {currentItem.description && (
            <p className="hero__description">{currentItem.description}</p>
          )}

          <div className="hero__actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/watch/${currentItem.type}/${currentItem.id}`)}
            >
              <Play size={22} fill="currentColor" />
              Play
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => openModal(currentItem)}
            >
              <Info size={22} />
              More Info
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {featured.length > 1 && (
        <div className="hero__indicators">
          {featured.map((_, index) => (
            <button
              key={index}
              className={`hero__dot ${index === activeIndex ? 'active' : ''}`}
              onClick={() => goTo(index)}
              aria-label={`Go to featured item ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
