import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './LoadingBar.css';

export default function LoadingBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setProgress(0);
    setVisible(true);

    const t1 = setTimeout(() => {
      setProgress(30);
    }, 50);

    const t2 = setTimeout(() => {
      setProgress(75);
    }, 200);

    const t3 = setTimeout(() => {
      setProgress(100);
    }, 400);

    const t4 = setTimeout(() => {
      setVisible(false);
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div 
      className="loading-bar" 
      style={{ 
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1
      }} 
    />
  );
}
