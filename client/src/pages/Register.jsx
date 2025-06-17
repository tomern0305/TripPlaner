import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/register', { name, email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.name);
      alert('Registered and logged in!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Register error:', err.response?.data || err.message);
      alert('Registration failed.');
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
        <button type="submit" className="button">Register</button>
      </form>
    </div>
  );
}
