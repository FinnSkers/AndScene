/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useMemo, useEffect, useRef } from 'react';
import { Maximize, Minimize, Loader2, Play, Pause, Volume2, VolumeX, Subtitles, Settings, RotateCcw, FastForward } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';
import './VideoPlayer.css';

const SOURCES = [
  {
    name: 'VidKing',
    getMovieUrl: (id) => `https://vidking.net/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidking.net/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidLink (Default - Ad-Free/Fast)',
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=E50914`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=E50914`,
  },
  {
    name: 'VidSrc.cc',
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'Custom Server (Direct)',
    isDirect: true,
    getMovieUrl: () => ``,
    getTvUrl: () => ``,
  }
];

export default function VideoPlayer({ 
  type, 
  tmdbId, 
  season = 1, 
  episode = 1, 
  startTime = 0, 
  defaultServer = -1, 
  onDirectUrlChange,
  details 
}) {
  const { activeProfile, user, addToContinueWatching } = useApp();
  const [sourceIndex, setSourceIndex] = useState(defaultServer === -1 ? 1 : defaultServer);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef(null);

  // Native player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(false);
  
  // Custom subtitles
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState('');
  const [subtitleUrlInput, setSubtitleUrlInput] = useState('');
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  // HUD Feedbacks
  const [hudMessage, setHudMessage] = useState(null);
  const hudTimeoutRef = useRef(null);

  const [directUrl, setDirectUrl] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const lastSavedPercentRef = useRef(0);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const swipeStartRef = useRef(null);

  // Trigger brief visual indicator overlay (HUD)
  const triggerHud = (message) => {
    setHudMessage(message);
    clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setHudMessage(null);
    }, 800);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
      triggerHud('Play');
    } else {
      video.pause();
      setIsPlaying(false);
      triggerHud('Pause');
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !video.muted;
    video.muted = newMuted;
    setIsMuted(newMuted);
    triggerHud(newMuted ? 'Mute' : `Volume: ${Math.round(volume * 100)}%`);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = parseFloat(e.target.value);
    video.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
    triggerHud(`Volume: ${Math.round(newVol * 100)}%`);
  };

  const handlePlaybackSpeed = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setIsSpeedMenuOpen(false);
    triggerHud(`Speed: ${rate}x`);
  };

  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
      triggerHud('Fullscreen');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
      triggerHud('Exit Fullscreen');
    }
  };

  // Convert SRT subtitles to WebVTT format
  const convertSrtToVtt = (srtText) => {
    let vtt = 'WEBVTT\n\n';
    const cleanText = srtText.replace(/\r\n/g, '\n');
    vtt += cleanText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    return vtt;
  };

  const handleSubtitleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      let content = evt.target.result;
      if (file.name.endsWith('.srt')) {
        content = convertSrtToVtt(content);
      }
      const blob = new Blob([content], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);
      setSubtitleTrackUrl(blobUrl);
      setIsSubtitleMenuOpen(false);
      triggerHud('Subtitles Uploaded');
    };
    reader.readAsText(file);
  };

  const handleSubtitleUrlLoad = () => {
    if (!subtitleUrlInput.trim()) return;
    setSubtitleTrackUrl(subtitleUrlInput.trim());
    setIsSubtitleMenuOpen(false);
    setSubtitleUrlInput('');
    triggerHud('Remote Subtitles Loaded');
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const sStr = s < 10 ? `0${s}` : s;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : m;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  };

  // Hotkey keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (!SOURCES[sourceIndex]?.isDirect || !directUrl) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          triggerHud('-10s');
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          triggerHud('+10s');
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.min(1, prev + 0.05);
            video.volume = newVol;
            triggerHud(`Volume: ${Math.round(newVol * 100)}%`);
            return newVol;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.max(0, prev - 0.05);
            video.volume = newVol;
            triggerHud(`Volume: ${Math.round(newVol * 100)}%`);
            return newVol;
          });
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [directUrl, sourceIndex, volume, isMuted]);

  // Touch Swipe Gestures
  const handleTouchStart = (e) => {
    if (!SOURCES[sourceIndex]?.isDirect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const isLeft = x < rect.width / 2;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current.time < DOUBLE_TAP_DELAY && Math.abs(x - lastTapRef.current.x) < 40) {
      // Double tap triggered
      const video = videoRef.current;
      if (video) {
        if (isLeft) {
          video.currentTime = Math.max(0, video.currentTime - 10);
          triggerHud('-10s');
        } else {
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          triggerHud('+10s');
        }
      }
      lastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      lastTapRef.current = { time: now, x, y };
      swipeStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        startVal: isLeft ? brightness : volume,
        isLeft
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!swipeStartRef.current) return;
    const touch = e.touches[0];
    const diffY = swipeStartRef.current.y - touch.clientY;
    const sensitivity = 150; 
    const delta = diffY / sensitivity;

    if (swipeStartRef.current.isLeft) {
      const newVal = Math.max(0.1, Math.min(1, swipeStartRef.current.startVal + delta));
      setBrightness(newVal);
      triggerHud(`Brightness: ${Math.round(newVal * 100)}%`);
    } else {
      const newVal = Math.max(0, Math.min(1, swipeStartRef.current.startVal + delta));
      const video = videoRef.current;
      if (video) {
        video.volume = newVal;
        setVolume(newVal);
      }
      triggerHud(`Volume: ${Math.round(newVal * 100)}%`);
    }
  };

  const handleTouchEnd = () => {
    swipeStartRef.current = null;
  };

  // Sync seek back to server on pause or periodic playback
  const handleProgressSave = (time) => {
    if (!duration || duration <= 0 || !details) return;
    const percent = (time / duration) * 100;
    
    // Save to localStorage immediately (exact seconds)
    const mediaKey = `andscene_seek_${activeProfile?.id || 'guest'}_${tmdbId}`;
    localStorage.setItem(mediaKey, JSON.stringify({
      currentTime: time,
      duration,
      percent,
      timestamp: Date.now()
    }));

    // Throttled DB save (every 3% or if paused)
    if (Math.abs(percent - lastSavedPercentRef.current) > 3) {
      lastSavedPercentRef.current = percent;
      
      const itemToSave = {
        id: tmdbId,
        title: details.title,
        poster: details.poster,
        type: type === 'series' ? 'series' : 'movie',
        season: type === 'series' ? season : null,
        episode: type === 'series' ? episode : null
      };

      addToContinueWatching(itemToSave, percent);
    }
  };

  // Sync metadata seek on direct source load
  const handleVideoLoadedMetadata = (e) => {
    const video = e.target;
    setDuration(video.duration);
    
    // Resume progress check
    const mediaKey = `andscene_seek_${activeProfile?.id || 'guest'}_${tmdbId}`;
    const cached = localStorage.getItem(mediaKey);
    if (cached) {
      try {
        const { currentTime: cachedTime } = JSON.parse(cached);
        if (cachedTime > 5 && cachedTime < video.duration - 10) {
          video.currentTime = cachedTime;
          triggerHud('Resumed Playback');
          setShowResumeToast(true);
          setTimeout(() => setShowResumeToast(false), 6000);
        }
      } catch (err) {
        console.warn('Failed parsing resume time', err);
      }
    } else if (startTime > 0) {
      video.currentTime = startTime;
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
    if (defaultServer === -1) {
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

  const currentSource = SOURCES[sourceIndex] || SOURCES[0];
  
  const embedUrl = useMemo(() => {
    if (currentSource.isDirect) return '';
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
      if (!isSubtitleMenuOpen && !isSpeedMenuOpen) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    if (currentSource.isDirect) {
      const serverUrl = localStorage.getItem('user_cinepro_server_url');
      if (!serverUrl) {
        setResolveError('No Custom Server URL configured. Please open settings to set one.');
        setDirectUrl('');
        return;
      }

      setResolving(true);
      setResolveError('');
      setDirectUrl('');

      const fetchPath = type === 'movie' 
        ? `${serverUrl}/v1/movies/${tmdbId}`
        : `${serverUrl}/v1/tv/${tmdbId}/seasons/${season}/episodes/${episode}`;

      fetch(fetchPath)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to contact custom resolver: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          if (data && data.streams && data.streams.length > 0) {
            setDirectUrl(data.streams[0].url);
          } else {
            setResolveError('Custom server was unable to resolve streams for this title.');
          }
        })
        .catch(err => {
          console.error(err);
          setResolveError('Unable to connect to custom server. Ensure it is running and CORS is enabled.');
        })
        .finally(() => {
          setResolving(false);
        });
    } else {
      setDirectUrl('');
      setResolveError('');
      setResolving(false);
    }
  }, [sourceIndex, tmdbId, season, episode, type]);

  useEffect(() => {
    if (onDirectUrlChange) {
      onDirectUrlChange(directUrl);
    }
  }, [directUrl, onDirectUrlChange]);

  useEffect(() => {
    return () => {
      clearTimeout(controlsTimeoutRef.current);
      clearTimeout(hudTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="video-player-container"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Brightness Overlay */}
      {currentSource.isDirect && (
        <div 
          className="player-brightness-overlay" 
          style={{ opacity: 1 - brightness }} 
          aria-hidden="true"
        />
      )}

      {/* Visual Feedback Overlay (HUD) */}
      {hudMessage && (
        <div className="player-hud-feedback animate-hud-fade">
          <span>{hudMessage}</span>
        </div>
      )}

      <div className="video-player-wrapper">
        {currentSource.isDirect ? (
          <div className="video-native-container">
            {resolving && (
              <div className="video-resolver-status-overlay">
                <Loader2 className="spinner" size={32} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Resolving direct stream link...</span>
              </div>
            )}
            {resolveError && (
              <div className="video-resolver-status-overlay error">
                <span>⚠️ {resolveError}</span>
              </div>
            )}
            {directUrl && !resolving && (
              <>
                {showResumeToast && (
                  <div className="player-resume-toast glass">
                    <span>You resumed watching {type === 'series' ? `S${season}E${episode}` : 'this title'}.</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                        }
                        setShowResumeToast(false);
                        triggerHud('Started Over');
                      }}
                    >
                      Start Over
                    </button>
                  </div>
                )}
                <video
                  ref={videoRef}
                  key={directUrl}
                  src={directUrl}
                  autoPlay
                  className="video-native-element"
                  style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => {
                    setIsPlaying(false);
                    if (videoRef.current) {
                      handleProgressSave(videoRef.current.currentTime);
                    }
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onClick={togglePlay}
                >
                  {subtitleTrackUrl && (
                    <track 
                      src={subtitleTrackUrl}
                      kind="subtitles"
                      srcLang="en"
                      label="Custom Subtitles"
                      default
                    />
                  )}
                </video>

                {/* ── Premium Custom HTML5 Player Controls Overlay ── */}
                <div className={`player-controls-overlay glass ${showControls ? 'visible' : ''}`}>
                  <div className="controls-row-timeline">
                    <input 
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="controls-seek-slider"
                    />
                  </div>

                  <div className="controls-row-buttons">
                    <div className="controls-left-group">
                      <button type="button" onClick={togglePlay} className="control-btn" title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      </button>

                      <div className="controls-volume-group">
                        <button type="button" onClick={toggleMute} className="control-btn" title={isMuted ? 'Unmute' : 'Mute'}>
                          {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input 
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="controls-volume-slider"
                        />
                      </div>

                      <span className="controls-time-indicator">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="controls-right-group">
                      {/* Subtitles Custom Loader */}
                      <div className="control-menu-container">
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsSubtitleMenuOpen(!isSubtitleMenuOpen);
                            setIsSpeedMenuOpen(false);
                          }}
                          className={`control-btn ${subtitleTrackUrl ? 'active' : ''}`}
                          title="Subtitles Menu"
                        >
                          <Subtitles size={20} />
                        </button>
                        
                        {isSubtitleMenuOpen && (
                          <div className="control-submenu glass">
                            <h4>Custom Subtitles</h4>
                            <label className="subtitle-upload-label btn btn-secondary">
                              Upload SRT/VTT file
                              <input 
                                type="file" 
                                accept=".srt,.vtt" 
                                onChange={handleSubtitleFileUpload} 
                                style={{ display: 'none' }}
                              />
                            </label>
                            
                            <div className="subtitle-url-input-group">
                              <input 
                                type="text"
                                placeholder="Paste WebVTT URL"
                                value={subtitleUrlInput}
                                onChange={(e) => setSubtitleUrlInput(e.target.value)}
                              />
                              <button type="button" className="btn btn-primary" onClick={handleSubtitleUrlLoad}>Load</button>
                            </div>

                            {subtitleTrackUrl && (
                              <button 
                                type="button" 
                                className="btn btn-secondary clear-sub-btn" 
                                onClick={() => {
                                  setSubtitleTrackUrl('');
                                  setIsSubtitleMenuOpen(false);
                                  triggerHud('Subtitles Cleared');
                                }}
                              >
                                Turn Off Subtitles
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Playback speed selector */}
                      <div className="control-menu-container">
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsSpeedMenuOpen(!isSpeedMenuOpen);
                            setIsSubtitleMenuOpen(false);
                          }} 
                          className="control-btn"
                          title="Playback Speed"
                        >
                          <Settings size={20} />
                        </button>

                        {isSpeedMenuOpen && (
                          <div className="control-submenu speed-menu glass">
                            <h4>Playback Speed</h4>
                            {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                              <button 
                                key={rate}
                                type="button" 
                                className={`speed-option-btn ${playbackRate === rate ? 'active' : ''}`}
                                onClick={() => handlePlaybackSpeed(rate)}
                              >
                                {rate === 1 ? 'Normal' : `${rate}x`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button type="button" onClick={toggleFullscreen} className="control-btn" title="Fullscreen">
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <iframe
            key={`${sourceIndex}-${startTime}`}
            src={embedUrl}
            allowFullScreen={true}
            frameBorder="0"
            title={`Streaming ${type}`}
            className="video-iframe"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
          />
        )}

        {/* Vertical Server Bar on the right side */}
        <div className={`video-server-sidebar ${showControls ? 'visible' : ''}`}>
          <div className="server-vertical-bar glass">
            <span className="server-bar-label-vertical">Servers</span>

            {SOURCES.map((src, idx) => (
              <button
                key={src.name}
                type="button"
                className={`server-vertical-btn ${idx === sourceIndex ? 'active' : ''}`}
                onClick={() => setSourceIndex(idx)}
                title={src.name}
              >
                {src.name.replace(' (Default)', '').replace(' (EmbedIn Default)', '').replace(' (Ad-Free/Fast)', '').split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* ALWAYS visible bottom right fullscreen button when using standard iframe */}
        {!currentSource.isDirect && (
          <button 
            type="button" 
            className="fixed-fullscreen-btn glass" 
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
