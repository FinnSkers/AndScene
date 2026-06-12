import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Plus, Check, Flame } from 'lucide-react';
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
    transition: { duration: 0.6, ease: 'easeOut', staggerChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.4, ease: 'easeIn' },
  },
};

const childVariants = {
  enter: { opacity: 0, y: 15 },
  center: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
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
  const heroRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const { openModal, myList, toggleMyList } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const loadHero = async () => {
      try {
        const { data: configData, error: configError } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'SYSTEM_HERO_MEDIA')
          .single();

        if (!configError && configData && configData.value) {
          const [mediaType, mediaId] = configData.value.split(':');
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

  /* Parallax on mouse move */
  const handleMouseMove = useCallback((e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  const isInList = currentItem && myList.some(item => item.id === currentItem.id);

  if (!featured.length || !currentItem) return <section className="hero" style={{ background: '#141414' }}></section>;

  const parallaxX = (mousePos.x - 0.5) * -15;
  const parallaxY = (mousePos.y - 0.5) * -10;

  return (
    <section className="hero" ref={heroRef} onMouseMove={handleMouseMove}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`backdrop-${currentItem.id}`}
          className="hero__backdrop"
          variants={backdropVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{
            transform: `translate(${parallaxX}px, ${parallaxY}px) scale(1.05)`,
          }}
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
      {/* Vignette edges */}
      <div className="hero__vignette" />

      <AnimatePresence mode="wait">
        <motion.div
          key={`content-${currentItem.id}`}
          className="hero__content"
          variants={contentVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {/* Trending badge */}
          <motion.div variants={childVariants} className="hero__trending-badge">
            <Flame size={14} />
            <span>#{activeIndex + 1} Trending Today</span>
          </motion.div>

          <motion.div variants={childVariants} className="hero__meta">
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
            {currentItem.type === 'series' && currentItem.seasons && (
              <span className="hero__seasons-badge">
                {currentItem.seasons} Season{currentItem.seasons !== 1 ? 's' : ''}
              </span>
            )}
            {currentItem.duration && currentItem.type !== 'series' && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                {currentItem.duration}
              </span>
            )}
          </motion.div>

          <motion.h1 variants={childVariants} className="hero__title shimmer-text">
            {currentItem.title}
          </motion.h1>

          {currentItem.description && (
            <motion.p variants={childVariants} className="hero__description">
              {currentItem.description}
            </motion.p>
          )}

          <motion.div variants={childVariants} className="hero__actions">
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
            <button
              className="btn-icon"
              onClick={() => toggleMyList(currentItem)}
              title={isInList ? 'Remove from My List' : 'Add to My List'}
            >
              {isInList ? <Check size={20} /> : <Plus size={20} />}
            </button>
          </motion.div>

          {/* Genre tags */}
          {currentItem.genre && currentItem.genre.length > 0 && (
            <motion.div variants={childVariants} className="hero__genres">
              {currentItem.genre.slice(0, 4).map((g, i) => (
                <span key={i} className="hero__genre-tag">{g}</span>
              ))}
            </motion.div>
          )}
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
