import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', { email, password });
      localStorage.setItem('token', response.data.token);
      alert('Logged in successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      alert('Login failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container">
      <h1 className="page-title">Login</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
      <button type="submit" className="button">Login</button>
    </form>
  );
}
