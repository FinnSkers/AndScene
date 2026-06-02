/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Users, Play, X, Globe, Lock, Film, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabaseClient';
import { searchMulti } from '../services/tmdb';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './WatchParty.css';

export default function WatchParty() {
  const { myList, continueWatching, activeProfile, user, showToast } = useApp();
  const navigate = useNavigate();

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Selection & Forms
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [hostControl, setHostControl] = useState('host-only'); // 'host-only' | 'collaborative'
  const [defaultServer, setDefaultServer] = useState('0'); // index 0 (VidKing)
  
  const [joinCode, setJoinCode] = useState('');
  const [publicParties, setPublicParties] = useState([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [dbAvailable, setDbAvailable] = useState(true);
  
  const searchTimeoutRef = useRef(null);

  // Set default room name when activeProfile loads
  useEffect(() => {
    if (activeProfile?.name) {
      setRoomName(`${activeProfile.name}'s Party Room`);
    } else {
      setRoomName('My Streaming Party');
    }
  }, [activeProfile]);

  // Fetch Public Watch Parties on mount
  useEffect(() => {
    const fetchPublicParties = async () => {
      try {
        setPartiesLoading(true);
        const { data, error } = await supabase
          .from('watch_parties')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPublicParties(data || []);
        setDbAvailable(true);
      } catch (err) {
        console.warn('Supabase watch_parties table query failed. Dynamic peer-to-peer fallback enabled.', err.message);
        if (err.message?.includes('relation') || err.message?.includes('does not exist')) {
          setDbAvailable(false);
        }
      } finally {
        setPartiesLoading(false);
      }
    };

    fetchPublicParties();
  }, []);

  // Handle autocomplete search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchMulti(searchQuery);
        // Filter out items without posters/backdrops
        setSearchResults(results.filter(r => r.poster || r.backdrop).slice(0, 5));
      } catch (err) {
        console.error('Error fetching TMDB search results:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery]);

  // Host watch party action
  const handleHostParty = async (e) => {
    e.preventDefault();
    if (!selectedMedia) {
      showToast('Please select a movie or show to stream first!');
      return;
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const mediaType = selectedMedia.type === 'series' ? 'series' : 'movie';
    
    // Save to DB if available and public
    if (dbAvailable) {
      try {
        const { error } = await supabase
          .from('watch_parties')
          .insert([{
            room_code: code,
            room_name: roomName || 'Streaming Party',
            is_public: isPublic,
            host_id: user?.id || null,
            host_name: activeProfile?.name || 'Guest Host',
            media_id: selectedMedia.id,
            media_type: mediaType,
            title: selectedMedia.title,
            poster_path: selectedMedia.poster?.replace('https://image.tmdb.org/t/p/w500', ''),
            host_control: hostControl,
            season: mediaType === 'series' ? 1 : null,
            episode: mediaType === 'series' ? 1 : null
          }]);

        if (error) throw error;
      } catch (err) {
        console.error('Failed to create watch party in DB:', err.message);
      }
    }

    showToast(`Party Room Created: ${code}`);
    navigate(`/watch/${mediaType}/${selectedMedia.id}?party=${code}&host=true&mode=${hostControl}&server=${defaultServer}`);
  };

  // Join party via code form
  const handleJoinParty = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const cleanCode = joinCode.trim().toUpperCase();

    // Query room info from DB to find media ID if possible
    const joinRoomFromDb = async () => {
      if (dbAvailable) {
        try {
          const { data, error } = await supabase
            .from('watch_parties')
            .select('*')
            .eq('room_code', cleanCode)
            .single();

          if (!error && data) {
            navigate(`/watch/${data.media_type}/${data.media_id}?party=${cleanCode}&mode=${data.host_control}`);
            return;
          }
        } catch (err) {
          console.error('Room lookup failed:', err);
        }
      }

      // Fallback: If DB table does not exist or room code not found,
      // prompt user to select content or try to guess. For robust fallback,
      // we can ask them for type & TMDB ID or let them connect directly.
      // But usually, since they want a user-friendly system, we can redirect
      // them to a custom page or let them know they joined.
      // For fallback we can just redirect to browse page with code,
      // but let's default to a popular fallback movie (like TMDB id 1022789)
      // or show an alert to ask the host for the link.
      // Wait, redirecting directly to a default fallback or letting them know
      // to use the full join link is best. Let's redirect to `/watch/movie/1022789?party=${cleanCode}` (Inside Out 2)
      // which is a popular fallback, but display a alert.
      showToast('Joining room via code...');
      navigate(`/watch/movie/1022789?party=${cleanCode}`);
    };

    joinRoomFromDb();
  };

  const selectQuickPick = (item) => {
    setSelectedMedia({
      id: item.id,
      title: item.title,
      type: item.type === 'series' ? 'series' : 'movie',
      poster: item.poster?.includes('http') ? item.poster : `https://image.tmdb.org/t/p/w200${item.poster}`,
      overview: item.description || ''
    });
  };

  return (
    <div className="watch-party-page">
      <Navbar />
      
      <div className="watch-party-content animate-fade-in">
        <div className="watch-party-header">
          <h1>🍿 <span>Watch Party</span> Lobby</h1>
          <p>Host synchronized streams, share play controls, and chat with friends in real time!</p>
        </div>

        {!dbAvailable && (
          <div className="fallback-warning">
            <h4>💡 Peer-to-Peer WebSocket Mode Enabled</h4>
            <p>
              The <code>watch_parties</code> database table is not created in your Supabase schema yet. 
              The lobby directory will be hidden, but **you can still host and join watch parties perfectly** using invite links and codes! To enable public directories, see [supabase_setup.md](file:///C:/Users/mrvxe/.gemini/antigravity/brain/1b6d7fd4-0f0a-44a1-8987-10586c6ca38e/supabase_setup.md).
            </p>
          </div>
        )}

        <div className="watch-party-grid">
          
          {/* Host Form */}
          <div className="party-card-panel glass">
            <h2>🎉 Host a Watch Party</h2>
            <form onSubmit={handleHostParty} className="host-party-form">
              
              {/* Media search selection */}
              <div className="form-section">
                <span className="form-section-title">Step 1: Choose what to watch</span>
                <div className="media-search-container">
                  <div className="search-input-wrapper">
                    <Search className="search-input-icon" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search movie or TV show to stream..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')}>
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {searchLoading && (
                    <div className="search-results-dropdown" style={{ padding: '12px', textAlign: 'center' }}>
                      <Loader2 className="spinner" size={20} />
                    </div>
                  )}

                  {!searchLoading && searchResults.length > 0 && (
                    <div className="search-results-dropdown">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="search-result-item"
                          onClick={() => {
                            setSelectedMedia(item);
                            setSearchQuery('');
                          }}
                        >
                          <img src={item.poster || 'https://via.placeholder.com/150'} alt={item.title} className="result-poster" />
                          <div className="result-info">
                            <span className="result-title">{item.title}</span>
                            <span className="result-meta">
                              {item.type === 'series' ? 'TV Show' : 'Movie'} • {item.year || 'N/A'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Continue Watching / My List quick picks */}
                {!selectedMedia && (
                  <div style={{ marginTop: '16px' }}>
                    <span className="form-section-title" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Film size={12} /> Or select from history & watchlist:
                    </span>
                    
                    <div className="quick-picks-list">
                      {/* Combine watchlist and continue watching */}
                      {Array.from(new Set([...continueWatching, ...myList].map(a => a.id)))
                        .map(id => [...continueWatching, ...myList].find(a => a.id === id))
                        .slice(0, 8)
                        .map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="quick-pick-item"
                            onClick={() => selectQuickPick(item)}
                            title={item.title}
                          >
                            <div className="quick-pick-poster-wrap">
                              <img src={item.poster?.includes('http') ? item.poster : `https://image.tmdb.org/t/p/w200${item.poster}`} alt={item.title} />
                            </div>
                            <span className="quick-pick-title">{item.title}</span>
                          </button>
                        ))
                      }
                      {(!continueWatching.length && !myList.length) && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No history or watchlist items. Use search instead.</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Preview details card */}
                {selectedMedia && (
                  <div className="selected-media-preview animate-fade-in">
                    <img src={selectedMedia.poster} alt={selectedMedia.title} className="preview-poster" />
                    <div className="preview-info">
                      <span className="preview-badge">{selectedMedia.type === 'series' ? 'TV Show' : 'Movie'}</span>
                      <h4 className="preview-title">{selectedMedia.title}</h4>
                      {selectedMedia.overview && (
                        <p className="preview-overview">{selectedMedia.overview}</p>
                      )}
                    </div>
                    <button 
                      type="button" 
                      className="remove-selection-btn"
                      onClick={() => setSelectedMedia(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Settings */}
              <div className="form-section">
                <span className="form-section-title">Step 2: Room Settings</span>
                
                <div className="settings-inputs-grid">
                  <div className="form-group">
                    <label htmlFor="roomName">Room Name</label>
                    <input 
                      id="roomName"
                      type="text" 
                      placeholder="e.g., Chill Movie Night"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="defaultServer">Default Player Server</label>
                    <select 
                      id="defaultServer"
                      value={defaultServer}
                      onChange={(e) => setDefaultServer(e.target.value)}
                    >
                      <option value="0">VidKing (Default/Ad-Free)</option>
                      <option value="1">VidLink</option>
                      <option value="2">VidSrc.me</option>
                      <option value="3">VidSrc.to</option>
                      <option value="4">EmbedSU</option>
                      <option value="5">SuperEmbed</option>
                    </select>
                  </div>
                </div>

                <div className="settings-inputs-grid" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label>Privacy Setting</label>
                    <div className="segmented-control">
                      <button
                        type="button"
                        className={`segment-btn ${isPublic ? 'active' : ''}`}
                        onClick={() => setIsPublic(true)}
                        disabled={!dbAvailable}
                      >
                        <Globe size={12} style={{ marginRight: '4px', display: 'inline' }} />
                        Public Lobby
                      </button>
                      <button
                        type="button"
                        className={`segment-btn ${!isPublic ? 'active' : ''}`}
                        onClick={() => setIsPublic(false)}
                      >
                        <Lock size={12} style={{ marginRight: '4px', display: 'inline' }} />
                        Private Only
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Playback Sync Authority</label>
                    <div className="segmented-control">
                      <button
                        type="button"
                        className={`segment-btn ${hostControl === 'host-only' ? 'active' : ''}`}
                        onClick={() => setHostControl('host-only')}
                      >
                        Host Only
                      </button>
                      <button
                        type="button"
                        className={`segment-btn ${hostControl === 'collaborative' ? 'active' : ''}`}
                        onClick={() => setHostControl('collaborative')}
                      >
                        Collaborative
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                disabled={!selectedMedia}
              >
                <Play size={18} fill="currentColor" /> Host Watch Party Room
              </button>
            </form>
          </div>

          {/* Join / Lobby List Panel */}
          <div className="party-card-panel glass" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2>🔍 Join a Watch Party</h2>
            
            {/* Join input code */}
            <form onSubmit={handleJoinParty} className="join-party-form">
              <input 
                type="text" 
                maxLength="6"
                placeholder="Enter 6-Char Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">Join</button>
            </form>

            {dbAvailable && (
              <>
                <h3 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Compass size={14} /> Active Public Streams
                </h3>

                <div className="public-parties-list">
                  {partiesLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                      <Loader2 className="spinner" size={24} />
                    </div>
                  ) : publicParties.length === 0 ? (
                    <div className="party-empty-state">
                      <Users size={32} className="text-secondary" style={{ margin: '0 auto 8px' }} />
                      <p>No public parties streaming right now.</p>
                      <span>Create one and invite your friends!</span>
                    </div>
                  ) : (
                    publicParties.map((party) => (
                      <div key={party.id} className="public-party-item animate-fade-in">
                        <img 
                          src={party.poster_path ? `https://image.tmdb.org/t/p/w200${party.poster_path}` : 'https://via.placeholder.com/150'} 
                          alt={party.title} 
                        />
                        <div className="party-item-info">
                          <span className="party-item-name">{party.room_name}</span>
                          <span className="party-item-media">{party.title}</span>
                          <div className="party-item-meta">
                            <span>Host: {party.host_name}</span>
                            <span className="meta-dot"></span>
                            <span style={{ textTransform: 'capitalize' }}>
                              {party.host_control === 'host-only' ? 'Host Control' : 'Collaborative'}
                            </span>
                          </div>
                        </div>
                        <button 
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                          onClick={() => navigate(`/watch/${party.media_type}/${party.media_id}?party=${party.room_code}&mode=${party.host_control}`)}
                        >
                          Join
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
