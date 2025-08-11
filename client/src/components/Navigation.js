import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Navigation Component
 * Main navigation bar providing navigation links, theme toggle, and user account management.
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user information
 * @param {Function} props.onLogout - Logout handler function
 * @param {boolean} props.isDarkMode - Current theme state
 * @param {Function} props.onToggleTheme - Theme toggle handler
 * @returns {JSX.Element} Navigation bar component
 */
const Navigation = ({ user, onLogout, isDarkMode, onToggleTheme }) => {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/dashboard" className="nav-logo">
            <span className="logo-icon">🌍</span>
            <span className="logo-text">TripPlanner</span>
          </Link>
        </div>

        <div className="nav-menu">
          <Link 
            to="/dashboard" 
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/trip-plan" 
            className={`nav-link ${location.pathname === '/trip-plan' ? 'active' : ''}`}
          >
            Plan Trip
          </Link>
          <Link 
            to="/trip-history" 
            className={`nav-link ${location.pathname === '/trip-history' ? 'active' : ''}`}
          >
            Trip History
          </Link>
        </div>

        <div className="nav-actions">
          <button 
            onClick={onToggleTheme} 
            className="theme-toggle"
            aria-label="Toggle theme"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          {user && (
            <div className="user-menu">
              <span className="user-email">{user.email}</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
