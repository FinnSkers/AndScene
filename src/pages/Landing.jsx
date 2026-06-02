import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Plus, X } from 'lucide-react';
import './Landing.css';

const faqData = [
  {
    question: 'What is AndScene!?',
    answer:
      'AndScene! is a streaming service that offers a wide variety of award-winning TV shows, movies, anime, documentaries, and more.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Plans range from $6.99 to $22.99 per month. No extra costs, no contracts.',
  },
  {
    question: 'Where can I watch?',
    answer:
      'Watch anywhere, anytime. Sign in to your account to watch instantly on the web.',
  },
  {
    question: 'How do I cancel?',
    answer:
      'AndScene! is flexible. No annoying contracts and no commitments. Cancel online in two clicks.',
  },
  {
    question: 'What can I watch?',
    answer:
      'AndScene! has an extensive library of feature films, documentaries, TV shows, anime, and more.',
  },
];

const features = [
  {
    title: 'Enjoy on your TV',
    text: 'Watch on Smart TVs, PlayStation, Xbox, Chromecast, Apple TV, Blu-ray players, and more.',
    img: 'https://picsum.photos/seed/nfxfeat1/600/400',
  },
  {
    title: 'Download your shows to watch offline',
    text: 'Save your favorites easily and always have something to watch.',
    img: 'https://picsum.photos/seed/nfxfeat2/600/400',
  },
  {
    title: 'Watch everywhere',
    text: 'Stream unlimited movies and TV shows on your phone, tablet, laptop, and TV.',
    img: 'https://picsum.photos/seed/nfxfeat3/600/400',
  },
  {
    title: 'Create profiles for kids',
    text: 'Send kids on adventures with their favorite characters in a space made just for them — free with your membership.',
    img: 'https://picsum.photos/seed/nfxfeat4/600/400',
  },
];

/* Reusable email CTA */
function EmailCTA({ navigate }) {
  const [email, setEmail] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/profiles');
  };
  return (
    <form className="landing-email-cta" onSubmit={handleSubmit}>
      <input
        className="landing-email-input"
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="landing-cta-btn" type="submit">
        Get Started <ChevronRight size={22} />
      </button>
    </form>
  );
}

/* FAQ Accordion Item */
function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={onToggle}>
        <span>{item.question}</span>
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="faq-answer-wrapper"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="faq-answer">{item.answer}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Scroll-triggered section wrapper */
function ScrollReveal({ children, className, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [openFAQ, setOpenFAQ] = useState(null);

  return (
    <div className="landing-page">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <span className="landing-logo">AndScene!</span>
        <button
          className="landing-signin-btn"
          onClick={() => navigate('/profiles')}
        >
          Sign In
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div
          className="landing-hero-bg"
          style={{
            backgroundImage:
              'url(https://picsum.photos/seed/nfxlanding/1920/1080)',
          }}
        />
        <div className="landing-hero-gradient" />

        <motion.div
          className="landing-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="landing-hero-title">
            Unlimited movies, TV shows, and more
          </h1>
          <p className="landing-hero-sub">
            Starts at $6.99. Cancel anytime.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: 'var(--text-base)' }}>
            Ready to watch? Enter your email to create or restart your membership.
          </p>
          <EmailCTA navigate={navigate} />
        </motion.div>
      </section>

      {/* ── Feature Sections ── */}
      {features.map((feat, i) => (
        <div key={feat.title}>
          <hr className="landing-divider" />
          <ScrollReveal
            className={`landing-feature ${i % 2 !== 0 ? 'reverse' : ''}`}
          >
            <div className="landing-feature-text">
              <h2>{feat.title}</h2>
              <p>{feat.text}</p>
            </div>
            <div className="landing-feature-img">
              <img src={feat.img} alt={feat.title} loading="lazy" />
            </div>
          </ScrollReveal>
        </div>
      ))}

      {/* ── FAQ ── */}
      <hr className="landing-divider" />
      <ScrollReveal>
        <section className="landing-faq">
          <h2>Frequently Asked Questions</h2>
          {faqData.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              isOpen={openFAQ === i}
              onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
            />
          ))}
        </section>
      </ScrollReveal>

      {/* ── Bottom CTA ── */}
      <div className="landing-bottom-cta">
        <p>
          Ready to watch? Enter your email to create or restart your membership.
        </p>
        <EmailCTA navigate={navigate} />
      </div>

      {/* ── Footer ── */}
      <hr className="landing-divider" />
      <footer className="landing-footer">
        <p className="footer-contact">Questions? Call 1-844-505-2993</p>
        <div className="landing-footer-links">
          <a href="#">FAQ</a>
          <a href="#">Help Center</a>
          <a href="#">Account</a>
          <a href="#">Media Center</a>
          <a href="#">Investor Relations</a>
          <a href="#">Jobs</a>
          <a href="#">Ways to Watch</a>
          <a href="#">Terms of Use</a>
          <a href="#">Privacy</a>
          <a href="#">Cookie Preferences</a>
          <a href="#">Corporate Information</a>
          <a href="#">Contact Us</a>
          <a href="#">Speed Test</a>
          <a href="#">Legal Notices</a>
          <a href="#">Only on AndScene!</a>
          <a href="#">Ad Choices</a>
        </div>
        <p className="footer-copy">&copy; 2025 AndScene!, Inc.</p>
      </footer>
    </div>
  );
}
