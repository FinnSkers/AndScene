import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Star, MessageCircle, Clock, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useApp } from '../context/AppContext';

export default function Social() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openModal } = useApp();

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const { data, error } = await supabase
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
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.error('Error fetching social feed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  if (loading) {
    return <div className="page-content" style={{ padding: '4rem', textAlign: 'center', color: '#888' }}>Loading feed...</div>;
  }

  return (
    <div className="page-content fade-in" style={{ padding: '2rem 4%', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', background: 'linear-gradient(135deg, var(--primary-color), #ff4d4d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Community Feed
      </h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <MessageCircle size={48} color="#444" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#aaa' }}>No reviews yet. Be the first to review a movie or show!</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} style={{ 
              background: 'rgba(20, 20, 20, 0.8)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '12px', 
              padding: '1.5rem',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onClick={() => openModal({ id: review.media_id, type: review.media_type })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {review.profiles?.avatar_url ? (
                    <img src={review.profiles.avatar_url} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserIcon size={20} />
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{review.profiles?.name || 'Anonymous User'}</h4>
                    <span style={{ color: '#888', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} size={16} fill={star <= review.rating ? '#F5A623' : 'none'} color={star <= review.rating ? '#F5A623' : '#444'} />
                  ))}
                </div>
              </div>
              <p style={{ margin: 0, color: '#e0e0e0', lineHeight: 1.6, fontSize: '1rem' }}>
                "{review.review_text}"
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600 }}>Reviewed TMDB ID: {review.media_id}</span>
                <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>({review.media_type})</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
