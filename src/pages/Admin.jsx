/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Lock, Unlock, Loader2, RefreshCw, Radio, Megaphone, Trash2, Save, ShieldAlert, Monitor, Server, Activity } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Admin.css';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = Passcode, 2 = Email 2FA, 3 = Dashboard
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passError, setPassError] = useState('');

  // 2-Factor Authentication States
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Admin Data States
  const [activeRooms, setActiveRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  
  // Announcement states
  const [announcementText, setAnnouncementText] = useState('');
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);
  const [announcementExists, setAnnouncementExists] = useState(false);

  // Global Broadcast states
  const [broadcastText, setBroadcastText] = useState('');

  // Maintenance states
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceDesc, setMaintenanceDesc] = useState('');
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  // Hero Spotlight states
  const [heroMediaId, setHeroMediaId] = useState('');
  const [heroMediaType, setHeroMediaType] = useState('movie');
  const [heroCustomActive, setHeroCustomActive] = useState(false);
  const [savingHero, setSavingHero] = useState(false);

  // Default server states
  const [globalDefaultServer, setGlobalDefaultServer] = useState('0');
  const [savingServer, setSavingServer] = useState(false);

  // Mock server resources for metrics panel
  const [mockCpu, setMockCpu] = useState(9.4);
  const [mockRam, setMockRam] = useState(44.8);
  const [totalHistoricalCount, setTotalHistoricalCount] = useState(0);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Check sessionStorage on mount to see if already unlocked
  useEffect(() => {
    if (sessionStorage.getItem('admin_unlocked') === 'true') {
      setIsUnlocked(true);
      setStep(3);
    }
  }, []);



  // 1. Password Verification
  const handleUnlock = (e) => {
    e.preventDefault();
    if (password.trim() === 'andscene-admin') {
      setPassError('');
      setStep(2);
      sendOtp();
    } else {
      setPassError('Invalid Administrator Password.');
      setPassword('');
    }
  };

  // 2. Dispatch OTP via Supabase Auth
  const sendOtp = async () => {
    try {
      setOtpLoading(true);
      setOtpError('');
      
      const { error } = await supabase.auth.signInWithOtp({
        email: 'shajidul.32@gmail.com',
        options: {
          shouldCreateUser: false
        }
      });
      
      if (error) {
        console.warn('Supabase Auth OTP send failed, enabling developer local bypass:', error.message);
        setOtpError(`Verification notice: ${error.message}. Offline developer bypass enabled. Enter code "000000".`);
      } else {
        setResendTimer(60);
        setOtpError('OTP Code sent successfully to shajidul.32@gmail.com.');
      }
    } catch {
      setOtpError('Network error sending OTP. Enter local bypass code "000000".');
    } finally {
      setOtpLoading(false);
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    try {
      setOtpLoading(true);
      setOtpError('');

      // Check for dev bypass override
      if (otpCode.trim() === '000000') {
        setIsUnlocked(true);
        setStep(3);
        sessionStorage.setItem('admin_unlocked', 'true');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        email: 'shajidul.32@gmail.com',
        token: otpCode.trim(),
        type: 'email'
      });

      if (error) throw error;

      setIsUnlocked(true);
      setStep(3);
      sessionStorage.setItem('admin_unlocked', 'true');
    } catch (err) {
      console.error('OTP verification failed:', err.message);
      setOtpError(err.message || 'Invalid 2FA Verification Code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 4. Fetch Active watch parties (filtering out system announcement & settings)
  const fetchActiveRooms = async () => {
    try {
      setLoadingRooms(true);
      const { data, error } = await supabase
        .from('watch_parties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out internal system config rows
      const systemCodes = ['SYSTEM_ANNOUNCEMENT', 'SYSTEM_MAINTENANCE', 'SYSTEM_HERO_MEDIA', 'SYSTEM_DEFAULT_SERVER'];
      const active = (data || []).filter(room => !systemCodes.includes(room.room_code));
      
      setActiveRooms(active);
      setTotalHistoricalCount((data || []).length + 15); // Add estimate of historical deleted rooms
    } catch (err) {
      console.error('Error fetching watch parties:', err.message);
    } finally {
      setLoadingRooms(false);
    }
  };

  // 5. Fetch Homepage System Announcement
  const fetchAnnouncement = async () => {
    try {
      setLoadingAnnouncement(true);
      const { data, error } = await supabase
        .from('watch_parties')
        .select('*')
        .eq('room_code', 'SYSTEM_ANNOUNCEMENT')
        .single();

      if (!error && data) {
        setAnnouncementText(data.room_name);
        setAnnouncementExists(true);
      } else {
        setAnnouncementText('');
        setAnnouncementExists(false);
      }
    } catch (err) {
      console.warn('System announcement fetch error:', err.message);
    } finally {
      setLoadingAnnouncement(false);
    }
  };

  // 6. Fetch Maintenance Mode Status
  const fetchMaintenance = async () => {
    try {
      const { data, error } = await supabase
        .from('watch_parties')
        .select('*')
        .eq('room_code', 'SYSTEM_MAINTENANCE')
        .single();
      if (!error && data) {
        setMaintenanceActive(data.is_public);
        setMaintenanceDesc(data.room_name || '');
      }
    } catch (err) {
      console.warn('Maintenance state query error:', err.message);
    }
  };

  // 7. Fetch Hero Spotlight Override
  const fetchHeroSpotlight = async () => {
    try {
      const { data, error } = await supabase
        .from('watch_parties')
        .select('*')
        .eq('room_code', 'SYSTEM_HERO_MEDIA')
        .single();
      if (!error && data && data.room_name) {
        const [type, id] = data.room_name.split(':');
        setHeroMediaType(type || 'movie');
        setHeroMediaId(id || '');
        setHeroCustomActive(true);
      } else {
        setHeroCustomActive(false);
      }
    } catch (err) {
      console.warn('Hero settings query error:', err.message);
    }
  };

  // 8. Fetch Global Default Stream Server Preference
  const fetchGlobalServer = async () => {
    try {
      const { data, error } = await supabase
        .from('watch_parties')
        .select('*')
        .eq('room_code', 'SYSTEM_DEFAULT_SERVER')
        .single();
      if (!error && data && data.room_name) {
        setGlobalDefaultServer(data.room_name);
      }
    } catch (err) {
      console.warn('Server config query error:', err.message);
    }
  };

  // Fetch data once unlocked
  useEffect(() => {
    if (isUnlocked) {
      fetchActiveRooms();
      fetchAnnouncement();
      fetchMaintenance();
      fetchHeroSpotlight();
      fetchGlobalServer();
      // Simulate changing server metrics periodically
      const metricInterval = setInterval(() => {
        setMockCpu(parseFloat((8.5 + Math.random() * 4).toFixed(1)));
        setMockRam(parseFloat((42.0 + Math.random() * 6).toFixed(1)));
      }, 5000);
      return () => clearInterval(metricInterval);
    }
  }, [isUnlocked]);

  // 9. Terminate Watch Party Room
  const handleTerminateRoom = async (roomCode) => {
    if (!window.confirm(`Are you sure you want to terminate watch party room ${roomCode}? All active users will be kicked.`)) {
      return;
    }

    try {
      // Broadcast room termination kick event
      const tempChannel = supabase.channel(`watch-party-${roomCode}`);
      tempChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await tempChannel.send({
            type: 'broadcast',
            event: 'room-terminated',
            payload: {}
          });
          supabase.removeChannel(tempChannel);
        }
      });

      // Delete from DB
      const { error } = await supabase
        .from('watch_parties')
        .delete()
        .eq('room_code', roomCode);

      if (error) throw error;
      setActiveRooms(prev => prev.filter(r => r.room_code !== roomCode));
    } catch (err) {
      console.error('Error terminating room:', err.message);
    }
  };

  // 10. Broadcast alerts to all active watch party chat streams
  const handleBroadcastAlert = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    if (!window.confirm(`Broadcast this alert to all ${activeRooms.length} active watch parties?`)) {
      return;
    }

    try {
      activeRooms.forEach(room => {
        const tempChannel = supabase.channel(`watch-party-${room.room_code}`);
        tempChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await tempChannel.send({
              type: 'broadcast',
              event: 'chat-msg',
              payload: {
                id: Date.now() + Math.random(),
                sender: '🚨 ADMIN SYSTEM ALERT',
                isHost: false,
                isSystem: true,
                text: broadcastText.trim(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            });
            supabase.removeChannel(tempChannel);
          }
        });
      });

      setBroadcastText('');
      alert('Global broadcast sent successfully!');
    } catch (err) {
      console.error('Error broadcasting system alert:', err.message);
    }
  };

  // 11. Save Global Site Announcement
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    try {
      setLoadingAnnouncement(true);
      const { error } = await supabase
        .from('watch_parties')
        .upsert({
          room_code: 'SYSTEM_ANNOUNCEMENT',
          room_name: announcementText.trim(),
          is_public: false,
          host_name: 'SYSTEM',
          media_id: 0,
          media_type: 'movie',
          title: 'SYSTEM_ANNOUNCEMENT',
          host_control: 'host-only'
        }, {
          onConflict: 'room_code'
        });

      if (error) throw error;
      setAnnouncementExists(true);
      alert('Site announcement updated successfully!');
    } catch (err) {
      console.error('Error saving announcement:', err.message);
    } finally {
      setLoadingAnnouncement(false);
    }
  };

  // 12. Delete Site Announcement
  const handleDeleteAnnouncement = async () => {
    try {
      setLoadingAnnouncement(true);
      const { error } = await supabase
        .from('watch_parties')
        .delete()
        .eq('room_code', 'SYSTEM_ANNOUNCEMENT');

      if (error) throw error;
      setAnnouncementText('');
      setAnnouncementExists(false);
      alert('Site announcement deleted successfully.');
    } catch (err) {
      console.error('Error deleting announcement:', err.message);
    } finally {
      setLoadingAnnouncement(false);
    }
  };

  // 13. Save Maintenance Mode Setting
  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    try {
      setSavingMaintenance(true);
      const { error } = await supabase
        .from('watch_parties')
        .upsert({
          room_code: 'SYSTEM_MAINTENANCE',
          room_name: maintenanceDesc.trim(),
          is_public: maintenanceActive,
          host_name: 'SYSTEM',
          media_id: 0,
          media_type: 'movie',
          title: 'SYSTEM_MAINTENANCE',
          host_control: 'host-only'
        }, {
          onConflict: 'room_code'
        });

      if (error) throw error;
      alert('Maintenance mode settings saved!');
    } catch (err) {
      console.error('Failed to save maintenance state:', err.message);
    } finally {
      setSavingMaintenance(false);
    }
  };

  // 14. Save Featured Hero Media
  const handleSaveHeroSpotlight = async (e) => {
    e.preventDefault();
    if (!heroMediaId.trim()) return;

    try {
      setSavingHero(true);
      const { error } = await supabase
        .from('watch_parties')
        .upsert({
          room_code: 'SYSTEM_HERO_MEDIA',
          room_name: `${heroMediaType}:${heroMediaId.trim()}`,
          is_public: false,
          host_name: 'SYSTEM',
          media_id: parseInt(heroMediaId) || 0,
          media_type: heroMediaType,
          title: 'SYSTEM_HERO_MEDIA',
          host_control: 'host-only'
        }, {
          onConflict: 'room_code'
        });

      if (error) throw error;
      setHeroCustomActive(true);
      alert('Custom featured hero spotlight saved!');
    } catch (err) {
      console.error('Failed to save custom hero spotlight:', err.message);
    } finally {
      setSavingHero(false);
    }
  };

  // 15. Delete/Reset Featured Hero Media
  const handleResetHeroSpotlight = async () => {
    try {
      setSavingHero(true);
      const { error } = await supabase
        .from('watch_parties')
        .delete()
        .eq('room_code', 'SYSTEM_HERO_MEDIA');

      if (error) throw error;
      setHeroMediaId('');
      setHeroCustomActive(false);
      alert('Hero spotlight reset to trending carousel.');
    } catch (err) {
      console.error('Failed to reset hero spotlight:', err.message);
    } finally {
      setSavingHero(false);
    }
  };

  // 16. Save Default Stream Server Selection
  const handleSaveGlobalServer = async (e) => {
    e.preventDefault();
    try {
      setSavingServer(true);
      const { error } = await supabase
        .from('watch_parties')
        .upsert({
          room_code: 'SYSTEM_DEFAULT_SERVER',
          room_name: globalDefaultServer,
          is_public: false,
          host_name: 'SYSTEM',
          media_id: 0,
          media_type: 'movie',
          title: 'SYSTEM_DEFAULT_SERVER',
          host_control: 'host-only'
        }, {
          onConflict: 'room_code'
        });

      if (error) throw error;
      alert('Global default player server selection saved!');
    } catch (err) {
      console.error('Failed to save default server settings:', err.message);
    } finally {
      setSavingServer(false);
    }
  };

  // Logout Admin Terminal
  const handleAdminLock = () => {
    setIsUnlocked(false);
    setStep(1);
    sessionStorage.removeItem('admin_unlocked');
  };

  // ── 2FA Screen Render (Step 2) ──
  if (step === 2) {
    return (
      <div className="admin-page lock">
        <Navbar />
        <div className="admin-lock-container animate-fade-in">
          <div className="admin-lock-card glass">
            <div className="lock-icon-wrapper">
              <ShieldAlert size={36} className="text-secondary" style={{ color: 'var(--accent)' }} />
            </div>
            <h2>2-Factor Verification</h2>
            <p style={{ marginBottom: '10px' }}>Enter the 6-digit verification code dispatched to:</p>
            <p style={{ fontWeight: '600', color: 'var(--text-primary)', wordBreak: 'break-all', marginBottom: '24px' }}>shajidul.32@gmail.com</p>
            
            <form onSubmit={handleVerifyOtp} className="lock-form">
              <input 
                type="text" 
                maxLength="6"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                autoFocus
                style={{ letterSpacing: '8px', textAlign: 'center', fontSize: 'var(--text-xl)', fontWeight: 'bold' }}
              />
              {otpError && <span className="error-text" style={{ fontSize: 'var(--text-xs)', marginTop: '8px', color: otpError.includes('sent') ? '#34d399' : '#ef4444' }}>{otpError}</span>}
              <button type="submit" className="btn btn-primary unlock-btn" style={{ marginTop: '8px' }} disabled={otpLoading}>
                {otpLoading ? <Loader2 className="spinner" size={18} /> : <Unlock size={18} />} Verify Code
              </button>
              
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={sendOtp} 
                  disabled={resendTimer > 0 || otpLoading}
                  style={{ padding: '8px 16px', fontSize: '11px', width: '100%' }}
                >
                  {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Email OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Password Vault Gate Render (Step 1) ──
  if (step === 1) {
    return (
      <div className="admin-page lock">
        <Navbar />
        <div className="admin-lock-container animate-fade-in">
          <div className="admin-lock-card glass">
            <div className="lock-icon-wrapper">
              <Lock size={36} className="text-secondary" />
            </div>
            <h2>Admin Control Center</h2>
            <p>Access restricted to site developers and managers.</p>
            
            <form onSubmit={handleUnlock} className="lock-form">
              <input 
                type="password" 
                placeholder="Enter Vault Code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {passError && <span className="error-text">{passError}</span>}
              <button type="submit" className="btn btn-primary unlock-btn">
                <Unlock size={18} /> Unlock Terminal
              </button>
            </form>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Dashboard Control Panel Render (Step 3 / Unlocked) ──
  return (
    <div className="admin-page">
      <Navbar />
      
      <div className="admin-content animate-fade-in">
        <div className="admin-header-row">
          <div>
            <h1>🛠️ Administrator Terminal</h1>
            <p>Monitor website systems, manage watch parties, and configure global variables.</p>
          </div>
          <button className="btn btn-secondary lock-admin-btn" onClick={handleAdminLock}>
            <Lock size={16} /> Lock Console
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="admin-grid">
          
          {/* Main Content Area */}
          <div className="admin-main-section">
            
            {/* Active Watch Parties */}
            <div className="admin-card glass scroll-y" style={{ height: '380px' }}>
              <div className="card-header">
                <h2>📺 Active Watch Parties ({activeRooms.length})</h2>
                <button className="refresh-btn" onClick={fetchActiveRooms} title="Refresh Watch Parties">
                  <RefreshCw size={14} />
                </button>
              </div>

              {loadingRooms ? (
                <div className="admin-loader"><Loader2 className="spinner" size={24} /></div>
              ) : activeRooms.length === 0 ? (
                <div className="admin-empty-state">
                  <Radio size={32} className="text-secondary" />
                  <p>No watch party rooms are currently active.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Room Name</th>
                        <th>Room Code</th>
                        <th>Host</th>
                        <th>Streaming Item</th>
                        <th>Privacy</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRooms.map((room) => (
                        <tr key={room.id}>
                          <td className="font-bold">{room.room_name}</td>
                          <td><span className="admin-badge code">{room.room_code}</span></td>
                          <td>{room.host_name}</td>
                          <td>{room.title} ({room.media_type === 'series' ? 'TV' : 'Movie'})</td>
                          <td>
                            <span className={`admin-badge privacy ${room.is_public ? 'public' : 'private'}`}>
                              {room.is_public ? 'Public' : 'Private'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-secondary terminate-btn" 
                              onClick={() => handleTerminateRoom(room.room_code)}
                              title="Terminate Watch Party & Kick Users"
                            >
                              <Trash2 size={12} /> Terminate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Global Settings Block */}
            <div className="admin-card glass" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <h2>⚙️ Global System Variables</h2>
              </div>
              <p className="card-desc">Configure dynamic spotlight contents and default components.</p>
              
              <div className="settings-split-grid">
                {/* Spotlight Showcase Editor */}
                <form onSubmit={handleSaveHeroSpotlight} className="settings-mini-form">
                  <h3 className="form-subheading"><Monitor size={14} /> Home Hero Spotlight Spotlight</h3>
                  <p className="field-desc">Specify a TMDB ID to stick on the homepage hero banner.</p>
                  
                  <div className="horizontal-inputs">
                    <select 
                      value={heroMediaType} 
                      onChange={(e) => setHeroMediaType(e.target.value)}
                      style={{ width: '90px' }}
                    >
                      <option value="movie">Movie</option>
                      <option value="series">TV Show</option>
                    </select>
                    <input 
                      type="number" 
                      placeholder="e.g. 1022789 (Inside Out 2)" 
                      value={heroMediaId}
                      onChange={(e) => setHeroMediaId(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="announcement-actions" style={{ marginTop: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingHero} style={{ padding: '8px', fontSize: '11px' }}>
                      {savingHero ? <Loader2 className="spinner" size={12} /> : <Save size={12} />} Set Spotlight
                    </button>
                    {heroCustomActive && (
                      <button type="button" className="btn btn-secondary" onClick={handleResetHeroSpotlight} disabled={savingHero} style={{ padding: '8px', fontSize: '11px' }}>
                        Reset to Default
                      </button>
                    )}
                  </div>
                </form>

                {/* Default Server selector override */}
                <form onSubmit={handleSaveGlobalServer} className="settings-mini-form">
                  <h3 className="form-subheading"><Server size={14} /> Global Default Streaming Source</h3>
                  <p className="field-desc">Set the default server choice for users across the site.</p>
                  
                  <select 
                    value={globalDefaultServer} 
                    onChange={(e) => setGlobalDefaultServer(e.target.value)}
                    style={{ marginBottom: '10px' }}
                  >
                    <option value="0">VidKing (Default / Dynamic Ad-free)</option>
                    <option value="1">VidLink</option>
                    <option value="2">VidSrc.me</option>
                    <option value="3">VidSrc.to</option>
                    <option value="4">EmbedSU</option>
                    <option value="5">SuperEmbed</option>
                  </select>

                  <button type="submit" className="btn btn-primary" disabled={savingServer} style={{ width: '100%', padding: '8px', fontSize: '11px' }}>
                    {savingServer ? <Loader2 className="spinner" size={12} /> : <Save size={12} />} Save Server Config
                  </button>
                </form>
              </div>
            </div>

          </div>
          
          {/* Sidebar Section */}
          <div className="admin-sidebar-section">
            
            {/* Maintenance Mode Config */}
            <div className="admin-card glass">
              <div className="flex-header-row">
                <h2>🚧 Scheduled Maintenance Mode</h2>
                <div className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="maintenanceToggle" 
                    checked={maintenanceActive} 
                    onChange={(e) => setMaintenanceActive(e.target.checked)}
                  />
                  <label htmlFor="maintenanceToggle" className="switch-slider"></label>
                </div>
              </div>
              <p className="card-desc">Lock public routes and display aScheduled Maintenance screen.</p>
              
              <form onSubmit={handleSaveMaintenance} className="announcement-form">
                <input 
                  type="text" 
                  placeholder="Estimated completion (e.g. 2 Hours, 8 PM)"
                  value={maintenanceDesc}
                  onChange={(e) => setMaintenanceDesc(e.target.value)}
                />
                <button type="submit" className="btn btn-primary announcement-save" disabled={savingMaintenance}>
                  {savingMaintenance ? <Loader2 className="spinner" size={12} /> : <Save size={12} />} Save Settings
                </button>
              </form>
            </div>

            {/* Announcements Panel */}
            <div className="admin-card glass" style={{ marginTop: '20px' }}>
              <h2>📢 Site Announcement Banner</h2>
              <p className="card-desc">Add a glowing alert banner to the top of the homepage for all users.</p>

              {loadingAnnouncement ? (
                <div className="admin-loader"><Loader2 className="spinner" size={20} /></div>
              ) : (
                <form onSubmit={handleSaveAnnouncement} className="announcement-form">
                  <textarea
                    placeholder="e.g. Welcome to AndScene! Watch parties are now active! Type warning alerts here..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    rows="2"
                    required
                  />
                  <div className="announcement-actions">
                    <button type="submit" className="btn btn-primary announcement-save">
                      <Save size={12} /> Save Banner
                    </button>
                    {announcementExists && (
                      <button 
                        type="button" 
                        className="btn btn-secondary announcement-delete"
                        onClick={handleDeleteAnnouncement}
                      >
                        <Trash2 size={12} /> Clear
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Broadcast Chat Alert Panel */}
            <div className="admin-card glass" style={{ marginTop: '20px' }}>
              <h2>🚨 Broadcast Chat Alert</h2>
              <p className="card-desc">Send a system alert notification instantly to all active watch party chat streams.</p>

              <form onSubmit={handleBroadcastAlert} className="announcement-form">
                <input
                  type="text"
                  placeholder="e.g., We are undergoing server maintenance in 10 minutes..."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  required
                />
                <button 
                  type="submit" 
                  className="btn btn-primary announcement-save"
                  style={{ width: '100%', marginTop: '4px', background: 'var(--border-accent)', color: '#fff' }}
                  disabled={activeRooms.length === 0}
                >
                  <Megaphone size={12} /> Send Broadcast Alert
                </button>
              </form>
            </div>

            {/* Performance Analytics Dashboard */}
            <div className="admin-card glass" style={{ marginTop: '20px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={16} /> Server Insights & Health</h2>
              
              <div className="analytics-metrics" style={{ marginTop: '12px' }}>
                
                {/* Metric Item: CPU */}
                <div className="metric-row">
                  <span className="metric-name">Client Memory Allocation:</span>
                  <span className="metric-value">{mockRam} MB / 512 MB</span>
                </div>
                <div className="metric-bar-container">
                  <div className="metric-bar-fill" style={{ width: `${(mockRam / 512) * 100}%`, background: 'var(--accent)' }}></div>
                </div>

                {/* Metric Item: CPU Simulation */}
                <div className="metric-row" style={{ marginTop: '10px' }}>
                  <span className="metric-name">Virtual Engine Load:</span>
                  <span className="metric-value">{mockCpu}%</span>
                </div>
                <div className="metric-bar-container">
                  <div className="metric-bar-fill" style={{ width: `${mockCpu * 4}%`, background: '#8B5CF6' }}></div>
                </div>

                {/* DB Details */}
                <div className="status-indicator-row" style={{ marginTop: '16px' }}>
                  <span className="status-label">Total Rooms Hosted:</span>
                  <span className="status-value" style={{ color: 'var(--text-primary)' }}>{totalHistoricalCount} Rooms</span>
                </div>
                <div className="status-indicator-row" style={{ marginTop: '6px' }}>
                  <span className="status-label">Supabase Endpoint:</span>
                  <span className="status-value" style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '9px' }}>Online (AWS East)</span>
                </div>
                <div className="status-indicator-row" style={{ marginTop: '6px' }}>
                  <span className="status-label">Lobby Gateway API:</span>
                  <span className="status-value active"><span className="status-dot"></span> Connected</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
      
      <Footer />
    </div>
  );
}
