import './Skeleton.css';

export function HeroSkeleton() {
  return (
    <div className="skeleton-hero">
      <div className="skeleton-hero-bg skeleton-shimmer"></div>
      <div className="skeleton-hero-content">
        <div className="skeleton-title skeleton-shimmer"></div>
        <div className="skeleton-desc skeleton-shimmer"></div>
        <div className="skeleton-desc skeleton-shimmer" style={{ width: '60%' }}></div>
        <div className="skeleton-actions">
          <div className="skeleton-btn skeleton-shimmer"></div>
          <div className="skeleton-btn skeleton-shimmer"></div>
        </div>
      </div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="skeleton-row">
      <div className="skeleton-row-title skeleton-shimmer"></div>
      <div className="skeleton-cards">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton-card skeleton-shimmer"></div>
        ))}
      </div>
    </div>
  );
}
