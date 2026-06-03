import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { fetchTrending, fetchMovies, fetchSeries, discoverMovies, fetchAnime } from '../services/tmdb';
import { supabase } from '../services/supabaseClient';
import { Megaphone, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import ContentModal from '../components/ContentModal';
import SearchOverlay from '../components/SearchOverlay';
import Footer from '../components/Footer';
import Splash from '../components/Splash';
import { HeroSkeleton, RowSkeleton } from '../components/Skeleton';
import './Home.css';

export default function Home() {
  const { myList, continueWatching, toast, setIsTMDBSettingsOpen } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const [showApiPrompt, setShowApiPrompt] = useState(
    !localStorage.getItem('user_tmdb_api_key') && 
    sessionStorage.getItem('api_prompt_dismissed') !== 'true'
  );

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'SYSTEM_ANNOUNCEMENT')
          .single();
        if (!error && data?.value) {
          const dismissed = sessionStorage.getItem('announcement_dismissed');
          if (dismissed !== data.value) {
            setAnnouncement(data.value);
          }
        }
      } catch {
        // Safe fallback if not set or database unavailable
      }
    };
    fetchAnnouncement();
  }, []);

  const handleDismissAnnouncement = () => {
    sessionStorage.setItem('announcement_dismissed', announcement);
    setAnnouncement('');
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          trending,
          topRatedMovies,
          popularSeries,
          actionMovies,
          comedies,
          anime
        ] = await Promise.all([
          fetchTrending(),
          fetchMovies('top_rated'),
          fetchSeries('popular'),
          discoverMovies({ with_genres: '28' }),
          discoverMovies({ with_genres: '35' }),
          fetchAnime()
        ]);

        setRows([
          { id: 'trending', title: 'Trending Now', items: trending, type: 'top10' },
          { id: 'topMovies', title: 'Top Rated Movies', items: topRatedMovies, type: 'standard' },
          { id: 'popularTv', title: 'Popular TV Shows', items: popularSeries, type: 'standard' },
          { id: 'action', title: 'Action & Adventure', items: actionMovies, type: 'standard' },
          { id: 'comedy', title: 'Comedies', items: comedies, type: 'standard' },
          { id: 'anime', title: 'Anime Series', items: anime, type: 'standard' }
        ]);
      } catch (err) {
        console.error("Failed to load TMDB data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="home-page">
      <AnimatePresence>
        {showSplash && <Splash key="splash" onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {announcement && (
          <motion.div 
            className="home-announcement-banner"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="banner-content">
              <Megaphone size={16} className="banner-icon" />
              <span className="banner-text">{announcement}</span>
            </div>
            <button className="banner-close" onClick={handleDismissAnnouncement} aria-label="Dismiss Announcement">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Navbar />
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroSkeleton />
            <div className="home-rows" style={{ minHeight: '50vh', marginTop: 0 }}>
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Hero />
            <div className="home-rows" style={{ minHeight: '50vh', marginTop: 0 }}>
              {showApiPrompt && (
                <div className="api-prompt-card glass animate-fade-in" style={{
                  margin: '24px var(--content-padding) 0',
                  padding: '16px 24px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  border: '1px solid var(--border-accent)',
                  background: 'rgba(245, 166, 35, 0.04)',
                  boxShadow: '0 0 15px rgba(245, 166, 35, 0.05)',
                  position: 'relative',
                  zIndex: 2
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.25rem' }}>💡</span>
                    <div>
                      <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Shared Free Indexing Active</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineScale: 1.4 }}>You are currently using the shared global TMDB connection. Experience rate limits? Click below to connect your own free TMDB API key.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '10px', background: 'var(--gradient-accent)' }}
                      onClick={() => setIsTMDBSettingsOpen(true)}
                    >
                      Connect Personal Key
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px', fontSize: '10px' }}
                      onClick={() => {
                        sessionStorage.setItem('api_prompt_dismissed', 'true');
                        setShowApiPrompt(false);
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {rows.map((row) => (
                <ContentRow
                  key={row.id}
                  title={row.title}
                  items={row.items}
                  type={row.type}
                />
              ))}

              {continueWatching.length > 0 && (
                <ContentRow title="Continue Watching for You" items={continueWatching} type="continue" />
              )}

              {myList.length > 0 && (
                <ContentRow title="My List" items={myList} type="standard" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ContentModal />
      <SearchOverlay />
      <Footer />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="home-toast glass"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
