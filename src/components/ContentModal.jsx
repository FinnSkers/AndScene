/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Plus, Check, ThumbsUp, ThumbsDown, Share2, Loader2, Sparkles, Star, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchDetails } from '../services/tmdb';
import { generateAISummary } from '../services/ai';
import { supabase } from '../services/supabaseClient';
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
  const { modalContent, closeModal, toggleMyList, isInMyList, openModal, user, activeProfile } = useApp();
  const navigate = useNavigate();
  const [detailedContent, setDetailedContent] = useState(null);
  const [loading, setLoading] = useState(false);

  // New Features State
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

  const handleGenerateRecap = async () => {
    setIsGeneratingAi(true);
    setAiSummary('');
    try {
      const isTv = displayContent.type === 'tv' || displayContent.type === 'series';
      const summary = await generateAISummary(displayContent.title, isTv);
      setAiSummary(summary);
    } catch (err) {
      console.error('AI error', err);
      setAiSummary('Failed to generate summary. Check your API key or try again.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!activeProfile?.id || !user?.id || user?.isTemp || rating === 0) {
      alert("You must select a rating and be logged in to review.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      await supabase.from('reviews').insert([{
        profile_id: activeProfile.id,
        media_id: displayContent.id.toString(),
        media_type: displayContent.type || 'movie',
        rating,
        review_text: reviewText
      }]);
      setReviewText('');
      setRating(0);
      alert('Review posted to the Social Feed!');
    } catch (err) {
      console.error(err);
      alert('Error posting review');
    } finally {
      setIsSubmittingReview(false);
    }
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
                  <button className="btn btn-secondary ai-btn" onClick={handleGenerateRecap} disabled={isGeneratingAi}>
                    {isGeneratingAi ? <Loader2 className="spinner" size={16} /> : <Sparkles size={16} />}
                    {displayContent.type === 'series' || displayContent.type === 'tv' ? 'AI Recap' : 'AI Pitch'}
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
                        <span className="match-score">⭐ {displayContent.voteAverage || (displayContent.match / 10).toFixed(1)}</span>
                        <span className="modal__meta-year">{displayContent.year}</span>
                        <span className="maturity-badge">{displayContent.rating}</span>
                        <span className="modal__meta-duration">{displayContent.duration}</span>
                      </div>
                      <p className="modal__description">{displayContent.description}</p>
                      
                      {/* AI Summary Box */}
                      <AnimatePresence>
                        {(isGeneratingAi || aiSummary) && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="ai-summary-box"
                          >
                            <div className="ai-summary-header">
                              <Sparkles size={16} className="text-primary" />
                              <h4>AI Insight</h4>
                            </div>
                            <p>{isGeneratingAi ? 'Generating brilliant insights...' : aiSummary}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
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

                  {/* Social Review Form */}
                  {!user?.isTemp && (
                    <div className="modal__review-section">
                      <h3 className="modal__section-title">Leave a Review</h3>
                      <form className="review-form" onSubmit={handleSubmitReview}>
                        <div className="review-stars">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              className={`star-btn ${star <= rating ? 'active' : ''}`}
                              onClick={() => setRating(star)}
                            >
                              <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                        <div className="review-input-group">
                          <textarea 
                            placeholder="What did you think?"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            maxLength={500}
                            rows={3}
                          />
                          <button type="submit" className="btn btn-primary" disabled={isSubmittingReview || rating === 0}>
                            {isSubmittingReview ? <Loader2 className="spinner" size={16} /> : <Send size={16} />}
                            Post
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

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
                                  ⭐ {item.voteAverage || (item.match / 10).toFixed(1)}
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
