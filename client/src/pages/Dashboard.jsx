import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

/**
 * Dashboard Component
 * 
 * Main landing page for authenticated users, providing an overview of their
 * trip planning activity and quick access to key features.
 * 
 * Features:
 * - User profile information display
 * - Recent trip overview with quick access
 * - Action buttons for common tasks
 * - Responsive design with loading states
 * - Error handling and user feedback
 * 
 * Data Management:
 * - Fetches user profile and trip history concurrently
 * - Displays most recent trip for quick access
 * - Handles authentication errors gracefully
 */
export default function Dashboard() {
  // --- State Management ---
  
  /**
   * Data State
   * Manages user information and trip data
   */
  const [user, setUser] = useState(null);
  const [lastTrip, setLastTrip] = useState(null);
  
  /**
   * UI State
   * Controls loading indicators and error messages
   */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation hook for programmatic routing
  const navigate = useNavigate();

  // --- Side Effects ---

  /**
   * Data Fetching Effect
   * 
   * Loads user profile and trip history data on component mount.
   * Uses Promise.all for concurrent API calls to improve performance.
   * Handles authentication errors and provides user feedback.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user data and trip history concurrently for better performance
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
      
      // Set the most recent trip for display if available
      if (tripRes.data.success && tripRes.data.trips.length > 0) {
        setLastTrip(tripRes.data.trips[0]); // Get the most recent trip
      }
    })
    .catch((err) => {
      console.error('Error fetching dashboard data:', err);
      
      // Handle authentication errors by logging out the user
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

  // --- Event Handlers ---

  /**
   * Logout Handler
   * 
   * Clears authentication data and redirects to login page.
   * Used as a fallback when authentication fails.
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // --- Utility Functions ---

  /**
   * Date Formatting Utility
   * 
   * Converts date strings to a user-friendly format for display.
   * 
   * @param {string} dateString - ISO date string to format
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // --- Loading and Error States ---

  // Display loading indicator while data is being fetched
  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  // Display error message if data fetching fails
  if (error) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  // --- JSX Rendering ---
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

        {/* Recent Trip Section */}
        {lastTrip ? (
          <div className="last-trip-section">
            <h2 className="section-title">Your Last Trip</h2>
            
            {/* Featured Trip Card */}
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
          // Empty State for New Users
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
