import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

/**
 * Login Component
 * 
 * Provides user authentication functionality with a clean, accessible form interface.
 * This component handles user login, session management, and error handling.
 * 
 * Features:
 * - Form validation and error display
 * - Password visibility toggle
 * - Automatic redirection for already authenticated users
 * - User-friendly error messages
 * - Responsive design with accessibility features
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onLogin - Callback function called after successful login
 */
export default function Login({ onLogin }) {
  // --- State Management ---
  
  /**
   * Form Input State
   * Manages the current values of email and password fields
   */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  /**
   * UI State
   * Controls password visibility and error message display
   */
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Navigation hook for programmatic routing
  const navigate = useNavigate();

  // --- Side Effects ---

  /**
   * Authentication Check Effect
   * 
   * Checks if a user is already authenticated on component mount.
   * If a valid token exists, redirects to dashboard to prevent
   * authenticated users from accessing the login page.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // --- Event Handlers ---

  /**
   * Form Submission Handler
   * 
   * Processes the login form submission by sending credentials to the server.
   * Handles successful authentication, error responses, and session storage.
   * 
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    
    try {
      // Send login request to server
      const response = await axios.post('http://localhost:5000/api/login', { 
        email, 
        password 
      });
      
      // Store authentication data in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.name);
      
      // Update parent component state and navigate to dashboard
      onLogin(response.data.name);
      navigate('/dashboard');
    } catch (err) {
      // Handle different types of authentication errors
      const errorMessage = err.response?.data?.message;
      if (errorMessage === 'Email not found') {
        setError('Email does not exist. Please check your email or register.');
      } else if (errorMessage === 'Invalid password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError('An error occurred. Please try again.');
      }
    }
  };

  /**
   * Password Visibility Toggle
   * 
   * Switches between showing and hiding the password field
   * to improve user experience and security awareness.
   */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // --- JSX Rendering ---
  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1 className="page-title">Login</h1>
        
        {/* Email Input Field */}
        <div className="form-group">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="input" 
            required 
            aria-label="Email address"
          />
        </div>
        
        {/* Password Input Field with Visibility Toggle */}
        <div className="form-group password-group">
          <input 
            type={showPassword ? "text" : "password"}
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="input password-input" 
            required 
            aria-label="Password"
          />
          
          {/* Password Visibility Toggle Button */}
          {password && (
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          )}
        </div>
        
        {/* Error Message Display */}
        {error && <div className="error-message" role="alert">{error}</div>}
        
        {/* Submit Button */}
        <button type="submit" className="button">
          Login
        </button>
      </form>
    </div>
  );
}
