import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

export default function Dashboard() {
  // State for user data, their most recent trip, loading status, and errors.
  const [user, setUser] = useState(null);
  const [lastTrip, setLastTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user data and trip history concurrently for a faster loading experience.
    // Promise.all is used to wait for both API calls to complete.
    Promise.all([
      axios.get('http://localhost:5000/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get('http://localhost:5000/api/trip/history', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    .then(([userRes, tripRes]) => {
      setUser(userRes.data);
      // If the user has a trip history, set the most recent one for display.
      if (tripRes.data.success && tripRes.data.trips.length > 0) {
        setLastTrip(tripRes.data.trips[0]); // Get the most recent trip
      }
    })
    .catch((err) => {
      console.error('Error fetching dashboard data:', err);
      // If the token is invalid or expired (401), log the user out.
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    })
    .finally(() => {
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // A simple utility function to format date strings for display.
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Display a loading message while data is being fetched.
  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  // Display an error message if data fetching fails.
  if (error) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="page-title">
            Welcome back{user ? `, ${user.name}` : ''}! 👋
          </h1>
          <p className="welcome-subtitle">
            Ready to plan your next adventure? Let's create something amazing together.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="dashboard-actions">
          <button 
            className="button primary-button"
            onClick={() => navigate('/trip-plan')}
          >
            🗺️ Plan New Trip
          </button>
          <button 
            className="button secondary-button"
            onClick={() => navigate('/trip-history')}
          >
            📋 View All Trips
          </button>
        </div>

        {/* This section conditionally renders based on whether the user has a previous trip. */}
        {lastTrip ? (
          <div className="last-trip-section">
            <h2 className="section-title">Your Last Trip</h2>
            {/* The 'featured-trip' card highlights the most recent trip. */}
            <div className="trip-card featured-trip">
              <div className="flag-title-group">
                {lastTrip.countryFlag && (
                  <img
                    src={lastTrip.countryFlag}
                    alt={`${lastTrip.country} flag`}
                    className="country-flag-small"
                  />
                )}
                <h3>{lastTrip.city}, {lastTrip.country}</h3>
              </div>
              <div className="trip-details">
                <p><strong>Type:</strong> {lastTrip.tripType}</p>
                <p><strong>Date:</strong> {lastTrip.tripDate}</p>
                <p><strong>Created:</strong> {formatDate(lastTrip.createdAt)}</p>
              </div>
              <div className="trip-actions">
                <button 
                  className="button"
                  onClick={() => navigate(`/trip/${lastTrip.tripId}`)}
                >
                  View Trip
                </button>
                <button 
                  className="button secondary-button"
                  onClick={() => navigate('/trip-history')}
                >
                  View All Trips
                </button>
              </div>
            </div>
          </div>
        ) : (
          // If there are no trips, a call-to-action is displayed instead.
          <div className="no-trips-section">
            <h2 className="section-title">Start Your Journey</h2>
            <div className="no-trips-card">
              <div className="no-trips-icon">✈️</div>
              <h3>No trips yet</h3>
              <p>You haven't planned any trips yet. Let's create your first adventure!</p>
              <button 
                className="button primary-button"
                onClick={() => navigate('/trip-plan')}
              >
                Create Your First Trip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
