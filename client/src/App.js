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

function App() {
  // --- State Management ---
  // `isLoggedIn` tracks the authentication status of the user.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // `username` stores the name of the logged-in user for display.
  const [username, setUsername] = useState('');
  // `isDarkMode` manages the theme of the application.
  // It's initialized from localStorage to persist the user's preference.
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  // --- Side Effects ---
  // This effect runs once on component mount to check for an existing session.
  // If a token is found in localStorage, the user is considered logged in.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || '');
    }
  }, []);

  // This effect toggles the 'dark-mode' class on the body and saves the preference
  // to localStorage whenever the `isDarkMode` state changes.
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : '';
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // --- Event Handlers ---
  // `handleLogin` is called from the Login and Register components to update the app's state.
  const handleLogin = (name) => {
    setIsLoggedIn(true);
    setUsername(name);
  };

  // `handleLogout` clears session data from localStorage and resets the application's state.
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    // No need to navigate here, the PrivateRoute will handle redirection if not logged in
  };

  // Toggles the dark mode state.
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // --- JSX Rendering ---
  return (
    <Router>
      <div className="app-container">
        <nav className="nav">
          {/* The brand link navigates to the dashboard if logged in, otherwise to the login page. */}
          <Link to={isLoggedIn ? "/dashboard" : "/login"} className="nav-brand" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="https://png.pngtree.com/png-clipart/20210502/original/pngtree-trip-traveler-man-take-map-png-image_6260059.jpg" 
              alt="Trip Logo" 
              style={{ width: '32px', height: '32px', borderRadius: '6px', marginRight: '4px' }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.7rem', color: 'var(--primary-color)', letterSpacing: '0.5px' }}>TripPlanner</span>
          </Link>
          <div className="nav-links">
            {/* Conditional rendering of navigation links based on login status. */}
            {!isLoggedIn ? (
              <>
                <Link to="/register" className="nav-link">Register</Link>
                <Link to="/login" className="nav-link">Login</Link>
              </>
            ) : (
              <>
                <div className="nav-links-left">
                  <Link to="/trip-plan" className="nav-link">Trip Plan</Link>
                  <Link to="/trip-history" className="nav-link">Trip History</Link>
                </div>
                <div className="user-section">
                  {username && <span className="username">Welcome, {username}</span>}
                  <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>
              </>
            )}
            <button onClick={toggleDarkMode} className="dark-mode-toggle">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </nav>
        <div className="content">
          {/* The main routing configuration for the application. */}
          <Routes>
            {/* Public routes for registration and login. */}
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            
            {/* Protected routes that require authentication, wrapped in the PrivateRoute component. */}
            <Route path="/trip-plan" element={<PrivateRoute><TripPlan /></PrivateRoute>} />
            <Route path="/trip-history" element={<PrivateRoute><TripHistory /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/trip/:tripId" element={<PrivateRoute><TripView /></PrivateRoute>} />
            
            {/* The root path redirects to the dashboard if logged in, or to the login page otherwise. */}
            <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;