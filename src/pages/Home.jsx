import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { fetchTrending, fetchMovies, fetchSeries, discoverMovies, fetchAnime } from '../services/tmdb';
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
  const { myList, continueWatching, toast } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

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
