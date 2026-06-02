import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { supabase } from './services/supabaseClient';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ProfileSelect from './pages/ProfileSelect';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Anime from './pages/Anime';
import Watch from './pages/Watch';
import WatchParty from './pages/WatchParty';
import Admin from './pages/Admin';
import Signup from './pages/Signup';
import ContinueWatchingWidget from './components/ContinueWatchingWidget';
import TMDBSettingsModal from './components/TMDBSettingsModal';
import RequireAdmin from './components/RequireAdmin';
import UserManagement from './pages/UserManagement';
function App() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceEta, setMaintenanceEta] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { data, error } = await supabase
          .from('watch_parties')
          .select('*')
          .eq('room_code', 'SYSTEM_MAINTENANCE')
          .single();
        if (!error && data) {
          setIsMaintenance(data.is_public);
          setMaintenanceEta(data.room_name || 'Soon');
        }
      } catch (err) {
        console.warn('Maintenance check query failed, defaulting to online mode.', err);
      } finally {
        setLoading(false);
      }
    };
    checkMaintenance();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0A0A12', color: '#F0F0F5' }}>
        <Loader2 className="spinner" size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Developer bypass check: bypass maintenance screens if URL is /admin or developer is unlocked
  const isBypassed = sessionStorage.getItem('admin_unlocked') === 'true' || window.location.pathname.startsWith('/admin');

  if (isMaintenance && !isBypassed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A12',
        color: '#F0F0F5',
        fontFamily: "'Space Grotesk', sans-serif",
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(16, 16, 28, 0.65)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '48px',
          borderRadius: '20px',
          maxWidth: '500px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 166, 35, 0.15)'
        }}>
          <ShieldAlert size={64} style={{ color: '#F5A623', margin: '0 auto 24px', filter: 'drop-shadow(0 0 15px rgba(245, 166, 35, 0.3))' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '16px' }}>Scheduled Maintenance</h1>
          <p style={{ color: '#9CA3B0', fontSize: '1rem', lineHeight: '1.6', marginBottom: '24px' }}>
            We are performing scheduled updates to optimize our streaming experience. We will be back online shortly!
          </p>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '0.875rem',
            color: '#F5A623',
            fontWeight: '600',
            border: '1px dashed rgba(245, 166, 35, 0.3)'
          }}>
            Estimated Completion: {maintenanceEta}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <ContinueWatchingWidget />
        <TMDBSettingsModal />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profiles" element={<ProfileSelect />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/anime" element={<Anime />} />
          <Route path="/watch-party" element={<WatchParty />} />
          <Route path="/watch/:type/:id" element={<Watch />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/users" element={<RequireAdmin><UserManagement /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
