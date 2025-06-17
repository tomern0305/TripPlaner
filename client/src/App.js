import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TripPlan from './pages/TripPlan';
import TripHistory from './pages/TripHistory';
import './App.css';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername || '');
    }
  }, []);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : '';
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleLogin = (name) => {
    setIsLoggedIn(true);
    setUsername(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    // No need to navigate here, the PrivateRoute will handle redirection if not logged in
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <Router>
      <div className="app-container">
        <nav className="nav">
          <Link to={isLoggedIn ? "/dashboard" : "/login"} className="nav-brand" style={{ textDecoration: 'none' }}>TripPlanner</Link>
          <div className="nav-links">
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
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/trip-plan" element={<PrivateRoute><TripPlan /></PrivateRoute>} />
            <Route path="/trip-history" element={<PrivateRoute><TripHistory /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/" element={<Login onLogin={handleLogin} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;