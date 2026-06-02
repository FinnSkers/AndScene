import { useApp } from '../context/AppContext';
import { Navigate } from 'react-router-dom';


export default function RequireAdmin({ children }) {
  const { user, showToast } = useApp();

  // If user data hasn't loaded yet, show a loading spinner
  if (user === null) {
    return (
      <div
        className="loading-spinner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <Loader2 size={48} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // If no user (not logged in), redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Non-admin users denied access
  if (!user.isAdmin) {
    showToast('Access denied: Admins only');
    return <Navigate to="/" replace />;
  }

  // Admin user – render protected content
  return children;
}
