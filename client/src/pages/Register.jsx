import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

/**
 * Register Component
 * Handles user registration with form validation, automatic login, and theme toggle functionality.
 * @param {Object} props - Component props
 * @param {Function} props.onLogin - Callback function called after successful registration
 */
export default function Register({ onLogin }) {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const navigate = useNavigate();

  /**
   * Check authentication status and theme preference on component mount
   * Redirects authenticated users to dashboard and restores theme preference.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [navigate]);

  /**
   * Handle form submission for user registration
   * Sends registration data to server and automatically logs user in upon success.
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    try {
      const response = await axios.post('http://localhost:5000/api/register', { 
        name, 
        email, 
        password 
      });
      
      // Store authentication data and automatically log in
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.name);
      
      // Update parent state and navigate
      if (onLogin) onLogin(response.data.name);
      navigate('/dashboard');
    } catch (err) {
      // Handle specific registration errors
      const errorMessage = err.response?.data?.message;
      if (errorMessage === 'Email already exists') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  /**
   * Toggle password field visibility
   * Switches between showing and hiding password field for better UX.
   */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
    <div className="auth-container">
      {/* Theme Toggle Button - Page Level */}
      <div className="auth-theme-toggle">
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn"
          aria-label="Toggle theme"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="auth-content">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">🌍</span>
            <span className="auth-logo-text">TripPlanner</span>
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join us to start planning your dream trips</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Name Input Field */}
          <div className="auth-form-group">
            <label className="auth-form-label">Full Name</label>
            <input 
              type="text" 
              placeholder="Enter your full name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="auth-form-input" 
              required 
              aria-label="Full name"
            />
          </div>
          
          {/* Email Input Field */}
          <div className="auth-form-group">
            <label className="auth-form-label">Email Address</label>
            <input 
              type="email" 
              placeholder="Enter your email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="auth-form-input" 
              required 
              aria-label="Email address"
            />
          </div>
          
          {/* Password Input Field */}
          <div className="auth-form-group">
            <label className="auth-form-label">Password</label>
            <div className="auth-password-container">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="auth-form-input" 
                required 
                aria-label="Password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          
          {/* Error Message Display */}
          {error && (
            <div className="auth-error" role="alert">
              <span className="auth-error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          {/* Submit Button */}
          <button type="submit" className="auth-submit-btn">
            Create Account
          </button>
        </form>
        
        <div className="auth-switch">
          Already have an account? 
          <a href="/login" className="auth-switch-link">Sign in here</a>
        </div>
      </div>
    </div>
  );
}
