/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Film, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  fetchMovies,
  fetchSeries,
  fetchTrending,
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
  new: 'New & Popular',
  mylist: 'My List',
};

export default function Browse() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'movies';

  const { myList, openModal } = useApp();
  const [activeGenre, setActiveGenre] = useState(null);
  const [sort, setSort] = useState('suggested');
  
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
          data = await fetchTrending(page);
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

  return (
    <div className="browse-page">
      <Navbar />

      {/* ── Header ── */}
      <div className="browse-header">
        <h1 className="browse-title">{pageTitle}</h1>
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--accent)' }}>
          <Loader2 className="spinner" size={48} />
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
                    <div className="browse-grid-card-overlay">
                      <span className="browse-grid-card-title">{item.title}</span>
                      <span className="browse-grid-card-meta">
                        {item.match}% Match &middot; {item.year}
                      </span>
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
      <Footer />
    </div>
  );
}
