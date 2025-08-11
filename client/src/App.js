import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './components/Navigation.css';
import './pages/Auth.css';
import './pages/Dashboard.css';
import './pages/Trip.css';
import './components/Modal.css';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TripPlan from './pages/TripPlan';
import TripHistory from './pages/TripHistory';
import TripView from './pages/TripView';
import PrivateRoute from './components/PrivateRoute';

/**
 * Main Application Component
 * Handles core application state, routing, and theme management.
 * Manages user authentication, theme preferences, and protected routes.
 */
function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  /**
   * Initialize application state on component mount
   * Checks for existing authentication tokens and theme preferences stored in localStorage.
   */
  useEffect(() => {
    // Restore authentication state
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (token && username) {
      setIsAuthenticated(true);
      setUser({ name: username, email: username });
    }

    // Restore theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  /**
   * Handle user logout
   * Clears all authentication data from localStorage and resets application state.
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUser(null);
  };

  /**
   * Toggle between dark and light themes
   * Updates theme state, applies theme to document, and persists preference in localStorage.
   */
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    if (newTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="page-container">
      <Router>
        {/* Navigation is only shown for authenticated users */}
        {isAuthenticated && (
          <Navigation 
            user={user} 
            onLogout={handleLogout}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
          />
        )}
        
        <main className="main-content">
          <Routes>
            {/* Authentication Routes */}
            <Route 
              path="/login" 
              element={
                !isAuthenticated ? (
                  <Login 
                    onLogin={(username) => {
                      setIsAuthenticated(true);
                      setUser({ name: username, email: username });
                    }}
                  />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            <Route 
              path="/register" 
              element={
                !isAuthenticated ? (
                  <Register 
                    onRegister={(username) => {
                      setIsAuthenticated(true);
                      setUser({ name: username, email: username });
                    }}
                  />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            
            {/* Protected Application Routes */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <Dashboard user={user} />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/trip-plan" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <TripPlan />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/trip-history" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <TripHistory />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/trip/:tripId" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <TripView />
                </PrivateRoute>
              } 
            />
            
            {/* Default Route - Redirect based on authentication */}
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;