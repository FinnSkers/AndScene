/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Loader2, Users, Send, Share2, LogOut, Tv, Check, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VideoPlayer from '../components/VideoPlayer';
import { fetchDetails, fetchSeasonDetails } from '../services/tmdb';
import './Watch.css';

export default function Watch() {
  const { type, id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, activeProfile, addToContinueWatching, showToast } = useApp();
  
  const seasonParam = parseInt(searchParams.get('s')) || 1;
  const episodeParam = parseInt(searchParams.get('e')) || 1;
  const partyParam = searchParams.get('party') || '';
  const isHost = searchParams.get('host') === 'true';
  const controlMode = searchParams.get('mode') || 'host-only';
  const serverParam = parseInt(searchParams.get('server')) || 0;

  const [details, setDetails] = useState(null);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [error, setError] = useState(null);

  // Watch Party States
  const [activeTab, setActiveTab] = useState(partyParam ? 'party' : 'episodes'); // 'episodes' | 'party'
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [syncMin, setSyncMin] = useState('');
  const [syncSec, setSyncSec] = useState('');
  const [partyStartTime, setPartyStartTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isTerminated, setIsTerminated] = useState(false);

  const channelRef = useRef(null);
  const chatEndRef = useRef(null);
  const prevParticipantsRef = useRef([]);

  // 1. Fetch Movie/TV details
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

  // 2. Fetch Season details
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

  // 3. Track continue watching progress
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

  // 4. Handle Watch Party Realtime Channel Subscriptions
  useEffect(() => {
    if (!partyParam) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setParticipants([]);
      setMessages([]);
      setPartyStartTime(0);
      return;
    }

    // Initialize party tab as active
    setActiveTab('party');

    const channel = supabase.channel(`watch-party-${partyParam}`, {
      config: {
        broadcast: { self: true } // receive our own broadcast events
      }
    });

    channelRef.current = channel;

    // Track presence
    const userDisplayName = activeProfile?.name || user?.email?.split('@')[0] || `Guest_${Math.floor(Math.random() * 100)}`;
    const userColor = activeProfile?.color || '#F5A623';

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map(p => ({
          name: p.name,
          color: p.color
        }));
        
        // Dynamic User Join/Leave Logs in chat
        const prevUsers = prevParticipantsRef.current;
        if (prevUsers.length > 0) {
          // Joiners
          users.forEach(u => {
            if (!prevUsers.some(pu => pu.name === u.name)) {
              setMessages(prev => [...prev, {
                id: Math.random(),
                isSystem: true,
                text: `👋 ${u.name} joined the party`
              }]);
            }
          });
          // Leavers
          prevUsers.forEach(pu => {
            if (!users.some(u => u.name === pu.name)) {
              setMessages(prev => [...prev, {
                id: Math.random(),
                isSystem: true,
                text: `👋 ${pu.name} left the party`
              }]);
            }
          });
        }
        
        prevParticipantsRef.current = users;
        setParticipants(users);
      })
      .on('broadcast', { event: 'chat-msg' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'sync-time' }, ({ payload }) => {
        setPartyStartTime(payload.seconds);
        const minStr = Math.floor(payload.seconds / 60).toString().padStart(2, '0');
        const secStr = (payload.seconds % 60).toString().padStart(2, '0');
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          isSystem: true,
          text: `⏱️ ${payload.sender} synced playback to ${minStr}:${secStr}`
        }]);
      })
      .on('broadcast', { event: 'episode-change' }, ({ payload }) => {
        setSearchParams({ s: payload.season, e: payload.episode, party: partyParam, host: isHost ? 'true' : 'false', mode: controlMode });
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          isSystem: true,
          text: `📺 ${payload.sender} changed episode to Season ${payload.season} Episode ${payload.episode}`
        }]);
      })
      .on('broadcast', { event: 'room-terminated' }, () => {
        setIsTerminated(true);
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: userDisplayName,
          color: userColor
        });
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [partyParam, activeProfile, user, isHost, controlMode, setSearchParams]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleEpisodeSelect = (seasonNum, episodeNum) => {
    if (isPartyActive && controlMode === 'host-only' && !isHost) {
      showToast('Only the host can change episodes.');
      return;
    }

    setSearchParams({ s: seasonNum, e: episodeNum, party: partyParam, host: isHost ? 'true' : 'false', mode: controlMode, server: serverParam });

    // Sync episode selection across the party
    if (channelRef.current) {
      const senderName = activeProfile?.name || user?.email?.split('@')[0] || 'Guest';
      channelRef.current.send({
        type: 'broadcast',
        event: 'episode-change',
        payload: {
          season: seasonNum,
          episode: episodeNum,
          sender: senderName
        }
      });
    }
  };

  const handleSeasonChange = (e) => {
    if (isPartyActive && controlMode === 'host-only' && !isHost) {
      showToast('Only the host can change episodes.');
      return;
    }
    setSearchParams({ s: e.target.value, e: 1, party: partyParam, host: isHost ? 'true' : 'false', mode: controlMode, server: serverParam });
  };

  // Watch Party Controls
  const handleHostParty = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSearchParams({ s: seasonParam, e: episodeParam, party: code, host: 'true', mode: 'host-only' });
  };

  const handleJoinParty = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setSearchParams({ s: seasonParam, e: episodeParam, party: joinCode.trim().toUpperCase(), host: 'false', mode: 'host-only' });
    setJoinCode('');
  };

  const handleLeaveParty = () => {
    if (isHost && partyParam) {
      // Remove from watch_parties table in Supabase (if database table exists)
      supabase
        .from('watch_parties')
        .delete()
        .eq('room_code', partyParam)
        .then(({ error }) => {
          if (error) console.warn('Lobby room cleanup ignored (table watch_parties might be missing).');
        });
    }
    setSearchParams({ s: seasonParam, e: episodeParam });
    setActiveTab('episodes');
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !channelRef.current) return;

    const senderName = activeProfile?.name || user?.email?.split('@')[0] || 'Guest';

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat-msg',
      payload: {
        id: Date.now() + Math.random(),
        sender: senderName,
        isHost: isHost,
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });

    setChatInput('');
  };

  const handleSyncPlayback = (e) => {
    e.preventDefault();
    if (!channelRef.current) return;

    const min = parseInt(syncMin) || 0;
    const sec = parseInt(syncSec) || 0;
    const totalSeconds = min * 60 + sec;

    const senderName = activeProfile?.name || user?.email?.split('@')[0] || 'Guest';

    channelRef.current.send({
      type: 'broadcast',
      event: 'sync-time',
      payload: { 
        seconds: totalSeconds,
        sender: senderName
      }
    });
  };

  const handleSliderChange = (e) => {
    const totalSecs = parseInt(e.target.value) || 0;
    setSyncMin(Math.floor(totalSecs / 60).toString());
    setSyncSec((totalSecs % 60).toString());
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (isTerminated) {
    return (
      <div className="watch-page error terminated">
        <Navbar />
        <div className="error-container glass animate-fade-in" style={{ padding: '48px', maxWidth: '500px', margin: '100px auto', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
          <ShieldAlert size={64} style={{ color: 'var(--red-error)', margin: '0 auto var(--space-lg)', filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.4))' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)' }}>Watch Party Terminated</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', fontSize: 'var(--text-base)' }}>⚠️ This Watch Party room has been terminated by an administrator.</p>
          <button className="btn btn-primary" style={{ background: 'var(--gradient-accent)', width: '100%' }} onClick={() => navigate('/')}>Return to Home</button>
        </div>
        <Footer />
      </div>
    );
  }

  const isPartyActive = !!partyParam;
  const showSidebar = type === 'series' || isPartyActive;

  return (
    <div className="watch-page">
      <Navbar />
      
      <div className="watch-content">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} /> Back
        </button>

        <div className={`watch-layout ${showSidebar ? 'has-sidebar' : ''}`}>
          
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
              startTime={partyStartTime}
              defaultServer={serverParam}
            />
            
            {/* Watch Party Hosting / Joining Panel */}
            {!isPartyActive && (
              <div className="party-host-panel glass">
                <div className="panel-desc">
                  <h3>🎉 Watch Party Mode</h3>
                  <p>Stream this {type === 'series' ? 'episode' : 'movie'} together with friends in perfect synchronization!</p>
                </div>
                <div className="panel-actions">
                  <button className="btn btn-primary" onClick={handleHostParty}>
                    Host Watch Party
                  </button>
                  <form onSubmit={handleJoinParty} className="party-join-form">
                    <input 
                      type="text" 
                      placeholder="Enter Room Code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary">Join</button>
                  </form>
                </div>
              </div>
            )}

            {isPartyActive && (
              <div className="party-info-banner glass">
                <div className="banner-left">
                  <span className="party-badge">LIVE PARTY</span>
                  <span className="party-room-code">Room Code: <strong>{partyParam}</strong></span>
                </div>
                <div className="banner-right">
                  <button className="btn btn-secondary invite-btn" onClick={copyInviteLink}>
                    {copied ? <><Check size={16} /> Copied</> : <><Share2 size={16} /> Copy Invite Link</>}
                  </button>
                  <button className="btn btn-secondary leave-party-btn" onClick={handleLeaveParty}>
                    <LogOut size={16} /> Leave Party
                  </button>
                </div>
              </div>
            )}
            
            <div className="watch-meta">
              <p className="watch-description">{details.description}</p>
            </div>
          </div>

          {/* Right Sidebar (Episode list or Party chat tabs) */}
          {showSidebar && (
            <div className="watch-sidebar">
              {/* Tabs header if both series and party are active */}
              {type === 'series' && isPartyActive ? (
                <div className="sidebar-tabs">
                  <button 
                    className={`tab-btn ${activeTab === 'episodes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('episodes')}
                  >
                    <Tv size={16} /> Episodes
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'party' ? 'active' : ''}`}
                    onClick={() => setActiveTab('party')}
                  >
                    <Users size={16} /> Party Chat
                  </button>
                </div>
              ) : null}

              {/* Episode List Selection */}
              {(type === 'series' && (!isPartyActive || activeTab === 'episodes')) && (
                <div className="episodes-wrapper">
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

              {/* Watch Party Chat Panel */}
              {(isPartyActive && (type !== 'series' || activeTab === 'party')) && (
                <div className="party-chat-panel">
                  {/* Participant avatars */}
                  <div className="participants-bar glass">
                    <span className="participants-count"><Users size={14} /> {participants.length} Online</span>
                    <div className="avatars-row">
                      {participants.map((p, idx) => (
                        <span 
                          key={idx} 
                          className="participant-avatar"
                          style={{ backgroundColor: p.color }}
                          title={p.name}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sync Playback Tool */}
                  {(controlMode === 'host-only' && !isHost) ? (
                    <div className="playback-sync-tool locked glass">
                      <span className="tool-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '11px', justifyContent: 'center' }}>
                        <Lock size={12} className="text-secondary" /> Playback controls are restricted to the host.
                      </span>
                    </div>
                  ) : (
                    <div className="playback-sync-tool glass">
                      <span className="tool-title">Sync playback time for all:</span>
                      <form onSubmit={handleSyncPlayback} className="sync-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="sync-slider-wrapper" style={{ width: '100%' }}>
                          <input 
                            type="range" 
                            min="0" 
                            max="7200" 
                            value={(parseInt(syncMin) || 0) * 60 + (parseInt(syncSec) || 0)} 
                            onChange={handleSliderChange}
                            className="sync-slider"
                            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            <span>0:00</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                              {Math.floor(((parseInt(syncMin) || 0) * 60 + (parseInt(syncSec) || 0)) / 60)}:
                              {(((parseInt(syncMin) || 0) * 60 + (parseInt(syncSec) || 0)) % 60).toString().padStart(2, '0')}
                            </span>
                            <span>2:00:00</span>
                          </div>
                        </div>
                        <div className="sync-inputs" style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                          <input 
                            type="number" 
                            placeholder="Min" 
                            min="0"
                            value={syncMin}
                            onChange={(e) => setSyncMin(e.target.value)}
                            required
                            style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-glass-medium)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'white', textAlign: 'center' }}
                          />
                          <span className="colon" style={{ color: 'var(--text-secondary)' }}>:</span>
                          <input 
                            type="number" 
                            placeholder="Sec" 
                            min="0"
                            max="59"
                            value={syncSec}
                            onChange={(e) => setSyncSec(e.target.value)}
                            required
                            style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-glass-medium)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'white', textAlign: 'center' }}
                          />
                          <button type="submit" className="btn btn-primary sync-btn" style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}>Sync</button>
                        </div>
                        <div className="sync-tweaks" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '6px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}
                            onClick={() => {
                              const totalSecs = Math.max(0, ((parseInt(syncMin) || 0) * 60 + (parseInt(syncSec) || 0)) - 30);
                              setSyncMin(Math.floor(totalSecs / 60).toString());
                              setSyncSec((totalSecs % 60).toString());
                            }}
                          >
                            -30s
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '6px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}
                            onClick={() => {
                              const totalSecs = Math.max(0, ((parseInt(syncMin) || 0) * 60 + (parseInt(syncSec) || 0)) + 30);
                              setSyncMin(Math.floor(totalSecs / 60).toString());
                              setSyncSec((totalSecs % 60).toString());
                            }}
                          >
                            +30s
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Chat messages stream */}
                  <div className="chat-messages">
                    {messages.length === 0 ? (
                      <div className="chat-empty">
                        <p>No messages yet.</p>
                        <p className="subtext">Send a message to start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        if (msg.isSystem) {
                          return (
                            <div key={msg.id} className="chat-msg system-msg animate-fade-in">
                              <p className="msg-text">{msg.text}</p>
                            </div>
                          );
                        }
                        return (
                          <div key={msg.id} className="chat-msg animate-fade-in">
                            <div className="msg-header">
                              <span className="msg-sender">
                                {msg.sender}
                                {msg.isHost && <span className="host-chat-badge">HOST</span>}
                              </span>
                              <span className="msg-time">{msg.time}</span>
                            </div>
                            <p className="msg-text">{msg.text}</p>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input Form */}
                  <form onSubmit={handleSendChat} className="chat-input-bar">
                    <input 
                      type="text" 
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      required
                    />
                    <button type="submit" className="chat-send-btn" aria-label="Send">
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      
      <Footer />
    </div>
  );
}
