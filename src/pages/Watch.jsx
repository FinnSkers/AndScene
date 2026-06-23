import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Loader2, Users, Send, Share2, LogOut, Tv, Check, ShieldAlert, Lock, Download, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VideoPlayer from '../components/VideoPlayer';
import { fetchDetails, fetchSeasonDetails } from '../services/tmdb';
import ContentRow from '../components/ContentRow';
import './Watch.css';

export default function Watch() {
  const { type: rawType, id } = useParams();
  const type = rawType === 'tv' ? 'series' : rawType;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, activeProfile, addToContinueWatching, showToast } = useApp();
  
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [directStreamUrl, setDirectStreamUrl] = useState('');
  
  const seasonParam = parseInt(searchParams.get('s')) || 1;
  const episodeParam = parseInt(searchParams.get('e')) || 1;
  const partyParam = searchParams.get('party') || '';
  const isHost = searchParams.get('host') === 'true';
  const controlMode = searchParams.get('mode') || 'host-only';
  const serverParam = searchParams.get('server') !== null ? parseInt(searchParams.get('server')) : -1;

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

  // WebRTC Video Call States & Refs
  const [inVideoCall, setInVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  
  const pcsRef = useRef({});
  const localStreamRef = useRef(null);

  const userDisplayName = useMemo(() => {
    return activeProfile?.name || user?.email?.split('@')[0] || `Guest_${Math.floor(Math.random() * 1000)}`;
  }, [activeProfile, user]);

  // Refs for tracking host playback time for auto-syncing new joiners
  const hostPlaybackStartSecondsRef = useRef(0);
  const hostPlaybackStartTimestampRef = useRef(null);

  const getHostCurrentTime = () => {
    if (!hostPlaybackStartTimestampRef.current) return 0;
    const elapsed = Math.floor((Date.now() - hostPlaybackStartTimestampRef.current) / 1000);
    return hostPlaybackStartSecondsRef.current + elapsed;
  };

  const updateHostPlaybackTracking = (seconds) => {
    hostPlaybackStartSecondsRef.current = seconds;
    hostPlaybackStartTimestampRef.current = Date.now();
  };

  // Initialize host tracking to 0 on mount if host
  useEffect(() => {
    if (isHost) {
      updateHostPlaybackTracking(0);
    }
  }, [isHost]);

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

              // If a guest joins and we are the host, automatically send them our current estimated time
              if (isHost) {
                const totalSeconds = getHostCurrentTime();
                const senderName = activeProfile?.name || user?.email?.split('@')[0] || 'Host';
                channel.send({
                  type: 'broadcast',
                  event: 'sync-time',
                  payload: {
                    seconds: totalSeconds,
                    sender: senderName
                  }
                });
              }
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
        const nextParams = { s: payload.season, e: payload.episode, party: partyParam, host: isHost ? 'true' : 'false', mode: controlMode };
        if (serverParam !== -1) nextParams.server = serverParam;
        setSearchParams(nextParams);
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          isSystem: true,
          text: `📺 ${payload.sender} changed episode to Season ${payload.season} Episode ${payload.episode}`
        }]);
      })
      .on('broadcast', { event: 'webrtc-join' }, ({ payload }) => {
        if (payload.sender === userDisplayName) return;
        if (localStreamRef.current) {
          initiatePeerConnection(payload.sender);
        }
      })
      .on('broadcast', { event: 'webrtc-leave' }, ({ payload }) => {
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[payload.sender];
          return next;
        });
        if (pcsRef.current[payload.sender]) {
          pcsRef.current[payload.sender].close();
          delete pcsRef.current[payload.sender];
        }
      })
      .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
        if (payload.target !== userDisplayName) return;
        handleWebRTCSignal(payload.sender, payload);
      })
      .on('broadcast', { event: 'room-terminated' }, () => {
        setIsTerminated(true);
      })
      .on('broadcast', { event: 'request-sync' }, () => {
        // Respond to sync requests if we are the host
        if (isHost) {
          const totalSeconds = getHostCurrentTime();
          const senderName = activeProfile?.name || user?.email?.split('@')[0] || 'Host';
          channel.send({
            type: 'broadcast',
            event: 'sync-time',
            payload: {
              seconds: totalSeconds,
              sender: senderName
            }
          });
        }
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: userDisplayName,
          color: userColor
        });

        // Request initial playback sync if we are joining as a guest
        if (!isHost) {
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'request-sync',
              payload: {}
            });
          }, 800);
        }
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      leaveVideoCall();
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

    const nextParams = { s: seasonNum, e: episodeNum, party: partyParam, host: isHost ? 'true' : 'false', mode: controlMode };
    if (serverParam !== -1) nextParams.server = serverParam;
    setSearchParams(nextParams);

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
    const nextParams = { s: e.target.value, e: 1, party: partyParam, host: isHost ? 'true' : 'false', mode: controlMode };
    if (serverParam !== -1) nextParams.server = serverParam;
    setSearchParams(nextParams);
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
      supabase
        .from('watch_parties')
        .delete()
        .eq('room_code', partyParam)
        .then(({ error }) => {
          if (error) console.warn('Lobby room cleanup ignored (table watch_parties might be missing).');
        });
    }
    leaveVideoCall();
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

  // ── WebRTC Social Calls Connection Broker ──
  const sendWebRTCSignal = (payload) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          sender: userDisplayName,
          ...payload
        }
      });
    }
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setInVideoCall(true);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-join',
          payload: { sender: userDisplayName }
        });
      }
    } catch (err) {
      console.error('Failed to access camera/mic:', err);
      showToast('Camera and microphone access is required for video calls.');
    }
  };

  const leaveVideoCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    
    Object.keys(pcsRef.current).forEach(name => {
      if (pcsRef.current[name]) {
        pcsRef.current[name].close();
      }
    });
    pcsRef.current = {};
    setRemoteStreams({});
    setInVideoCall(false);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-leave',
        payload: { sender: userDisplayName }
      });
    }
  };

  const initiatePeerConnection = async (targetName) => {
    if (pcsRef.current[targetName]) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcsRef.current[targetName] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendWebRTCSignal({
          target: targetName,
          candidate: e.candidate
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams(prev => ({
        ...prev,
        [targetName]: e.streams[0]
      }));
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendWebRTCSignal({
        target: targetName,
        sdp: offer
      });
    } catch (err) {
      console.error('Failed to create offer for peer', targetName, err);
    }
  };

  const handleWebRTCSignal = async (senderName, signal) => {
    let pc = pcsRef.current[senderName];

    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcsRef.current[senderName] = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendWebRTCSignal({
            target: senderName,
            candidate: e.candidate
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStreams(prev => ({
          ...prev,
          [senderName]: e.streams[0]
        }));
      };
    }

    if (signal.sdp) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendWebRTCSignal({
            target: senderName,
            sdp: answer
          });
        }
      } catch (err) {
        console.error('Error handling WebRTC SDP from', senderName, err);
      }
    } else if (signal.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (err) {
        console.error('Error adding WebRTC ICE candidate from', senderName, err);
      }
    }
  };

  // Video call unmount cleanup hook
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.keys(pcsRef.current).forEach(name => {
        if (pcsRef.current[name]) pcsRef.current[name].close();
      });
    };
  }, []);

  const handleSyncPlayback = (e) => {
    e.preventDefault();
    if (!channelRef.current) return;

    const min = parseInt(syncMin) || 0;
    const sec = parseInt(syncSec) || 0;
    const totalSeconds = min * 60 + sec;

    updateHostPlaybackTracking(totalSeconds);

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
        <div className="watch-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <button className="back-btn" onClick={() => navigate(-1)} style={{ margin: 0 }}>
            <ArrowLeft size={24} /> Back
          </button>
          <button 
            className="btn btn-secondary download-trigger-btn"
            onClick={() => setIsDownloadModalOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              fontSize: '13px', 
              fontWeight: '600', 
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Download size={16} /> Download {type === 'series' ? 'Episode' : 'Movie'}
          </button>
        </div>

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
              onDirectUrlChange={setDirectStreamUrl}
              details={details}
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
              {isPartyActive && (
                <div className="sidebar-tabs">
                  {type === 'series' && (
                    <button 
                      className={`tab-btn ${activeTab === 'episodes' ? 'active' : ''}`}
                      onClick={() => setActiveTab('episodes')}
                    >
                      <Tv size={16} /> Episodes
                    </button>
                  )}
                  <button 
                    className={`tab-btn ${activeTab === 'party' ? 'active' : ''}`}
                    onClick={() => setActiveTab('party')}
                  >
                    <Users size={16} /> Party Chat
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'videocall' ? 'active' : ''}`}
                    onClick={() => setActiveTab('videocall')}
                  >
                    <Video size={16} /> Video Call
                  </button>
                </div>
              )}

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

              {/* Video Call Panel */}
              {isPartyActive && activeTab === 'videocall' && (
                <div className="video-call-sidebar-panel">
                  {!inVideoCall ? (
                    <div className="video-call-join-card">
                      <Video size={40} style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 10px var(--accent-glow))', marginBottom: '16px' }} />
                      <h3>Face-to-Face Stream</h3>
                      <p>Turn on your camera and microphone to video call with friends while watching!</p>
                      <button className="btn btn-primary join-call-btn" onClick={startVideoCall}>
                        Join Video Call
                      </button>
                    </div>
                  ) : (
                    <div className="video-call-active-container">
                      <div className="video-call-grid">
                        {/* Local Stream */}
                        {localStream && (
                          <div className="video-tile local-tile">
                            <video
                              ref={el => { if (el) el.srcObject = localStream; }}
                              autoPlay
                              playsInline
                              muted
                              className="video-tile-element"
                              style={{ transform: 'scaleX(-1)' }} 
                            />
                            <span className="video-tile-label">You</span>
                          </div>
                        )}

                        {/* Remote Streams */}
                        {Object.keys(remoteStreams).map(name => (
                          <div key={name} className="video-tile">
                            <video
                              ref={el => { if (el) el.srcObject = remoteStreams[name]; }}
                              autoPlay
                              playsInline
                              className="video-tile-element"
                            />
                            <span className="video-tile-label">{name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Video Call Controls */}
                      <div className="video-call-controls glass">
                        <button 
                          className={`call-control-btn ${isMicMuted ? 'muted' : ''}`}
                          onClick={() => {
                            if (localStreamRef.current) {
                              const audioTrack = localStreamRef.current.getAudioTracks()[0];
                              if (audioTrack) {
                                audioTrack.enabled = !audioTrack.enabled;
                                setIsMicMuted(!audioTrack.enabled);
                              }
                            }
                          }}
                          title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                        >
                          {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>

                        <button 
                          className={`call-control-btn ${isCamMuted ? 'muted' : ''}`}
                          onClick={() => {
                            if (localStreamRef.current) {
                              const videoTrack = localStreamRef.current.getVideoTracks()[0];
                              if (videoTrack) {
                                videoTrack.enabled = !videoTrack.enabled;
                                setIsCamMuted(!videoTrack.enabled);
                              }
                            }
                          }}
                          title={isCamMuted ? 'Turn Cam On' : 'Turn Cam Off'}
                        >
                          {isCamMuted ? <VideoOff size={16} /> : <Video size={16} />}
                        </button>

                        <button 
                          className="call-control-btn disconnect-btn"
                          onClick={leaveVideoCall}
                          title="Leave Call"
                        >
                          <PhoneOff size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Cast & Crew Section ── */}
        {details?.credits?.cast && details.credits.cast.length > 0 && (
          <div className="watch-cast-section">
            <h2 className="section-title">Cast & Crew</h2>
            <div className="cast-scroll-container">
              {details.credits.cast.slice(0, 15).map((person) => (
                <div key={person.id} className="cast-card">
                  <div className="cast-avatar-wrapper">
                    {person.profile_path ? (
                      <img 
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} 
                        alt={person.name} 
                        className="cast-avatar"
                        loading="lazy"
                      />
                    ) : (
                      <div className="cast-avatar-fallback">
                        <span>{person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                      </div>
                    )}
                  </div>
                  <span className="cast-name">{person.name}</span>
                  <span className="cast-character">{person.character}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Details Section ── */}
        <div className="watch-details-section glass">
          <h2 className="section-title">Details</h2>
          <div className="details-grid">
            {details?.genres && details.genres.length > 0 && (
              <div className="detail-item">
                <span className="detail-label">Genres</span>
                <span className="detail-value">{details.genres.join(', ')}</span>
              </div>
            )}
            {details?.productionCompanies && details.productionCompanies.length > 0 && (
              <div className="detail-item">
                <span className="detail-label">Production</span>
                <span className="detail-value">{details.productionCompanies.join(', ')}</span>
              </div>
            )}
            {type === 'movie' ? (
              details?.runtime && (
                <div className="detail-item">
                  <span className="detail-label">Runtime</span>
                  <span className="detail-value">{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
                </div>
              )
            ) : (
              (details?.seasons || details?.episodes) && (
                <div className="detail-item">
                  <span className="detail-label">Info</span>
                  <span className="detail-value">
                    {details.seasons ? `${details.seasons} Seasons` : ''} 
                    {details.seasons && details.episodes ? ' • ' : ''} 
                    {details.episodes ? `${details.episodes} Episodes` : ''}
                  </span>
                </div>
              )
            )}
            {details?.voteAverage && (
              <div className="detail-item">
                <span className="detail-label">Rating</span>
                <span className="detail-value">★ {details.voteAverage.toFixed(1)} / 10</span>
              </div>
            )}
            {details?.status && (
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className="detail-value">{details.status}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Recommendations Section ── */}
        {details?.similar && details.similar.length > 0 && (
          <div className="watch-similar-section">
            <ContentRow title="More Like This" items={details.similar} />
          </div>
        )}

      </div>
      
      <Footer />

      {/* 📥 Premium Download Helper Modal */}
      {isDownloadModalOpen && (
        <div 
          className="download-modal-overlay animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 5, 10, 0.85)',
            backdropFilter: 'blur(16px)',
            webkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px'
          }}
          onClick={() => setIsDownloadModalOpen(false)}
        >
          <div 
            className="download-modal-content glass animate-scale-up"
            style={{
              background: 'rgba(20, 20, 35, 0.65)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              maxWidth: '550px',
              width: '100%',
              boxShadow: 'var(--shadow-elevated), 0 0 40px rgba(245, 166, 35, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', margin: 0, background: 'var(--gradient-accent)', webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent' }}>
                How to Download
              </h2>
              <button 
                onClick={() => setIsDownloadModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}
              >
                &times;
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Streaming servers serve content as HLS playlist segments (`.m3u8`) to protect bandwidth. Follow these steps to download the complete high-quality file directly to your device:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--bg-primary)', fontWeight: '700', fontSize: '12px', flexShrink: 0 }}>
                  1
                </span>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700' }}>Using Browser Extensions (Recommended)</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
                    Install <strong>Video DownloadHelper</strong> or <strong>DownThemAll!</strong> on your browser (Chrome/Firefox). Once the movie starts playing, click the extension icon and hit download to capture and merge the stream.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--bg-primary)', fontWeight: '700', fontSize: '12px', flexShrink: 0 }}>
                  2
                </span>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700' }}>Using IDM (Internet Download Manager)</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
                    If you use IDM on your desktop, a floating <em>"Download this video"</em> panel will automatically pop up right above the active player. Just click it to fetch the full speed file.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--bg-primary)', fontWeight: '700', fontSize: '12px', flexShrink: 0 }}>
                  3
                </span>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700' }}>Switch Server for Direct Download Option</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
                    If direct links are available, switch to server choices that provide native files (like file-hosts or select embeds) to save them directly from the player.
                  </p>
                </div>
              </div>
            </div>

            {directStreamUrl && (
              <a 
                href={directStreamUrl} 
                download={`andscene_${details.title.toLowerCase().replace(/\s+/g, '_')}_stream.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px',
                  background: 'var(--gradient-accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '700',
                  color: 'var(--bg-primary)',
                  textDecoration: 'none',
                  marginBottom: '16px',
                  boxShadow: 'var(--shadow-glow)',
                  cursor: 'pointer'
                }}
              >
                <Download size={18} /> Download Direct Media File
              </a>
            )}

            <button 
              className="btn btn-primary"
              onClick={() => setIsDownloadModalOpen(false)}
              style={{ width: '100%', background: directStreamUrl ? 'rgba(255, 255, 255, 0.08)' : 'var(--gradient-accent)', border: directStreamUrl ? '1px solid var(--border-subtle)' : 'none', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: '700', color: directStreamUrl ? 'var(--text-primary)' : 'var(--bg-primary)' }}
            >
              {directStreamUrl ? 'Close Info' : "Got it, let's stream!"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
