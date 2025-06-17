import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [navigate]);

  return (
    <div className="container">
      <h1 className="page-title">Welcome to the Dashboard</h1>
      <p>You are successfully logged in.</p>
      <button onClick={handleLogout} className="button">Logout</button>
    </div>
  );
}