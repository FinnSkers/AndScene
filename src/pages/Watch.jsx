import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VideoPlayer from '../components/VideoPlayer';
import { fetchDetails, fetchSeasonDetails } from '../services/tmdb';
import './Watch.css';

export default function Watch() {
  const { type, id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToContinueWatching } = useApp();
  
  const seasonParam = parseInt(searchParams.get('s')) || 1;
  const episodeParam = parseInt(searchParams.get('e')) || 1;

  const [details, setDetails] = useState(null);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchDetails(id, type);
        setDetails(data);
      } catch (err) {
        setError('Failed to load media details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [id, type]);

  useEffect(() => {
    if (type === 'series' && details) {
      const loadSeason = async () => {
        try {
          setSeasonLoading(true);
          const data = await fetchSeasonDetails(id, seasonParam);
          setSeasonDetails(data);
        } catch (err) {
          console.error("Failed to load season", err);
        } finally {
          setSeasonLoading(false);
        }
      };
      loadSeason();
    }
  }, [id, type, seasonParam, details]);

  // Track continue watching
  useEffect(() => {
    if (details && !loading) {
      const itemToSave = { 
        ...details, 
        type: type === 'series' ? 'series' : 'movie',
        season: type === 'series' ? seasonParam : null,
        episode: type === 'series' ? episodeParam : null
      };
      addToContinueWatching(itemToSave);
    }
  }, [details, type, seasonParam, episodeParam, loading, addToContinueWatching]);

  const handleEpisodeSelect = (seasonNum, episodeNum) => {
    setSearchParams({ s: seasonNum, e: episodeNum });
  };

  const handleSeasonChange = (e) => {
    setSearchParams({ s: e.target.value, e: 1 });
  };

  if (loading) {
    return (
      <div className="watch-page loading">
        <Navbar />
        <div className="loader-container">
          <Loader2 className="spinner" size={48} />
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="watch-page error">
        <Navbar />
        <div className="error-container">
          <h2>Oops!</h2>
          <p>{error || 'Media not found.'}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="watch-page">
      <Navbar />
      
      <div className="watch-content">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} /> Back
        </button>

        <div className={`watch-layout ${type === 'series' ? 'has-sidebar' : ''}`}>
          
          <div className="player-section">
            <h1 className="watch-title">
              {details.title}
              {type === 'series' && seasonDetails?.episodes && (
                <span className="episode-subtitle">
                  S{seasonParam} E{episodeParam} - {seasonDetails.episodes.find(e => e.episode_number === episodeParam)?.name}
                </span>
              )}
            </h1>
            
            <VideoPlayer 
              type={type} 
              tmdbId={id} 
              season={seasonParam} 
              episode={episodeParam} 
            />
            
            <div className="watch-meta">
              <p className="watch-description">{details.description}</p>
            </div>
          </div>

          {type === 'series' && (
            <div className="episodes-sidebar">
              <div className="sidebar-header glass">
                <h3>Episodes</h3>
                <select 
                  className="season-select" 
                  value={seasonParam} 
                  onChange={handleSeasonChange}
                >
                  {details.seasonsList?.filter(s => s.season_number > 0).map(s => (
                    <option key={s.id} value={s.season_number}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="episodes-list">
                {seasonLoading ? (
                  <div className="episodes-loader"><Loader2 className="spinner" size={24} /></div>
                ) : (
                  seasonDetails?.episodes?.map(ep => {
                    const isActive = ep.episode_number === episodeParam;
                    return (
                      <button 
                        key={ep.id}
                        className={`episode-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleEpisodeSelect(seasonParam, ep.episode_number)}
                      >
                        <div className="episode-img-wrap">
                          {ep.still_path ? (
                            <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt={ep.name} />
                          ) : (
                            <div className="episode-img-placeholder"><PlayCircle size={24} /></div>
                          )}
                          {isActive && <div className="playing-overlay"><PlayCircle size={24} /></div>}
                        </div>
                        <div className="episode-info">
                          <span className="ep-num">{ep.episode_number}.</span>
                          <span className="ep-name">{ep.name}</span>
                          <span className="ep-duration">{ep.runtime ? `${ep.runtime}m` : ''}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      
      <Footer />
    </div>
  );
}
