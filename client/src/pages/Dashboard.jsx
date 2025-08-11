import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

/**
 * Dashboard Component
 * Main landing page for authenticated users providing trip overview, statistics, and quick access to features.
 */
export default function Dashboard() {
  // Application state
  const [user, setUser] = useState(null);
  const [allTrips, setAllTrips] = useState([]);
  const [closestTrip, setClosestTrip] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  /**
   * Initialize dashboard data on component mount
   * Fetches user profile and trip history concurrently, processes trip data for statistics and closest trip.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user data and trip history concurrently
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
      
      // Process trip data if available
      if (tripRes.data.success && tripRes.data.trips.length > 0) {
        const trips = tripRes.data.trips;
        setAllTrips(trips);
        
        // Find the trip with the date closest to today
        const today = new Date();
        const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const closestTrip = trips.reduce((closest, trip) => {
          const tripDate = new Date(trip.tripDate);
          const closestDate = closest ? new Date(closest.tripDate) : null;
          
          if (!closestDate) return trip;
          
          const tripDiff = Math.abs(tripDate - todayNormalized);
          const closestDiff = Math.abs(closestDate - todayNormalized);
          
          return tripDiff < closestDiff ? trip : closest;
        }, null);
        
        setClosestTrip(closestTrip);
      }
    })
    .catch((err) => {
      console.error('Error fetching dashboard data:', err);
      
      // Handle authentication errors
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

  /**
   * Handle logout action
   * 
   * Clears authentication data and redirects to login page.
   * Used as a fallback when authentication fails.
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  /**
   * Format date string to user-friendly display format
   * 
   * @param {string} dateString - ISO date string to format
   * @returns {string} Formatted date string (e.g., "January 15, 2024")
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /**
   * Calculate the number of trips with dates in the past
   * 
   * @returns {number} Count of past trips
   */
  const getPastTripsCount = () => {
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return allTrips.filter(trip => new Date(trip.tripDate) < todayNormalized).length;
  };

  /**
   * Calculate the number of trips with dates today or in the future
   * 
   * @returns {number} Count of future trips
   */
  const getFutureTripsCount = () => {
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return allTrips.filter(trip => new Date(trip.tripDate) >= todayNormalized).length;
  };

  /**
   * Get the 8 most recently created trips
   * 
   * @returns {Array} Array of 8 most recently created trips
   */
  const getRecentTrips = () => {
    return allTrips
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
  };

  // Loading state
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-welcome">
            Welcome back{user ? `, ${user.name}` : ''}! 👋
          </h1>
          <p className="dashboard-subtitle">
            Ready to plan your next adventure? Let's create something amazing together.
          </p>
        </div>

        {/* Trip Statistics */}
        <div className="dashboard-stats">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">🗺️</div>
            <div className="dashboard-stat-number">{allTrips.length}</div>
            <div className="dashboard-stat-label">Total Trips</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">📅</div>
            <div className="dashboard-stat-number">{getPastTripsCount()}</div>
            <div className="dashboard-stat-label">Past Trips</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">⭐</div>
            <div className="dashboard-stat-number">{getFutureTripsCount()}</div>
            <div className="dashboard-stat-label">Future Trips</div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="dashboard-sections">
          <div className="dashboard-main-section">
            {/* Closest Trip Section */}
            {closestTrip ? (
              <div className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-section-title">
                    <span className="dashboard-section-icon">🌟</span>
                    Closest Trip
                  </h2>
                  <a href="/trip-history" className="dashboard-section-action">
                    View All Trips
                  </a>
                </div>
                
                {/* Closest Trip Card */}
                <div className="featured-trip-card">
                  <div className="featured-trip-content">
                    <div className="featured-trip-header">
                      {closestTrip.countryFlag && (
                        <img
                          src={closestTrip.countryFlag}
                          alt={`${closestTrip.country} flag`}
                          className="featured-trip-flag"
                        />
                      )}
                      <h3 className="featured-trip-title">
                        {closestTrip.tripName ? closestTrip.tripName : `${closestTrip.city}, ${closestTrip.country}`}
                      </h3>
                    </div>
                    {closestTrip.tripDescription && (
                      <p className="featured-trip-description">
                        {closestTrip.tripDescription}
                      </p>
                    )}
                    
                    <div className="featured-trip-details">
                      <div className="featured-trip-detail">
                        <span className="featured-trip-detail-label">Location</span>
                        <span className="featured-trip-detail-value">{closestTrip.city}, {closestTrip.country}</span>
                      </div>
                      <div className="featured-trip-detail">
                        <span className="featured-trip-detail-label">Type</span>
                        <span className="featured-trip-detail-value">{closestTrip.tripType}</span>
                      </div>
                      <div className="featured-trip-detail">
                        <span className="featured-trip-detail-label">Date</span>
                        <span className="featured-trip-detail-value">{closestTrip.tripDate}</span>
                      </div>
                      <div className="featured-trip-detail">
                        <span className="featured-trip-detail-label">Created</span>
                        <span className="featured-trip-detail-value">{formatDate(closestTrip.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="featured-trip-actions">
                      <a 
                        href={`/trip/${closestTrip.tripId}`}
                        className="featured-trip-btn primary"
                      >
                        View Details
                      </a>
                      <a 
                        href="/trip-history"
                        className="featured-trip-btn"
                      >
                        View All Trips
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Empty state for new users
              <div className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-section-title">
                    <span className="dashboard-section-icon">✈️</span>
                    Start Your Journey
                  </h2>
                </div>
                
                <div className="featured-trip-card">
                  <div className="featured-trip-content">
                    <h3 className="featured-trip-title">No trips yet</h3>
                    <p className="featured-trip-description">
                      You haven't planned any trips yet. Let's create your first adventure!
                    </p>
                    
                    <div className="featured-trip-actions">
                      <a 
                        href="/trip-plan"
                        className="featured-trip-btn primary"
                      >
                        Create Your First Trip
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Section */}
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">
                  <span className="dashboard-section-icon">⚡</span>
                  Quick Actions
                </h2>
              </div>
              
              <div className="quick-actions">
                <a href="/trip-plan" className="quick-action-card">
                  <div className="quick-action-icon">🗺️</div>
                  <h3 className="quick-action-title">Plan New Trip</h3>
                  <p className="quick-action-description">
                    Create a new travel itinerary with AI-powered recommendations
                  </p>
                </a>
                
                <a href="/trip-history" className="quick-action-card">
                  <div className="quick-action-icon">📋</div>
                  <h3 className="quick-action-title">View All Trips</h3>
                  <p className="quick-action-description">
                    Browse and manage your existing travel plans
                  </p>
                </a>
                
                <a href="/trip-plan" className="quick-action-card">
                  <div className="quick-action-icon">🌍</div>
                  <h3 className="quick-action-title">Explore Destinations</h3>
                  <p className="quick-action-description">
                    Discover new places and get inspired for your next adventure
                  </p>
                </a>
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="dashboard-section">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">
                <span className="dashboard-section-icon">📊</span>
                Recent Activity
              </h2>
            </div>
            
            <div className="activity-list">
              {getRecentTrips().length > 0 ? (
                getRecentTrips().map((trip, index) => (
                  <div key={trip.tripId || index} className="activity-item">
                    <div className="activity-icon">🗺️</div>
                    <div className="activity-content">
                      <div className="activity-title">
                        {trip.tripName ? trip.tripName : `${trip.city}, ${trip.country}`}
                      </div>
                      <div className="activity-time">
                        {formatDate(trip.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="activity-item">
                  <div className="activity-icon">📝</div>
                  <div className="activity-content">
                    <div className="activity-title">No trips created yet</div>
                    <div className="activity-time">Create your first trip to see activity</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
