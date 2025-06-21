import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

export default function Login({ onLogin }) {
  // State for form inputs, password visibility, and error messages.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // This effect checks if a user is already logged in by looking for a token.
  // If a token exists, it redirects the user to the dashboard to prevent them from seeing the login page again.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Handles the form submission to the login API endpoint.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    try {
      const response = await axios.post('http://localhost:5000/api/login', { email, password });
      
      // Upon successful login, store the token and username in localStorage.
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.name);
      
      // Call the `onLogin` prop to update the parent component's state (in App.js).
      onLogin(response.data.name);
      navigate('/dashboard');
    } catch (err) {
      // Provides user-friendly error messages based on the API response.
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

  // Toggles the visibility of the password field.
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1 className="page-title">Login</h1>
        <div className="form-group">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="input" 
            required 
          />
        </div>
        <div className="form-group password-group">
          <input 
            type={showPassword ? "text" : "password"}
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="input password-input" 
            required 
          />
          {/* A button to toggle password visibility appears when the user starts typing. */}
          {password && (
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="button">Login</button>
      </form>
    </div>
  );
}
