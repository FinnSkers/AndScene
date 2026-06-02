/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { searchMulti } from '../services/tmdb';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import './SearchOverlay.css';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const searchBarVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.15 } },
};

const trendingTitles = [
  'Avatar',
  'Stranger Things',
  'Interstellar',
  'Breaking Bad',
  'The Batman',
  'Arcane',
  'Dune',
  'Attack on Titan',
];

export default function SearchOverlay() {
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, openModal } = useApp();
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loaderRef, isIntersecting] = useIntersectionObserver({ threshold: 0.1, rootMargin: '400px' });

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setIsSearchOpen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setIsSearchOpen]);

  // Auto-focus input
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Reset pagination when query changes
  useEffect(() => {
    setPage(1);
    setResults([]);
    setHasMore(true);
  }, [searchQuery]);

  // Live TMDB Search with Debounce and Pagination
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      setHasMore(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (page === 1) setIsSearching(true);
      try {
        const data = await searchMulti(searchQuery, page);
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setResults(prev => {
            const newItems = data.filter(item => !prev.some(p => p.id === item.id));
            return page === 1 ? data : [...prev, ...newItems];
          });
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, page === 1 ? 500 : 0); // Only debounce initial typing, not pagination

    return () => clearTimeout(timer);
  }, [searchQuery, page]);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (isIntersecting && !isSearching && hasMore && searchQuery.trim()) {
      setPage(p => p + 1);
    }
  }, [isIntersecting, isSearching, hasMore, searchQuery]);

  const handleSelectItem = (item) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    openModal(item);
  };

  const handleTagClick = (title) => {
    setSearchQuery(title);
  };

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          className="search-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Close button */}
          <button
            className="search-overlay__close"
            onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
            aria-label="Close search"
          >
            <X size={22} />
          </button>

          <div className="search-overlay__inner">
            {/* Search input */}
            <motion.div
              className="search-overlay__input-wrapper"
              variants={searchBarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Search size={20} className="search-overlay__icon" />
              <input
                ref={inputRef}
                className="search-overlay__input"
                type="text"
                placeholder="Titles, people, genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {hasQuery && (
                <button
                  className="search-overlay__clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </motion.div>

            {/* Loading initial */}
            {isSearching && page === 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                <Loader2 className="spinner text-primary" size={32} />
              </div>
            )}

            {/* Results */}
            {!isSearching && hasQuery && results.length > 0 && (
              <>
                <motion.div
                  className="search-overlay__results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  {results.map((item) => (
                    <motion.div
                      key={item.id}
                      className="search-overlay__result-card"
                      onClick={() => handleSelectItem(item)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="search-overlay__result-image">
                        <img src={item.backdrop || item.poster} alt={item.title} loading="lazy" />
                      </div>
                      <div className="search-overlay__result-overlay">
                        <span className="search-overlay__result-title">{item.title}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Infinite Scroll Trigger */}
                {hasMore && (
                  <div ref={loaderRef} style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                    <Loader2 className="spinner text-primary" size={32} />
                  </div>
                )}
              </>
            )}

            {/* No results */}
            {!isSearching && hasQuery && results.length === 0 && (
              <div className="search-overlay__empty">
                <p>No results found for &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}

            {/* Trending (no query) */}
            {!hasQuery && (
              <div className="search-overlay__trending">
                <h3 className="search-overlay__trending-title">Trending Searches</h3>
                <div className="search-overlay__trending-tags">
                  {trendingTitles.map((title) => (
                    <button
                      key={title}
                      className="search-overlay__tag"
                      onClick={() => handleTagClick(title)}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
