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
      alert('Registered and logged in!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Register error:', err.response?.data || err.message);
      alert('Registration failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container">
      <h1 className="page-title">Register</h1>
      <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
      <button type="submit" className="button">Register</button>
    </form>
  );
}
