/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Film, Loader2, Sparkles, Play, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DecisionModeModal from '../components/DecisionModeModal';
import {
  fetchMovies,
  fetchSeries,
  fetchTrending,
  fetchUpcoming,
  discoverMovies,
  discoverSeries,
  getMovieGenres,
  getTvGenres
} from '../services/tmdb';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import Navbar from '../components/Navbar';
import ContentModal from '../components/ContentModal';
import SearchOverlay from '../components/SearchOverlay';
import Footer from '../components/Footer';
import './Browse.css';


const sortOptions = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'year', label: 'Year' },
  { value: 'az', label: 'A-Z' },
];

const typeLabels = {
  tv: 'TV Shows',
  movies: 'Movies',
  new: 'New & Upcoming',
  mylist: 'My List',
};

export default function Browse() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'movies';

  const { myList, openModal } = useApp();
  const navigate = useNavigate();
  const [activeGenre, setActiveGenre] = useState(null);
  const [sort, setSort] = useState('suggested');
  const [isDecisionModeOpen, setIsDecisionModeOpen] = useState(false);
  
  const [genres, setGenres] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loaderRef, isIntersecting] = useIntersectionObserver({ threshold: 0.1, rootMargin: '400px' });

  // Load genres based on type
  useEffect(() => {
    setActiveGenre(null); // Reset genre filter when type changes
    if (type === 'movies') {
      getMovieGenres().then(setGenres);
    } else if (type === 'tv') {
      getTvGenres().then(setGenres);
    } else {
      setGenres([]);
    }
  }, [type]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setContent([]);
    setHasMore(true);
  }, [type, activeGenre, myList]);

  // Load content
  useEffect(() => {
    const loadContent = async () => {
      if (page === 1) setLoading(true);
      try {
        let data = [];
        if (type === 'tv') {
          data = activeGenre ? await discoverSeries({ with_genres: activeGenre, page }) : await fetchSeries('popular', page);
        } else if (type === 'movies') {
          data = activeGenre ? await discoverMovies({ with_genres: activeGenre, page }) : await fetchMovies('popular', page);
        } else if (type === 'new') {
          data = await fetchUpcoming(page);
        } else if (type === 'mylist') {
          data = page === 1 ? myList : [];
        }
        
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setContent(prev => {
            // Filter duplicates (TMDB API sometimes returns overlaps between pages)
            const newItems = data.filter(item => !prev.some(p => p.id === item.id));
            return page === 1 ? data : [...prev, ...newItems];
          });
        }
      } catch (err) {
        console.error("Failed to fetch browse content", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (hasMore) {
      loadContent();
    }
  }, [page, type, activeGenre, myList]);

  // Handle infinite scroll trigger
  useEffect(() => {
    if (isIntersecting && !loading && hasMore && type !== 'mylist') {
      setPage(p => p + 1);
    }
  }, [isIntersecting, loading, hasMore, type]);

  /* ── Sort ── */
  const sortedContent = useMemo(() => {
    const list = [...content];
    if (sort === 'year') list.sort((a, b) => b.year - a.year);
    if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [content, sort]);

  const pageTitle = typeLabels[type] || 'Browse';

  // Pick a featured item for the mini-hero from loaded content
  const featuredItem = useMemo(() => {
    if (!content.length) return null;
    // Pick a random item from the first 8 items that has a backdrop
    const candidates = content.slice(0, 8).filter(i => i.backdrop);
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.length > 0 ? content[0]?.id : null]);

  return (
    <div className="browse-page">
      <Navbar />

      {/* ── Header ── */}
      <div className="browse-header">
        <h1 className="browse-title">{pageTitle}</h1>
        <div className="browse-header-actions">
          <button 
            type="button"
            className="decision-mode-trigger-btn glass"
            onClick={() => setIsDecisionModeOpen(true)}
          >
            <Sparkles size={16} className="sparkles-icon" />
            Decision Mode
          </button>

          <div className="browse-sort">
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="browse-sort-icon" />
          </div>
        </div>
      </div>

      {/* ── Mini-Hero Banner ── */}
      {featuredItem && !loading && (
        <motion.div
          className="browse-mini-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <img
            className="browse-mini-hero-bg"
            src={featuredItem.backdrop}
            alt={featuredItem.title}
          />
          <div className="browse-mini-hero-gradient" />
          <div className="browse-mini-hero-content">
            <motion.h2
              className="browse-mini-hero-title"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {featuredItem.title}
            </motion.h2>
            <motion.div
              className="browse-mini-hero-meta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              {featuredItem.match && (
                <span className="browse-mini-hero-rating">
                  <Star size={14} /> {(featuredItem.match / 10).toFixed(1)}
                </span>
              )}
              {featuredItem.year && <span className="browse-mini-hero-year">{featuredItem.year}</span>}
              {featuredItem.genre?.slice(0, 2).map((g, i) => (
                <span key={i} className="browse-mini-hero-genre">{g}</span>
              ))}
            </motion.div>
            <motion.button
              className="browse-mini-hero-play"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/watch/${featuredItem.type}/${featuredItem.id}`)}
            >
              <Play size={18} fill="currentColor" /> Play Now
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ── Genre Filter Bar ── */}
      {genres.length > 0 && (
        <div className="genre-filter-bar">
          <button
            className={`genre-pill ${activeGenre === null ? 'active' : ''}`}
            onClick={() => setActiveGenre(null)}
          >
            All
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`genre-pill ${activeGenre === genre.id ? 'active' : ''}`}
              onClick={() => setActiveGenre(activeGenre === genre.id ? null : genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Content Grid ── */}
      {loading && page === 1 ? (
        <div className="browse-grid browse-skeleton-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="browse-skeleton-card">
              <div className="browse-skeleton-img shimmer" />
              <div className="browse-skeleton-text">
                <div className="browse-skeleton-line shimmer" style={{ width: '75%' }} />
                <div className="browse-skeleton-line shimmer" style={{ width: '45%', height: '10px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <motion.div
            className="browse-grid"
            key={`${type}-${activeGenre}-${sort}`}
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.04 } },
            }}
          >
            <AnimatePresence mode="popLayout">
              {sortedContent.length > 0 ? (
                sortedContent.map((item) => (
                  <motion.div
                    key={item.id}
                    className="browse-grid-card"
                    variants={{
                      hidden: { opacity: 0, scale: 0.92 },
                      show: { opacity: 1, scale: 1 },
                    }}
                    layout
                    whileHover={{ scale: 1.04 }}
                    onClick={() => openModal(item)}
                  >
                    <img src={item.backdrop || item.poster} alt={item.title} loading="lazy" />
                    {/* Rating Badge */}
                    {item.match > 0 && (
                      <span className="browse-card-rating-badge">
                        ★ {(item.match / 10).toFixed(1)}
                      </span>
                    )}
                    {/* New Badge */}
                    {(item.year === '2025' || item.year === '2026') && (
                      <span className="browse-card-new-badge">New</span>
                    )}
                    <div className="browse-grid-card-overlay">
                      <div className="browse-card-top-row">
                        <span className="browse-card-match">{item.match}% Match</span>
                        <span className="browse-card-year">{item.year}</span>
                        {item.duration && <span className="browse-card-duration">{item.duration}</span>}
                      </div>

                      {item.description && (
                        <p className="browse-card-description">{item.description}</p>
                      )}

                      {item.releaseDate && type === 'new' && (
                        <div className="browse-card-release-row">
                          <span className="browse-card-release-label">Release Date: </span>
                          <span className="browse-card-release-val">{item.releaseDate}</span>
                        </div>
                      )}

                      <div className="browse-card-bottom-row">
                        <div className="browse-card-text">
                          <h4 className="browse-grid-card-title">{item.title}</h4>
                          {item.genre && item.genre.length > 0 && (
                            <div className="browse-card-genres">
                              {item.genre.slice(0, 2).map((g, idx) => (
                                <span key={idx} className="browse-card-genre-tag">{g}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="browse-card-play-btn"
                          title={`Play ${item.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/watch/${item.type || 'movie'}/${item.id}`);
                          }}
                        >
                          <Play size={12} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="browse-empty">
                  <Film size={56} />
                  <p>No titles found for this filter.</p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Infinite Scroll Trigger */}
          {type !== 'mylist' && hasMore && sortedContent.length > 0 && (
            <div ref={loaderRef} style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 60px 0', color: 'var(--accent)' }}>
              <Loader2 className="spinner" size={32} />
            </div>
          )}
        </>
      )}

      <ContentModal />
      <SearchOverlay />
      <DecisionModeModal 
        isOpen={isDecisionModeOpen}
        onClose={() => setIsDecisionModeOpen(false)}
        onSelectContent={(item) => openModal(item)}
      />
      <Footer />
    </div>
  );
}
