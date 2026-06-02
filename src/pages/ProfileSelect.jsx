import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { profiles } from '../data/movies';
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
  const { setActiveProfile } = useApp();

  const handleSelect = (profile) => {
    setActiveProfile(profile);
    navigate('/home');
  };

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
        {profiles.map((profile) => (
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
              style={{ '--profile-color': profile.color }}
            >
              <img src={profile.avatar} alt={profile.name} />
            </div>
            <span className="profile-name">{profile.name}</span>
          </motion.div>
        ))}

        {/* Add Profile */}
        <motion.div
          className="add-profile-card"
          variants={cardVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
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
    </div>
  );
}
