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
  { label: 'New & Popular', path: '/browse?type=new' },
  { label: 'My List', path: '/browse?type=mylist' },
];

const DROPDOWN_LINKS = [
  { label: 'Manage Profiles', path: '/profiles' },
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
  const { setIsSearchOpen, user, logout } = useApp();

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
      <nav className={`navbar ${scrolled ? 'scrolled' : 'transparent'}`}>
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
          <button className="navbar__icon-btn" aria-label="Notifications">
            <Bell size={20} />
            <span className="navbar__notif-badge">3</span>
          </button>

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

                    {DROPDOWN_LINKS.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="navbar__dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}

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
