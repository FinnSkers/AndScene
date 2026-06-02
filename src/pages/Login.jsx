import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/profiles');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <Film className="login-logo-icon" size={36} color="var(--accent)" />
        <span className="login-logo-text">AndScene!</span>
      </div>
      
      <div className="login-background"></div>

      <motion.div 
        className="login-container glass"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="login-title">Sign In</h1>

        {error && (
          <div 
            className="login-error-message" 
            style={{ 
              color: 'var(--red-error)', 
              fontSize: '0.85rem', 
              marginBottom: '1.2rem', 
              background: 'rgba(239, 68, 68, 0.08)', 
              padding: '10px 14px', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid rgba(239, 68, 68, 0.2)' 
            }}
          >
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <input 
              type="email" 
              placeholder="Email or phone number" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="login-input-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
          
          <div className="login-help">
            <label>
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <a href="#">Need help?</a>
          </div>
        </form>

        <div className="login-footer-text">
          <p>New to AndScene!? <Link to="/signup">Sign up now.</Link></p>
          <p className="login-recaptcha">
            This page is protected by Google reCAPTCHA to ensure you're not a bot. <a href="#">Learn more.</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
