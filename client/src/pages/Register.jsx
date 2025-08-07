import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

/**
 * Register Component
 * 
 * Provides user registration functionality with form validation and error handling.
 * This component creates new user accounts and automatically logs users in
 * upon successful registration.
 * 
 * Features:
 * - Form validation and error display
 * - Password visibility toggle
 * - Automatic redirection for already authenticated users
 * - User-friendly error messages
 * - Responsive design with accessibility features
 * - Automatic login after successful registration
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onLogin - Callback function called after successful registration/login
 */
export default function Register({ onLogin }) {
  // --- State Management ---
  
  /**
   * Form Input State
   * Manages the current values of name, email, and password fields
   */
  const [name, setName] = useState('');
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
   * authenticated users from accessing the registration page.
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
   * Processes the registration form submission by sending user data to the server.
   * Handles successful registration, automatic login, and error responses.
   * 
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    
    try {
      // Send registration request to server
      const response = await axios.post('http://localhost:5000/api/register', { 
        name, 
        email, 
        password 
      });
      
      // Upon successful registration, user is automatically logged in
      // Store authentication data in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.name);
      
      // Update parent component state and navigate to dashboard
      if (onLogin) onLogin(response.data.name);
      navigate('/dashboard');
    } catch (err) {
      // Handle different types of registration errors
      const errorMessage = err.response?.data?.message;
      if (errorMessage === 'Email already exists') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        setError('Registration failed. Please try again.');
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
        <h1 className="page-title">Register</h1>
        
        {/* Name Input Field */}
        <div className="form-group">
          <input 
            type="text" 
            placeholder="Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="input" 
            required 
            aria-label="Full name"
          />
        </div>
        
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
          Register
        </button>
      </form>
    </div>
  );
}
