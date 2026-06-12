import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Info, Loader2, Sparkles, Star } from 'lucide-react';
import { discoverSeries } from '../services/tmdb';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import ContentRow from '../components/ContentRow';
import ContentModal from '../components/ContentModal';
import SearchOverlay from '../components/SearchOverlay';
import Footer from '../components/Footer';
import './Anime.css';

export default function Anime() {
  const [rows, setRows] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);
  const { openModal } = useApp();
  const navigate = useNavigate();

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

        const validTrending = (trendingAnime || []).filter(i => i.backdrop || i.poster);
        if (validTrending.length > 0) {
          // Select a random popular anime from the top 5
          const index = Math.min(validTrending.length - 1, Math.floor(Math.random() * 5));
          setFeatured(validTrending[index]);
        }

        setRows([
          { id: 'trending', title: 'Trending Anime', items: trendingAnime, type: 'top10' },
          { id: 'action', title: 'Action & Adventure Anime', items: actionAnime, type: 'standard' },
          { id: 'fantasy', title: 'Fantasy Anime', items: fantasyAnime, type: 'standard' },
          { id: 'scifi', title: 'Sci-Fi & Cyberpunk', items: scifiAnime, type: 'standard' },
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
    <div className="anime-page">
      <Navbar />

      {loading ? (
        <div className="anime-loading-screen">
          <Loader2 className="spinner" size={48} />
        </div>
      ) : (
        <>
          {/* Featured Anime Hero Banner */}
          {featured && (
            <div className="anime-hero">
              <div className="anime-hero-backdrop-wrapper">
                <img 
                  className="anime-hero-backdrop" 
                  src={featured.backdrop || featured.poster} 
                  alt={featured.title} 
                />
                <div className="anime-hero-vignette" />
                <div className="anime-hero-overlay-left" />
              </div>

              <motion.div 
                className="anime-hero-content"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <div className="anime-hero-spotlight-badge">
                  <Sparkles size={14} className="badge-sparkle" />
                  <span>Otaku Spotlight</span>
                </div>

                <h1 className="shimmer-text">{featured.title}</h1>

                <div className="anime-hero-meta">
                  {featured.match && (
                    <span className="anime-hero-match">
                      <Star size={12} fill="currentColor" /> {(featured.match / 10).toFixed(1)} Rating
                    </span>
                  )}
                  {featured.year && <span className="anime-hero-year">{featured.year}</span>}
                  {featured.duration && <span className="anime-hero-duration">{featured.duration}</span>}
                </div>

                {featured.description && (
                  <p className="anime-hero-desc">{featured.description}</p>
                )}

                <div className="anime-hero-actions">
                  <button 
                    type="button" 
                    className="btn btn-primary anime-hero-btn"
                    onClick={() => navigate(`/watch/${featured.type || 'series'}/${featured.id}`)}
                  >
                    <Play size={16} fill="currentColor" /> Play Now
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary anime-hero-btn"
                    onClick={() => openModal(featured)}
                  >
                    <Info size={16} /> More Info
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Anime Rows */}
          <div className="anime-rows-container">
            {rows.map((row) => (
              <ContentRow
                key={row.id}
                title={row.title}
                items={row.items}
                type={row.type}
              />
            ))}
          </div>
        </>
      )}

      <ContentModal />
      <SearchOverlay />
      <Footer />
    </div>
  );
}
