/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, Menu, X, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Home', path: '/home' },
  { label: 'TV Shows', path: '/browse?type=tv' },
  { label: 'Movies', path: '/browse?type=movies' },
  { label: 'Anime', path: '/anime' },
  { label: 'Watch Party', path: '/watch-party' },
  { label: 'New & Popular', path: '/browse?type=new' },
  { label: 'My List', path: '/browse?type=mylist' },
  // Admin link added dynamically

];

const DROPDOWN_LINKS = [
  { label: 'Manage Profiles', path: '/profiles' },
  { label: 'TMDB Settings', action: 'tmdb-settings' },
  { label: 'Account', path: '/account' },
  { label: 'Help Center', path: '/help' },
];

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.97,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

const sidebarVariants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '-100%', transition: { duration: 0.2, ease: 'easeIn' } },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownTimeout = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsSearchOpen, user, logout, setIsTMDBSettingsOpen, resendVerificationEmail } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const notifRef = useRef(null);

  // Close notifications on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Compute notifications list dynamically
  useEffect(() => {
    const list = [];
    if (user && user.emailConfirmed === false) {
      list.push({
        id: 'email-verification',
        type: 'warning',
        title: 'Verification Required',
        message: 'Your email address is unverified. Secure your account to back up watchlists and profiles.',
        hasActions: true
      });
    }
    list.push({
      id: 'welcome',
      type: 'info',
      title: 'Welcome to AndScene!',
      message: 'Explore movie hubs, create watch parties, and sync continue watching lists.'
    });
    list.push({
      id: 'features',
      type: 'info',
      title: 'Site Announcement',
      message: 'VidKing is now set as the default player. Change servers anytime in the player configurations.'
    });
    setNotifications(list);
  }, [user]);

  const handleResend = async () => {
    if (!user?.email || resendCooldown > 0) return;
    setResending(true);
    await resendVerificationEmail(user.email);
    setResending(false);
    setResendCooldown(60);
  };

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Profile dropdown hover handlers with delay
  const handleDropdownEnter = () => {
    clearTimeout(dropdownTimeout.current);
    setDropdownOpen(true);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setDropdownOpen(false), 200);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname + location.search === path;
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''} glass`}>
        {/* Left */}
        <div className="navbar__left">
          <Link to="/" className="navbar__logo">
            AndScene!
          </Link>

          <ul className="navbar__links">
            {NAV_LINKS.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`navbar__link ${isActive(link.path) ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right */}
        <div className="navbar__right">
          {/* Search */}
          <button
            className="navbar__icon-btn"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          {/* Notifications */}
          <div className="navbar__notif-container" ref={notifRef}>
            <button 
              className={`navbar__icon-btn ${notificationsOpen ? 'active' : ''}`} 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="navbar__notif-badge">{notifications.length}</span>
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  className="navbar__notif-dropdown dropdown-glass"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="navbar__notif-header">
                    <h3>Notifications</h3>
                    {notifications.length > 0 && (
                      <span className="notif-count">{notifications.length} Unread</span>
                    )}
                  </div>
                  
                  <div className="navbar__notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No new notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`notif-item ${notif.type}`}>
                          <div className="notif-item-header">
                            <span className="notif-item-title">{notif.title}</span>
                            {notif.type === 'warning' && <span className="notif-badge-warning">Action</span>}
                            <span className="notif-item-dot"></span>
                          </div>
                          <p className="notif-item-message">{notif.message}</p>
                          
                          {notif.hasActions && (
                            <div className="notif-item-actions">
                              <button 
                                onClick={handleResend} 
                                disabled={resending || resendCooldown > 0}
                                className="btn-notif-action primary"
                              >
                                {resending ? 'Sending...' : (resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Link')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          {user ? (
            <div
              className="navbar__profile"
              onMouseEnter={handleDropdownEnter}
              onMouseLeave={handleDropdownLeave}
            >
              <button className="navbar__profile-trigger" aria-label="Profile menu">
                <div className="navbar__avatar">
                  <User size={18} />
                </div>
                <ChevronDown size={14} className="navbar__chevron" />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    className="navbar__dropdown"
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="navbar__dropdown-header">
                      <div className="navbar__dropdown-name">User</div>
                      <div className="navbar__dropdown-email">{user.email}</div>
                    </div>

                    {DROPDOWN_LINKS.map((item) => {
                      if (item.action === 'tmdb-settings') {
                        return (
                          <button
                            key={item.action}
                            type="button"
                            className="navbar__dropdown-item"
                            onClick={() => {
                              setDropdownOpen(false);
                              setIsTMDBSettingsOpen(true);
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="navbar__dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          {item.label}
                        </Link>
                      );
                    })}

                    <div className="navbar__dropdown-divider" />

                    <button
                      className="navbar__dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                        navigate('/login');
                      }}
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Sign In</Link>
          )}

          {/* Hamburger (mobile) */}
          <button
            className="navbar__hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="navbar__sidebar-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSidebarOpen(false)}
            />

            <motion.aside
              className="navbar__sidebar"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="navbar__sidebar-header">
                <Link to="/" className="navbar__logo" onClick={() => setSidebarOpen(false)}>
                  AndScene!
                </Link>
                <button
                  className="navbar__sidebar-close"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              <ul className="navbar__sidebar-links">
                {NAV_LINKS.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`navbar__sidebar-link ${isActive(link.path) ? 'active' : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
