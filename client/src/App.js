import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './App.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Router>
      <div className="container">
        <nav className="nav">
          <Link to="/register" className="nav-link">Register</Link>
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
        </nav>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}