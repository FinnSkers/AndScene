import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './ContentCard';
import './ContentRow.css';

const TITLE_ROUTE_MAP = {
  'Action & Adventure': '/browse?genre=28',
  'Action': '/browse?genre=28',
  'Comedies': '/browse?genre=35',
  'Comedy': '/browse?genre=35',
  'Horror': '/browse?genre=27',
  'Drama': '/browse?genre=18',
  'Sci-Fi': '/browse?genre=878',
  'Romance': '/browse?genre=10749',
  'Thriller': '/browse?genre=53',
  'Animation': '/browse?genre=16',
  'Top Rated Movies': '/browse?category=movies',
  'Popular Movies': '/browse?category=movies',
  'Trending Now': '/browse?category=movies',
  'Popular TV Shows': '/browse?category=tv',
  'Top Rated TV Shows': '/browse?category=tv',
  'Trending TV Shows': '/browse?category=tv',
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ContentRow({ title, items = [], type = 'standard' }) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const handleExploreClick = useCallback(() => {
    const route = TITLE_ROUTE_MAP[title] || '/browse';
    navigate(route);
  }, [title, navigate]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === 'left' ? -clientWidth : clientWidth;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!items.length) return null;

  const rowClass = [
    'content-row',
    type === 'top10' ? 'content-row--top10' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rowClass}>
      {/* Header */}
      <div className="content-row__header" onClick={handleExploreClick}>
        <h2 className="content-row__title">{title}</h2>
        <span className="content-row__explore">Explore All &rsaquo;</span>
      </div>

      {/* Slider */}
      <div className="content-row__slider">
        {/* Left arrow */}
        <button
          className="content-row__nav content-row__nav--left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Scrollable cards */}
        <motion.div
          className="content-row__scroll content-row__scroll--masked"
          ref={scrollRef}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {items.map((item, i) => (
            <motion.div key={item.id} variants={itemVariants}>
              <ContentCard
                item={item}
                index={type === 'top10' ? i : i}
                isTop10={type === 'top10'}
                showProgress={type === 'continue'}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Right arrow */}
        <button
          className="content-row__nav content-row__nav--right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}
