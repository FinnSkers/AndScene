import { motion } from 'framer-motion';
import './Splash.css';

export default function Splash({ onComplete }) {
  return (
    <motion.div
      className="splash-container"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <motion.div
        className="splash-logo"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => {
          setTimeout(onComplete, 1200);
        }}
      >
        <span className="splash-text">AndScene!</span>
      </motion.div>
    </motion.div>
  );
}
