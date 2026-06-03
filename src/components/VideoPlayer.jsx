/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useMemo, useEffect, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import './VideoPlayer.css';

const SOURCES = [
  {
    name: 'VidKing (Default)',
    getMovieUrl: (id) => `https://vidking.net/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidking.net/embed/tv/${id}/${s}/${e}`,
  },
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

export default function VideoPlayer({ type, tmdbId, season = 1, episode = 1, startTime = 0, defaultServer = 0 }) {
  const [sourceIndex, setSourceIndex] = useState(defaultServer);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) { /* Safari */
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) { /* IE11 */
        element.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (defaultServer === 0) {
      const loadDefaultServer = async () => {
        try {
          const { data, error } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'SYSTEM_DEFAULT_SERVER')
            .single();
          if (!error && data?.value) {
            const index = parseInt(data.value);
            if (!isNaN(index) && index >= 0 && index < SOURCES.length) {
              setSourceIndex(index);
            }
          }
        } catch {
          // Ignore table/load errors gracefully
        }
      };
      loadDefaultServer();
    } else {
      setSourceIndex(defaultServer);
    }
  }, [defaultServer]);

  const currentSource = SOURCES[sourceIndex];
  
  const embedUrl = useMemo(() => {
    const baseUrl = type === 'movie'
      ? currentSource.getMovieUrl(tmdbId)
      : currentSource.getTvUrl(tmdbId, season, episode);

    if (startTime > 0) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}start=${startTime}&t=${startTime}`;
    }
    return baseUrl;
  }, [type, tmdbId, season, episode, currentSource, startTime]);

  // Handle auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="video-player-container"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="video-player-wrapper">
        <iframe
          key={`${sourceIndex}-${startTime}`}
          src={embedUrl}
          allowFullScreen={true}
          frameBorder="0"
          title={`Streaming ${type}`}
          className="video-iframe"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
        />

        {/* Floating Server Controller overlay - Minimal Horizontal Bar */}
        <div className={`video-controls-overlay ${showControls ? 'visible' : ''}`}>
          <div className="server-floating-bar glass">
            <span className="server-bar-label">Server:</span>
            <div className="server-pills">
              {SOURCES.map((src, idx) => (
                <button
                  key={src.name}
                  type="button"
                  className={`server-pill-btn ${idx === sourceIndex ? 'active' : ''}`}
                  onClick={() => setSourceIndex(idx)}
                >
                  {src.name.replace(' (Default)', '').replace(' (Ad-Free/Fast)', '').split(' ')[0]}
                </button>
              ))}
            </div>
            
            <div className="server-divider" style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 8px' }} />
            
            <button 
              type="button" 
              className="fullscreen-toggle-btn" 
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-primary)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '4px',
                borderRadius: 'var(--radius-full)',
                transition: 'all 0.2s'
              }}
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
