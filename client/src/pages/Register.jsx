import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    try {
      const response = await axios.post('http://localhost:5000/api/register', { name, email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.name);
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.message;
      if (errorMessage === 'Email already exists') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        setError('Registration failed. Please try again.');
      }
    }
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
        <div className="form-group">
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="input" 
            required 
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="button">Register</button>
      </form>
    </div>
  );
}
