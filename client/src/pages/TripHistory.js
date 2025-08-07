import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * Trip History Component
 * 
 * Displays a comprehensive list of all user trips with advanced filtering and search capabilities.
 * This component provides users with easy access to their trip planning history and allows
 * them to quickly find specific trips using various filter criteria.
 * 
 * Features:
 * - Complete trip history display with trip cards
 * - Advanced filtering by trip type, date range, and country
 * - Real-time search functionality
 * - Responsive grid layout
 * - Loading states and error handling
 * - Empty state management for new users
 * 
 * Filtering System:
 * - Trip Type: Filter by 'bike', 'trek', or show all trips
 * - Date Range: Filter by past trips, future trips, or show all
 * - Country Search: Case-insensitive search by country name
 * - Combined filtering: Multiple filters can be applied simultaneously
 */
function TripHistory() {
  // --- State Management ---
  
  /**
   * Data State
   * Manages the list of trips and their display
   */
  const [trips, setTrips] = useState([]);
  
  /**
   * UI State
   * Controls loading indicators, error messages, and filter values
   */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  /**
   * Filter State
   * Manages the current filter settings for trip display
   */
  const [tripTypeFilter, setTripTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [countrySearch, setCountrySearch] = useState('');
  
  // Navigation hook for programmatic routing
  const navigate = useNavigate();

  // --- Side Effects ---

  /**
   * Data Fetching Effect
   * 
   * Loads the complete trip history when the component mounts.
   * Handles authentication errors and provides user feedback.
   */
  useEffect(() => {
    fetchTripHistory();
  }, []);

  // --- Data Fetching Functions ---

  /**
   * Fetch Trip History
   * 
   * Retrieves the complete trip history for the authenticated user.
   * Handles authentication validation and error responses.
   */
  const fetchTripHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to view trip history.');
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:5000/api/trip/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setTrips(response.data.trips);
      } else {
        setError('Failed to fetch trip history.');
      }
    } catch (error) {
      console.error('Error fetching trip history:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to fetch trip history. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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

  // --- Filtering Logic ---

  /**
   * Filtered Trips Computation
   * 
   * Applies all active filters to the trip list and returns the filtered results.
   * This is computed dynamically based on the current filter state.
   */
  const today = new Date();
  const filteredTrips = trips.filter(trip => {
    // Filter by trip type
    if (tripTypeFilter !== 'all' && trip.tripType.toLowerCase() !== tripTypeFilter) {
      return false;
    }
    
    // Filter by date range (past or future)
    if (dateFilter !== 'all') {
      const tripDate = new Date(trip.tripDate);
      if (dateFilter === 'past' && tripDate >= today) return false;
      if (dateFilter === 'future' && tripDate < today) return false;
    }
    
    // Filter by country search (case-insensitive)
    if (countrySearch.trim() !== '' && !trip.country.toLowerCase().includes(countrySearch.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // --- Loading and Error States ---

  // Display loading indicator while data is being fetched
  if (loading) {
    return <div className="loading">Loading trips...</div>;
  }

  // Display error message if data fetching fails
  if (error) {
    return (
      <div className="trip-history-page">
        <h2>Trip History</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  // --- JSX Rendering ---
  return (
    <div className="trip-history-page">
      <h2>Trip History</h2>
      
      {/* Filter Controls */}
      <div className="trip-history-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Trip Type Filter */}
        <div>
          <label htmlFor="tripTypeFilter"><strong>Type:</strong> </label>
          <select 
            id="tripTypeFilter" 
            value={tripTypeFilter} 
            onChange={e => setTripTypeFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="bike">Bike</option>
            <option value="trek">Trek</option>
          </select>
        </div>
        
        {/* Date Range Filter */}
        <div>
          <label htmlFor="dateFilter"><strong>Date:</strong> </label>
          <select 
            id="dateFilter" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="past">Past</option>
            <option value="future">Future</option>
          </select>
        </div>
        
        {/* Country Search Filter */}
        <div>
          <label htmlFor="countrySearch"><strong>Country:</strong> </label>
          <input
            id="countrySearch"
            type="text"
            placeholder="Search by country..."
            value={countrySearch}
            onChange={e => setCountrySearch(e.target.value)}
            style={{ minWidth: 180 }}
          />
        </div>
      </div>
      
      {/* Trip Grid */}
      <div className="trip-history-grid">
        {filteredTrips.map(trip => (
          <div key={trip.tripId} className="trip-card">
            {/* Trip Header with Flag and Title */}
            <div className="flag-title-group" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', display: 'flex', marginBottom: '0.7rem', minHeight: 0, gap: '0.5rem' }}>
              {trip.countryFlag && (
                <img
                  src={trip.countryFlag}
                  alt={`${trip.country} flag`}
                  className="country-flag-small"
                  style={{ marginBottom: '0.3rem' }}
                />
              )}
              <h3 style={{ textAlign: 'center', margin: 0 }}>{trip.city}, {trip.country}</h3>
            </div>
            
            {/* Trip Details */}
            <div className="trip-details">
              <p><strong>Type:</strong> {trip.tripType}</p>
              <p><strong>Date:</strong> {trip.tripDate}</p>
              <p><strong>Created:</strong> {formatDate(trip.createdAt)}</p>
            </div>
            
            {/* Trip Actions */}
            <button 
              className="button" 
              onClick={() => navigate(`/trip/${trip.tripId}`)}
            >
              View Trip
            </button>
          </div>
        ))}
      </div>
      
      {/* Empty State Management */}
      {filteredTrips.length === 0 && (
        <div className="no-trips">
          <p>
            {trips.length === 0 
              ? 'No trips found in history.' 
              : 'No trips match your current filters.'
            }
          </p>
          {trips.length === 0 ? (
            // New user - encourage first trip creation
            <button className="button" onClick={() => navigate('/trip-plan')}>
              Create your first trip
            </button>
          ) : (
            // Filtered out all trips - provide clear filters option
            <button className="button" onClick={() => {
              setTripTypeFilter('all');
              setDateFilter('all');
              setCountrySearch('');
            }}>
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TripHistory; 