import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Plus, Check, ThumbsUp, ThumbsDown, Share2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchDetails } from '../services/tmdb';
import './ContentModal.css';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { delay: 0.1 } },
};

const modalVariants = {
  hidden: { x: '100%', opacity: 0.9 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 26, stiffness: 220 } },
  exit: { x: '100%', opacity: 0.9, transition: { duration: 0.25 } },
};

export default function ContentModal() {
  const { modalContent, closeModal, toggleMyList, isInMyList, openModal } = useApp();
  const navigate = useNavigate();
  const [detailedContent, setDetailedContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const inList = detailedContent ? isInMyList(detailedContent.id) : (modalContent ? isInMyList(modalContent.id) : false);

  useEffect(() => {
    if (modalContent) {
      setLoading(true);
      fetchDetails(modalContent.id, modalContent.type || 'movie')
        .then(data => setDetailedContent(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setDetailedContent(null);
    }
  }, [modalContent]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeModal]);

  const displayContent = detailedContent || modalContent;

  const handlePlay = () => {
    closeModal();
    navigate(`/watch/${displayContent.type || 'movie'}/${displayContent.id}`);
  };

  return (
    <AnimatePresence>
      {modalContent && (
        <motion.div
          className="modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={closeModal}
        >
          <motion.div
            className="modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hero section */}
            <div className="modal__hero">
              <img
                className="modal__hero-image"
                src={displayContent.backdrop || displayContent.poster}
                alt={displayContent.title}
              />
              <div className="modal__hero-gradient" />

              <button className="modal__close" onClick={closeModal} aria-label="Close">
                <X size={20} />
              </button>

              <div className="modal__hero-content">
                <h2 className="modal__title">{displayContent.title}</h2>
                <div className="modal__hero-actions">
                  <button className="btn btn-primary" onClick={handlePlay}>
                    <Play size={20} fill="currentColor" /> Play
                  </button>
                  <button
                    className="btn-icon large"
                    title={inList ? 'Remove from My List' : 'Add to My List'}
                    onClick={() => toggleMyList(displayContent)}
                  >
                    {inList ? <Check size={20} /> : <Plus size={20} />}
                  </button>
                  <button className="btn-icon large" title="I like this">
                    <ThumbsUp size={20} />
                  </button>
                  <button className="btn-icon large" title="Not for me">
                    <ThumbsDown size={20} />
                  </button>
                  <button className="btn-icon large" title="Share">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="modal__body">
              {loading && !detailedContent ? (
                 <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                   <Loader2 className="spinner" size={32} />
                 </div>
              ) : (
                <>
                  <div className="modal__info-grid">
                    {/* Left column */}
                    <div>
                      <div className="modal__meta">
                        <span className="match-score">{displayContent.match}% Match</span>
                        <span className="modal__meta-year">{displayContent.year}</span>
                        <span className="maturity-badge">{displayContent.rating}</span>
                        <span className="modal__meta-duration">{displayContent.duration}</span>
                      </div>
                      <p className="modal__description">{displayContent.description}</p>
                    </div>

                    {/* Right column / sidebar */}
                    <div>
                      {displayContent.cast && displayContent.cast.length > 0 && (
                        <>
                          <p className="modal__sidebar-label">Cast:</p>
                          <p className="modal__sidebar-value">{displayContent.cast.join(', ')}</p>
                        </>
                      )}
                      {displayContent.genre && displayContent.genre.length > 0 && (
                        <>
                          <p className="modal__sidebar-label">Genres:</p>
                          <p className="modal__sidebar-value">{displayContent.genre.join(', ')}</p>
                        </>
                      )}
                      {displayContent.director && (
                        <>
                          <p className="modal__sidebar-label">Director:</p>
                          <p className="modal__sidebar-value">{displayContent.director}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* More Like This */}
                  {displayContent.similar && displayContent.similar.length > 0 && (
                    <>
                      <h3 className="modal__section-title">More Like This</h3>
                      <div className="modal__similar-grid">
                        {displayContent.similar.map((item) => (
                          <div
                            key={item.id}
                            className="modal__similar-card"
                            onClick={() => openModal(item)}
                          >
                            <div className="modal__similar-image">
                              <img src={item.backdrop || item.poster} alt={item.title} loading="lazy" />
                              <div className="modal__similar-image-overlay" />
                            </div>
                            <div className="modal__similar-info">
                              <div className="modal__similar-header">
                                <span className="modal__similar-title">{item.title}</span>
                                <span className="modal__similar-year">{item.year}</span>
                              </div>
                              <div className="modal__similar-meta">
                                <span className="match-score" style={{ fontSize: 'var(--text-xs)' }}>
                                  {item.match}% Match
                                </span>
                                <span className="maturity-badge">{item.rating}</span>
                              </div>
                              <p className="modal__similar-desc">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
