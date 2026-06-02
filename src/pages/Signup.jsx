/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Eye, EyeOff, Mail, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Signup.css';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Signup progress states
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: 'Very Weak', color: '#ef4444' });

  // Cooldown for email rate limit
  const [cooldown, setCooldown] = useState(0);
  // Start cooldown when rate limit error occurs
  useEffect(() => {
    if (error && error.toLowerCase().includes('rate limit')) {
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [error]);

  const { signup, loginSandbox } = useApp();
  const navigate = useNavigate();

  const handleVerifyLater = () => {
    loginSandbox(email);
    navigate('/profiles');
  };

  // Password complexity strength evaluator
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, text: 'Very Weak', color: '#ef4444' });
      return;
    }

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[a-zA-Z]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1;

    let text = 'Very Weak';
    let color = '#ef4444'; // Red

    if (score === 2) {
      text = 'Weak';
      color = '#f97316'; // Orange
    } else if (score === 3) {
      text = 'Medium';
      color = '#f5a623'; // Amber
    } else if (score >= 4) {
      text = 'Strong';
      color = '#22c55e'; // Green
    }

    setPasswordStrength({ score, text, color });
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Inputs validation
    if (!email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    // 2. Password Length validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // 3. Passwords match validation
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    setLoading(true);
    try {
      const userResult = await signup(email.trim(), password);
      if (userResult) {
        // Checking if user session is auto-signed in or needs confirmation
        // If they need verification, show verification card. Otherwise, redirect to profiles.
        const sessionKey = localStorage.getItem('sb-access-token') || sessionStorage.getItem('admin_unlocked');
        if (sessionKey) {
          navigate('/profiles');
        } else {
          // Fallback to success overlay message
          setSignupSuccess(true);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Please check your network or credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (signupSuccess) {
      const timer = setTimeout(() => {
        navigate('/profiles');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [signupSuccess, navigate]);
  return (
    <div className="signup-page">
      {/* Top logo header */}
      <div className="signup-header">
        <Film className="signup-logo-icon" size={36} color="var(--accent)" />
        <span className="signup-logo-text">AndScene!</span>
      </div>
      
      <div className="signup-background"></div>

      <AnimatePresence mode="wait">
        {!signupSuccess ? (
          <motion.div 
            key="signup-form"
            className="signup-container glass"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="signup-title">Sign Up</h1>

            {error && (
              <div className="signup-error-message">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="signup-form">
              {/* Email */}
              <div className="signup-input-group">
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>

              {/* Password */}
              <div className="signup-input-group password-field">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Password (Min 6 chars)" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password && (
                <div className="strength-meter-container animate-fade-in">
                  <div className="strength-meter-labels">
                    <span className="meter-label">Password Strength:</span>
                    <span className="strength-value" style={{ color: passwordStrength.color }}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <div className="strength-bars">
                    {[1, 2, 3, 4].map((barIndex) => (
                      <div 
                        key={barIndex} 
                        className="strength-bar-node"
                        style={{ 
                          backgroundColor: barIndex <= passwordStrength.score ? passwordStrength.color : 'rgba(255,255,255,0.06)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="signup-input-group">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
              </div>

  // cooldown logic moved above

  // Modified Get Started button with cooldown
  // Original line 195-197 replaced below

                  <button type="submit" className="signup-submit-btn" disabled={loading || cooldown > 0}>
                    {loading ? <Loader2 size={16} className="spinner" style={{ marginRight: '8px', verticalAlign: 'middle' }} /> : null}
                    {loading ? 'Creating Account...' : cooldown > 0 ? `Wait (${cooldown}s)` : 'Get Started'}
                  </button>
            </form>

            <div className="signup-footer-text">
              <p>Already have an account? <Link to="/login">Sign in now.</Link></p>
              <p className="signup-terms">
                By signing up, you agree to our Terms of Service & Privacy Policy.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success-box"
            className="signup-container success glass"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', padding: '48px var(--space-xl)' }}
          >
            <div className="success-icon-wrap">
              <Mail size={40} className="text-secondary" style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 12px var(--accent-glow))' }} />
            </div>
            <h2 className="signup-title" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-md)' }}>Check Your Inbox</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.6', marginBottom: 'var(--space-xl)' }}>
              We have dispatched a verification link to <strong>{email}</strong>. Please confirm your subscription to unlock profiles and watch parties.
            </p>
            
            <Link to="/login" className="btn btn-primary" style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
              Return to Sign In
            </Link>
            <button 
              type="button"
              onClick={handleVerifyLater} 
              className="btn btn-secondary" 
              style={{ display: 'flex', width: '100%', justifyContent: 'center', marginTop: '12px' }}
            >
              Verify Later & Enter Site
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
