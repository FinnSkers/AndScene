import { useState, useMemo } from 'react';
import { Server, Settings, MonitorPlay } from 'lucide-react';
import './VideoPlayer.css';

const SOURCES = [
  {
    name: 'VidLink (Ad-Free/Fast)',
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=E50914`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=E50914`,
  },
  {
    name: 'VidSrc.me',
    getMovieUrl: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    name: 'VidSrc.to',
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'EmbedSU',
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'SuperEmbed',
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  }
];

export default function VideoPlayer({ type, tmdbId, season = 1, episode = 1 }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [showSources, setShowSources] = useState(false);

  const currentSource = SOURCES[sourceIndex];
  
  const embedUrl = useMemo(() => {
    if (type === 'movie') {
      return currentSource.getMovieUrl(tmdbId);
    }
    return currentSource.getTvUrl(tmdbId, season, episode);
  }, [type, tmdbId, season, episode, currentSource]);

  return (
    <div className="video-player-container">
      <div className="video-player-wrapper">
        <iframe
          src={embedUrl}
          allowFullScreen
          frameBorder="0"
          title={`Streaming ${type}`}
          className="video-iframe"
          allow="autoplay; fullscreen"
        />
      </div>
      
      <div className="video-controls-bar">
        <div className="controls-left">
          <MonitorPlay size={20} className="text-secondary" />
          <span className="source-indicator">
            Playing via <strong>{currentSource.name}</strong>
          </span>
        </div>
        
        <div className="controls-right">
          <div className="source-selector">
            <button 
              className="btn btn-secondary source-btn"
              onClick={() => setShowSources(!showSources)}
            >
              <Server size={18} />
              Change Server
            </button>
            
            {showSources && (
              <div className="source-dropdown glass">
                <div className="dropdown-header">
                  <Settings size={14} /> Select a server if playback fails
                </div>
                <ul>
                  {SOURCES.map((src, idx) => (
                    <li key={src.name}>
                      <button 
                        className={`source-option ${idx === sourceIndex ? 'active' : ''}`}
                        onClick={() => {
                          setSourceIndex(idx);
                          setShowSources(false);
                        }}
                      >
                        {src.name}
                        {idx === sourceIndex && <span className="active-dot" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
