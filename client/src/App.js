import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TripPlan from './pages/TripPlan';
import TripHistory from './pages/TripHistory';
import TripView from './pages/TripView';
import './App.css';
import PrivateRoute from './components/PrivateRoute';

/**
 * Trip Planner Application - Main Component
 * 
 * This is the root component of the Trip Planner application that manages:
 * - User authentication state
 * - Application routing
 * - Theme management (dark/light mode)
 * - Navigation structure
 * 
 * Architecture:
 * - Uses React Router for client-side navigation
 * - Implements protected routes for authenticated users
 * - Maintains global state for user session and theme preferences
 * - Provides responsive navigation with conditional rendering
 */
function App() {
  // --- State Management ---
  
  /**
   * Authentication State
   * Tracks whether a user is currently logged in and their identity
   */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  /**
   * Theme Management
   * Controls the application's visual theme with persistence in localStorage
   * This ensures user preferences are maintained across browser sessions
   */
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  // --- Side Effects ---

  /**
   * Session Restoration Effect
   * 
   * Checks for existing authentication tokens on application startup.
   * If a valid token exists, the user is automatically logged in.
   * This provides seamless user experience across browser sessions.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || '');
    }
  }, []);

  /**
   * Theme Application Effect
   * 
   * Applies the current theme to the document body and persists
   * the preference to localStorage whenever the theme changes.
   * This ensures consistent theming across the entire application.
   */
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : '';
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // --- Event Handlers ---

  /**
   * Login Handler
   * 
   * Called from Login and Register components to update the application's
   * authentication state when a user successfully logs in.
   * 
   * @param {string} name - The user's display name
   */
  const handleLogin = (name) => {
    setIsLoggedIn(true);
    setUsername(name);
  };

  /**
   * Logout Handler
   * 
   * Clears all session data from localStorage and resets the application's
   * authentication state. This ensures complete session termination.
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    // Navigation is handled automatically by PrivateRoute components
  };

  /**
   * Theme Toggle Handler
   * 
   * Switches between light and dark themes, triggering the theme effect
   * to apply the change immediately and persist the preference.
   */
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // --- JSX Rendering ---
  return (
    <Router>
      <div className="app-container">
        {/* Navigation Header */}
        <nav className="nav">
          {/* Brand/Logo Section */}
          <Link 
            to={isLoggedIn ? "/dashboard" : "/login"} 
            className="nav-brand" 
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <img 
              src="https://png.pngtree.com/png-clipart/20210502/original/pngtree-trip-traveler-man-take-map-png-image_6260059.jpg" 
              alt="Trip Logo" 
              style={{ width: '32px', height: '32px', borderRadius: '6px', marginRight: '4px' }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.7rem', color: 'var(--primary-color)', letterSpacing: '0.5px' }}>
              TripPlanner
            </span>
          </Link>

          {/* Navigation Links and User Controls */}
          <div className="nav-links">
            {/* Conditional Navigation Based on Authentication Status */}
            {!isLoggedIn ? (
              // Public navigation for unauthenticated users
              <>
                <Link to="/register" className="nav-link">Register</Link>
                <Link to="/login" className="nav-link">Login</Link>
              </>
            ) : (
              // Protected navigation for authenticated users
              <>
                <Link to="/trip-plan" className="nav-link">Trip Plan</Link>
                <Link to="/trip-history" className="nav-link">Trip History</Link>
              </>
            )}
          </div>

          {/* Right side elements - User section and theme toggle */}
          {isLoggedIn && (
            <div className="nav-right">
              <div className="user-section">
                {username && <span className="username">Welcome, {username}</span>}
                <button onClick={handleLogout} className="logout-button">Logout</button>
              </div>
              <button onClick={toggleDarkMode} className="dark-mode-toggle">
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          )}

          {/* Theme toggle for non-logged in users */}
          {!isLoggedIn && (
            <div className="nav-right">
              <button onClick={toggleDarkMode} className="dark-mode-toggle">
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          )}
        </nav>

        {/* Main Content Area */}
        <div className="content">
          {/* Application Routes */}
          <Routes>
            {/* Public Routes - Accessible without authentication */}
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            
            {/* Protected Routes - Require authentication */}
            <Route path="/trip-plan" element={<PrivateRoute><TripPlan /></PrivateRoute>} />
            <Route path="/trip-history" element={<PrivateRoute><TripHistory /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/trip/:tripId" element={<PrivateRoute><TripView /></PrivateRoute>} />
            
            {/* Root Route - Redirects based on authentication status */}
            <Route 
              path="/" 
              element={isLoggedIn ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;