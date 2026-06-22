import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Star, MessageCircle, Clock, User as UserIcon, Loader2, Play, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchDetails } from '../services/tmdb';
import './Social.css';

function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
}

const PAGE_SIZE = 10;

export default function Social() {
  const [reviews, setReviews] = useState([]);
  const [mediaDetails, setMediaDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState('latest'); // 'latest' or 'top_rated'
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const { openModal } = useApp();

  const fetchFeed = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const currentPage = isLoadMore ? page + 1 : 0;
    
    try {
      let query = supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          media_id,
          media_type,
          profiles ( name, avatar_url )
        `)
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
        
      if (sortBy === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const newReviews = data || [];
      if (newReviews.length < PAGE_SIZE) setHasMore(false);
      
      const updatedReviews = isLoadMore ? [...reviews, ...newReviews] : newReviews;
      setReviews(updatedReviews);
      setPage(currentPage);

      // Fetch TMDB details for missing media
      const uniqueMedia = [];
      newReviews.forEach(r => {
        const key = `${r.media_type}_${r.media_id}`;
        if (!mediaDetails[key] && !uniqueMedia.some(m => m.key === key)) {
          uniqueMedia.push({ key, id: r.media_id, type: r.media_type });
        }
      });

      if (uniqueMedia.length > 0) {
        const detailsPromises = uniqueMedia.map(async (m) => {
          try {
            const tmdbData = await fetchDetails(m.id, m.type);
            return { key: m.key, data: tmdbData };
          } catch (err) {
            console.error(`Failed to fetch TMDB data for ${m.key}`, err);
            return { key: m.key, data: null };
          }
        });
        
        const results = await Promise.all(detailsPromises);
        setMediaDetails(prev => {
          const next = { ...prev };
          results.forEach(r => {
            if (r.data) next[r.key] = r.data;
          });
          return next;
        });
      }

    } catch (err) {
      console.error('Error fetching social feed', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sortBy, page, reviews, mediaDetails]);

  // Initial load or sort change
  useEffect(() => {
    fetchFeed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  return (
    <div className="social-container page-content fade-in">
      <div className="social-header">
        <h1>Community Feed</h1>
        <p>See what everyone is watching and reviewing.</p>
      </div>
      
      <div className="social-filters">
        <button 
          className={`filter-btn ${sortBy === 'latest' ? 'active' : ''}`}
          onClick={() => setSortBy('latest')}
        >
          Latest Reviews
        </button>
        <button 
          className={`filter-btn ${sortBy === 'top_rated' ? 'active' : ''}`}
          onClick={() => setSortBy('top_rated')}
        >
          Top Rated
        </button>
      </div>

      <div className="social-feed">
        {loading ? (
           <div className="social-loading">
             <Loader2 className="spinner" size={32} />
             <p>Loading community thoughts...</p>
           </div>
        ) : reviews.length === 0 ? (
          <div className="social-empty">
            <MessageCircle size={48} color="#444" className="empty-icon" />
            <p>No reviews found. Be the first to review a movie or show!</p>
          </div>
        ) : (
          <>
            {reviews.map(review => {
              const tmdbData = mediaDetails[`${review.media_type}_${review.media_id}`];
              return (
                <div key={review.id} className="review-card">
                  
                  {/* User Profile Header */}
                  <div className="review-header">
                    <div className="reviewer-info">
                      {review.profiles?.avatar_url ? (
                        <img src={review.profiles.avatar_url} alt="avatar" className="reviewer-avatar" />
                      ) : (
                        <div className="reviewer-avatar-fallback">
                          <UserIcon size={18} />
                        </div>
                      )}
                      <div>
                        <h4>{review.profiles?.name || 'Anonymous User'}</h4>
                        <span className="review-time">
                          <Clock size={12} /> {timeAgo(review.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={16} fill={star <= review.rating ? '#F5A623' : 'none'} color={star <= review.rating ? '#F5A623' : '#444'} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Review Body */}
                  <p className="review-body">
                    "{review.review_text}"
                  </p>
                  
                  {/* Embedded Media Preview */}
                  <div 
                    className="review-media-embed"
                    onClick={() => openModal({ id: review.media_id, type: review.media_type })}
                  >
                    {tmdbData ? (
                      <>
                        <img 
                          src={tmdbData.poster || tmdbData.backdrop} 
                          alt={tmdbData.title} 
                          className="media-embed-poster" 
                        />
                        <div className="media-embed-info">
                          <h5>{tmdbData.title}</h5>
                          <div className="media-embed-meta">
                            <span>{tmdbData.year}</span>
                            <span className="dot">•</span>
                            <span style={{ textTransform: 'capitalize' }}>{review.media_type === 'series' ? 'TV Show' : review.media_type}</span>
                          </div>
                          <p className="media-embed-desc">{tmdbData.description}</p>
                        </div>
                        <div className="media-embed-play">
                           <Play size={24} fill="currentColor" />
                        </div>
                      </>
                    ) : (
                      <div className="media-embed-loading">
                         <Loader2 className="spinner" size={20} />
                         <span>Loading media...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Load More */}
            {hasMore && (
              <button 
                className="btn-load-more" 
                onClick={() => fetchFeed(true)}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="spinner" size={20} /> : <ChevronDown size={20} />}
                {loadingMore ? 'Loading...' : 'Load More Reviews'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
