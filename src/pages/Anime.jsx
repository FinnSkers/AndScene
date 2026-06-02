import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { discoverSeries, fetchTrending, getTvGenres } from '../services/tmdb';
import Navbar from '../components/Navbar';
import ContentRow from '../components/ContentRow';
import ContentModal from '../components/ContentModal';
import SearchOverlay from '../components/SearchOverlay';
import Footer from '../components/Footer';
import { Loader2 } from 'lucide-react';

export default function Anime() {
  const { openModal } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          trendingAnime,
          actionAnime,
          fantasyAnime,
          scifiAnime,
          comedyAnime
        ] = await Promise.all([
          discoverSeries({ with_keywords: '210024', with_original_language: 'ja', sort_by: 'popularity.desc' }),
          discoverSeries({ with_keywords: '210024', with_original_language: 'ja', with_genres: '10759' }), // Action & Adventure
          discoverSeries({ with_keywords: '210024', with_original_language: 'ja', with_genres: '10765' }), // Sci-Fi & Fantasy
          discoverSeries({ with_keywords: '210024', with_original_language: 'ja', with_genres: '16,878' }), // Animation, Sci-Fi
          discoverSeries({ with_keywords: '210024', with_original_language: 'ja', with_genres: '35' })    // Comedy
        ]);

        setRows([
          { id: 'trending', title: 'Trending Anime', items: trendingAnime, type: 'top10' },
          { id: 'action', title: 'Action & Adventure Anime', items: actionAnime, type: 'standard' },
          { id: 'fantasy', title: 'Fantasy Anime', items: fantasyAnime, type: 'standard' },
          { id: 'scifi', title: 'Sci-Fi Anime', items: scifiAnime, type: 'standard' },
          { id: 'comedy', title: 'Comedy Anime', items: comedyAnime, type: 'standard' }
        ]);
      } catch (err) {
        console.error("Failed to load Anime data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="home-page" style={{ paddingTop: '100px' }}>
      <Navbar />

      <div className="home-rows" style={{ minHeight: '80vh', padding: '2rem var(--content-padding)' }}>
        <h1 style={{ fontSize: 'var(--text-4xl)', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-1.5px' }}>Anime Hub</h1>
        
        {loading ? (
           <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--accent)' }}>
             <Loader2 className="spinner" size={48} />
           </div>
        ) : (
          rows.map((row) => (
            <ContentRow
              key={row.id}
              title={row.title}
              items={row.items}
              type={row.type}
            />
          ))
        )}
      </div>

      <ContentModal />
      <SearchOverlay />
      <Footer />
    </div>
  );
}
