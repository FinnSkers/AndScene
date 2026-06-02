import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      login(email);
      navigate('/profiles');
    }
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <Film className="login-logo-icon" size={36} color="var(--accent-red)" />
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
          <button type="submit" className="login-submit-btn">Sign In</button>
          
          <div className="login-help">
            <label>
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <a href="#">Need help?</a>
          </div>
        </form>

        <div className="login-footer-text">
          <p>New to Netflix? <a href="#">Sign up now.</a></p>
          <p className="login-recaptcha">
            This page is protected by Google reCAPTCHA to ensure you're not a bot. <a href="#">Learn more.</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
