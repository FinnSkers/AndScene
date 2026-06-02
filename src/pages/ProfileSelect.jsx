import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './ProfileSelect.css';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
};

export default function ProfileSelect() {
  const navigate = useNavigate();
  const { user, userProfiles, createProfile, setActiveProfile } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to login if user session is not available
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSelect = (profile) => {
    setActiveProfile(profile);
    navigate('/');
  };

  const handleAddProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const newProf = await createProfile(name.trim());
      if (newProf) {
        setName('');
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Failed to create profile', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-select-page">
      <motion.h1
        className="profile-select-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Who&apos;s watching?
      </motion.h1>

      <motion.div
        className="profile-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {userProfiles.map((profile) => (
          <motion.div
            key={profile.id}
            className="profile-card"
            variants={cardVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(profile)}
          >
            <div
              className="profile-avatar-wrapper"
              style={{ '--profile-color': 'var(--accent)' }}
            >
              <img src={profile.avatar_url} alt={profile.name} />
            </div>
            <span className="profile-name">{profile.name}</span>
          </motion.div>
        ))}

        {/* Add Profile Card */}
        <motion.div
          className="add-profile-card"
          variants={cardVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAddForm(true)}
        >
          <div className="add-profile-icon">
            <Plus size={48} strokeWidth={1.5} />
          </div>
          <span className="add-profile-label">Add Profile</span>
        </motion.div>
      </motion.div>

      <motion.button
        className="manage-profiles-btn"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Manage Profiles
      </motion.button>

      {/* Add Profile Glass Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            className="profile-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddForm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 5, 10, 0.82)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            <motion.div 
              className="profile-modal glass"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%',
                maxWidth: '400px',
                padding: 'var(--space-2xl)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-modal)'
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Create Profile</h2>
              <form onSubmit={handleAddProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <input 
                  type="text" 
                  placeholder="Profile Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 1.2rem',
                    background: 'var(--bg-glass-medium)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all var(--transition-base)'
                  }}
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ flex: 1, padding: '0.8rem', cursor: 'pointer' }}
                  >
                    {loading ? 'Creating...' : 'Save'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowAddForm(false)}
                    style={{ flex: 1, padding: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
