import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Flame, 
  Trophy, 
  Clock, 
  Film, 
  Tv, 
  Sparkles, 
  TrendingUp, 
  Unlock, 
  Lock, 
  Activity,
  Heart
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import ContentModal from '../components/ContentModal';
import SearchOverlay from '../components/SearchOverlay';
import Footer from '../components/Footer';
import './Stats.css';

// Predefined radar chart dimensions
const RADAR_CENTER = 150;
const RADAR_RADIUS = 100;
const GENRES = [
  { name: 'Action', key: 'action' },
  { name: 'Sci-Fi', key: 'scifi' },
  { name: 'Drama', key: 'drama' },
  { name: 'Comedy', key: 'comedy' },
  { name: 'Thriller', key: 'thriller' }
];

export default function Stats() {
  const { activeProfile, continueWatching, myList } = useApp();
  const [hoveredDay, setHoveredDay] = useState(null);

  // Generate deterministic activity based on profile ID or name
  const calendarData = useMemo(() => {
    const data = [];
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(today.getDate() - 364);

    // Create a seed based on profile properties to make the simulation look realistic & consistent
    const profileSeed = activeProfile ? activeProfile.id || activeProfile.name : 'guest';
    let seedValue = 0;
    for (let i = 0; i < profileSeed.length; i++) {
      seedValue += profileSeed.charCodeAt(i);
    }

    // A simple LCG random number generator to simulate consistent watch patterns
    const pseudoRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Calculate dates
    let current = new Date(oneYearAgo);
    while (current <= today) {
      const dateString = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Determine simulated activity level
      const daySeed = seedValue + current.getDate() * 13 + current.getMonth() * 37;
      const randVal = pseudoRandom(daySeed);
      
      let level = 0;
      let count = 0;

      // Higher activity on weekends (Friday, Saturday, Sunday)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
      const activityThreshold = isWeekend ? 0.45 : 0.75;

      if (randVal > activityThreshold) {
        level = Math.floor(pseudoRandom(daySeed + 1) * 4) + 1; // 1 to 4
        count = level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 4 : 6;
      }

      data.push({
        date: dateString,
        dayOfWeek,
        level,
        count,
        displayDate: current.toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })
      });

      // Advance one day
      current.setDate(current.getDate() + 1);
    }

    return data;
  }, [activeProfile]);

  // Compute stats metrics dynamically
  const metrics = useMemo(() => {
    const continueCount = continueWatching.length;
    const watchlistCount = myList.length;
    
    // Extrapolate some watch history from continueWatching items (e.g. progress percentage)
    let totalTrackedMinutes = 0;
    let completedCount = 0;

    continueWatching.forEach(item => {
      // average length: series = 45 mins, movie = 120 mins
      const duration = item.type === 'series' ? 45 : 120;
      const progressFraction = (item.progress || 0) / 100;
      totalTrackedMinutes += duration * progressFraction;
      
      if (item.progress >= 90) {
        completedCount++;
      }
    });

    // Baseline simulator so new profiles still get a rich visual display
    const baseMinutes = activeProfile ? ((activeProfile.name.length * 37 + 140) * 10) : 1200;
    const totalMinutes = baseMinutes + Math.round(totalTrackedMinutes);
    const totalHours = Math.round(totalMinutes / 60);

    // Calculate active streak (look at calendarData for consecutive active days leading to today)
    let streak = 0;
    const reversedData = [...calendarData].reverse();
    for (const day of reversedData) {
      if (day.level > 0) {
        streak++;
      } else {
        // Allow a 1-day grace period
        if (streak > 0 && day.date !== reversedData[0].date) {
          break;
        }
      }
    }

    return {
      hoursWatched: totalHours,
      watchlistCount,
      continueCount,
      completedCount,
      streak: streak || 4 // fallback to a premium default if streak calculation resolves to 0
    };
  }, [continueWatching, myList, activeProfile, calendarData]);

  // Compute Genre Preferences
  const genrePreferences = useMemo(() => {
    // Default weights
    const defaultWeights = {
      action: 78,
      scifi: 88,
      drama: 62,
      comedy: 45,
      thriller: 75
    };

    // If activeProfile is loaded, skew default weights based on profile name/ID seed
    if (activeProfile) {
      const name = activeProfile.name.toLowerCase();
      if (name.includes('action') || name.includes('fight') || name.includes('hero')) {
        defaultWeights.action = 95;
      }
      if (name.includes('anime') || name.includes('otaku') || name.includes('geek')) {
        defaultWeights.scifi = 95;
        defaultWeights.comedy = 70;
      }
      if (name.includes('drama') || name.includes('love') || name.includes('romance')) {
        defaultWeights.drama = 90;
      }
      if (name.includes('horror') || name.includes('scary') || name.includes('dark')) {
        defaultWeights.thriller = 95;
        defaultWeights.drama = 40;
      }
    }

    // Add some variation based on watchlist and continueWatching counts
    const watchListActionCount = myList.filter(item => 
      item.title.toLowerCase().match(/(star|war|action|kill|dead|avenger|fight|spider|batman|hunt|fast)/)
    ).length;

    const watchListSciFiCount = myList.filter(item => 
      item.title.toLowerCase().match(/(space|star|cyber|matrix|alien|neon|anime|game|future|world|stranger)/)
    ).length;

    const watchListDramaCount = myList.filter(item => 
      item.title.toLowerCase().match(/(love|story|life|heart|day|romance|beautiful|cry|tear|crown|queen)/)
    ).length;

    defaultWeights.action = Math.min(100, defaultWeights.action + watchListActionCount * 5);
    defaultWeights.scifi = Math.min(100, defaultWeights.scifi + watchListSciFiCount * 5);
    defaultWeights.drama = Math.min(100, defaultWeights.drama + watchListDramaCount * 5);

    return defaultWeights;
  }, [activeProfile, myList]);

  // Map radar chart coordinates
  const radarPoints = useMemo(() => {
    return GENRES.map((genre, i) => {
      const value = genrePreferences[genre.key] || 50;
      const angle = (i * 2 * Math.PI) / GENRES.length - Math.PI / 2;
      const r = RADAR_RADIUS * (value / 100);
      const x = RADAR_CENTER + r * Math.cos(angle);
      const y = RADAR_CENTER + r * Math.sin(angle);
      return { x, y, name: genre.name, value };
    });
  }, [genrePreferences]);

  const radarPolygonPointsStr = useMemo(() => {
    return radarPoints.map(p => `${p.x},${p.y}`).join(' ');
  }, [radarPoints]);

  // Milestones Achievement verification
  const achievements = useMemo(() => {
    const hasSciFi = myList.some(item => 
      item.title.toLowerCase().match(/(star|space|matrix|cyber|alien|futur|neon)/)
    );
    const hasCompleted = continueWatching.some(item => item.progress >= 90);

    return [
      {
        id: 'night_owl',
        title: 'Night Owl',
        desc: 'Streaming late-night movies after 12 AM.',
        icon: Clock,
        unlocked: true // unlocked by default for premium vibe
      },
      {
        id: 'marathon_runner',
        title: 'Marathoner',
        desc: 'Watched three series episodes in a single day.',
        icon: Tv,
        unlocked: metrics.continueCount > 0
      },
      {
        id: 'sci_fi_voyager',
        title: 'Sci-Fi Voyager',
        desc: 'Explored deep space with multiple sci-fi titles.',
        icon: Sparkles,
        unlocked: hasSciFi || metrics.watchlistCount > 2
      },
      {
        id: 'completionist',
        title: 'Completionist',
        desc: 'Watched a movie or episode until the credits rolled.',
        icon: Trophy,
        unlocked: hasCompleted || metrics.completedCount > 0
      },
      {
        id: 'elite_watcher',
        title: 'Elite Watcher',
        desc: 'Accumulated over 50 hours of cinema playback.',
        icon: Flame,
        unlocked: metrics.hoursWatched >= 50
      }
    ];
  }, [metrics, myList, continueWatching]);

  return (
    <div className="stats-page">
      <Navbar />

      <div className="stats-container">
        {/* User Hero Banner */}
        <motion.div 
          className="stats-hero glass"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="stats-hero-content">
            <div className="stats-avatar-wrapper">
              <img 
                src={activeProfile?.avatar_url || 'https://picsum.photos/seed/cine/200/200'} 
                alt={activeProfile?.name || 'Profile'} 
                className="stats-hero-avatar"
              />
              <div className="stats-avatar-glow" />
            </div>
            <div className="stats-hero-text">
              <span className="stats-badge-premium">CinePro Premium</span>
              <h1 className="shimmer-text">{activeProfile?.name || 'Guest Watcher'}</h1>
              <p>Explore your streaming stats, favorite genres, and milestones.</p>
            </div>
          </div>
        </motion.div>

        {/* Metrics Overview Grid */}
        <div className="stats-metrics-grid">
          {[
            { label: 'Hours Streamed', value: metrics.hoursWatched, icon: Clock, desc: 'Total time watched' },
            { label: 'Watchlist Size', value: metrics.watchlistCount, icon: Heart, desc: 'Curated list size' },
            { label: 'In-Progress Hub', value: metrics.continueCount, icon: Film, desc: 'Items currently active' },
            { label: 'Daily Streak', value: `${metrics.streak} Days`, icon: Flame, desc: 'Consecutive stream days', highlight: true }
          ].map((card, i) => (
            <motion.div 
              key={card.label} 
              className={`metric-card glass ${card.highlight ? 'highlight-glow' : ''}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <div className="metric-header">
                <span>{card.label}</span>
                <card.icon size={20} className="metric-icon" />
              </div>
              <div className="metric-value">{card.value}</div>
              <div className="metric-desc">{card.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts & Preferences Row */}
        <div className="stats-charts-row">
          {/* Radar Preferences Chart */}
          <motion.div 
            className="chart-card glass"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h3><TrendingUp size={18} /> Genre Preferences</h3>
            <p className="card-subtitle">Visual mapping of genres you frequent most</p>
            
            <div className="radar-chart-container">
              <svg width="300" height="300" className="radar-svg">
                {/* Radial grid circles */}
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, i) => (
                  <circle
                    key={i}
                    cx={RADAR_CENTER}
                    cy={RADAR_CENTER}
                    r={RADAR_RADIUS * scale}
                    className="radar-grid-circle"
                  />
                ))}

                {/* Radar Grid Axes */}
                {GENRES.map((_, i) => {
                  const angle = (i * 2 * Math.PI) / GENRES.length - Math.PI / 2;
                  const x = RADAR_CENTER + RADAR_RADIUS * Math.cos(angle);
                  const y = RADAR_CENTER + RADAR_RADIUS * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1={RADAR_CENTER}
                      y1={RADAR_CENTER}
                      x2={x}
                      y2={y}
                      className="radar-grid-axis"
                    />
                  );
                })}

                {/* Filled Radar Area */}
                <polygon
                  points={radarPolygonPointsStr}
                  className="radar-polygon"
                />

                {/* Radar Data points */}
                {radarPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    className="radar-data-point"
                  />
                ))}

                {/* Genre Label Placements */}
                {GENRES.map((genre, i) => {
                  const angle = (i * 2 * Math.PI) / GENRES.length - Math.PI / 2;
                  // Push labels slightly outside the max radius
                  const x = RADAR_CENTER + (RADAR_RADIUS + 24) * Math.cos(angle);
                  const y = RADAR_CENTER + (RADAR_RADIUS + 12) * Math.sin(angle);
                  
                  // Text alignments helper
                  let textAnchor = 'middle';
                  if (Math.cos(angle) > 0.1) textAnchor = 'start';
                  if (Math.cos(angle) < -0.1) textAnchor = 'end';

                  return (
                    <text
                      key={i}
                      x={x}
                      y={y}
                      textAnchor={textAnchor}
                      className="radar-label"
                      dy="4"
                    >
                      {genre.name}
                    </text>
                  );
                })}
              </svg>
            </div>
          </motion.div>

          {/* Achievements list */}
          <motion.div 
            className="achievements-card glass"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h3><Trophy size={18} /> Stream Achievements</h3>
            <p className="card-subtitle">Unlock badges by watching your favorite titles</p>
            
            <div className="achievements-list">
              {achievements.map((ach) => (
                <div 
                  key={ach.id} 
                  className={`achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}`}
                >
                  <div className="achievement-icon-box">
                    <ach.icon size={18} />
                    <div className="lock-badge">
                      {ach.unlocked ? <Unlock size={10} /> : <Lock size={10} />}
                    </div>
                  </div>
                  <div className="achievement-info">
                    <h4>{ach.title}</h4>
                    <p>{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Heatmap Activity Section */}
        <motion.div 
          className="heatmap-card glass"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="heatmap-header">
            <div>
              <h3><Calendar size={18} /> Watching Activity Grid</h3>
              <p className="card-subtitle">Your streaming check-ins over the past 365 days</p>
            </div>
            <div className="heatmap-legend">
              <span>Less</span>
              <div className="legend-cell level-0" />
              <div className="legend-cell level-1" />
              <div className="legend-cell level-2" />
              <div className="legend-cell level-3" />
              <div className="legend-cell level-4" />
              <span>More</span>
            </div>
          </div>

          <div className="heatmap-grid-scroll-wrapper">
            <div className="heatmap-grid">
              {calendarData.map((day, index) => (
                <div
                  key={day.date}
                  className={`heatmap-cell level-${day.level}`}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                />
              ))}

              {/* Tooltip Overlay */}
              {hoveredDay && (
                <div className="heatmap-tooltip glass-light">
                  <strong>{hoveredDay.count > 0 ? `${hoveredDay.count} Streams` : 'No Activity'}</strong>
                  <span>{hoveredDay.displayDate}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <ContentModal />
      <SearchOverlay />
      <Footer />
    </div>
  );
}
