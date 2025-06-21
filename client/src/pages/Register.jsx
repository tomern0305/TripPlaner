import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

export default function Register({ onLogin }) {
  // State for form inputs, password visibility, and error messages.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // This effect checks if a user is already logged in by looking for a token.
  // If a token exists, it redirects the user to the dashboard to prevent them from seeing the register page again.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Handles the form submission to the register API endpoint.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    try {
      const response = await axios.post('http://localhost:5000/api/register', { name, email, password });
      
      // Upon successful registration, the user is automatically logged in.
      // The token and username are stored in localStorage.
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.name);
      
      // Call the `onLogin` prop to update the parent component's state (in App.js).
      if (onLogin) onLogin(response.data.name);
      navigate('/dashboard');
    } catch (err) {
      // Provides user-friendly error messages based on the API response.
      const errorMessage = err.response?.data?.message;
      if (errorMessage === 'Email already exists') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        setError('Registration failed. Please try again.');
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
        <h1 className="page-title">Register</h1>
        <div className="form-group">
          <input 
            type="text" 
            placeholder="Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="input" 
            required 
          />
        </div>
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
        <button type="submit" className="button">Register</button>
      </form>
    </div>
  );
}
