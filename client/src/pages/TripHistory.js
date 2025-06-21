import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function TripHistory() {
  // State for the list of trips, loading/error status, and filter values.
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tripTypeFilter, setTripTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [countrySearch, setCountrySearch] = useState('');
  const navigate = useNavigate();

  // Fetch the trip history when the component mounts.
  useEffect(() => {
    fetchTripHistory();
  }, []);

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

  // A simple utility function to format date strings for display.
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // This is where the client-side filtering logic is applied.
  // The `filteredTrips` array is derived from the original `trips` state based on the current filter settings.
  const today = new Date();
  const filteredTrips = trips.filter(trip => {
    // Filter by trip type.
    if (tripTypeFilter !== 'all' && trip.tripType.toLowerCase() !== tripTypeFilter) {
      return false;
    }
    // Filter by date (past or future).
    if (dateFilter !== 'all') {
      const tripDate = new Date(trip.tripDate);
      if (dateFilter === 'past' && tripDate >= today) return false;
      if (dateFilter === 'future' && tripDate < today) return false;
    }
    // Filter by a case-insensitive search of the country name.
    if (countrySearch.trim() !== '' && !trip.country.toLowerCase().includes(countrySearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (loading) {
    return <div className="loading">Loading trips...</div>;
  }

  if (error) {
    return (
      <div className="trip-history-page">
        <h2>Trip History</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="trip-history-page">
      <h2>Trip History</h2>
      {/* The controls for filtering the trip history list. */}
      <div className="trip-history-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="tripTypeFilter"><strong>Type:</strong> </label>
          <select id="tripTypeFilter" value={tripTypeFilter} onChange={e => setTripTypeFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="bike">Bike</option>
            <option value="trek">Trek</option>
          </select>
        </div>
        <div>
          <label htmlFor="dateFilter"><strong>Date:</strong> </label>
          <select id="dateFilter" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="past">Past</option>
            <option value="future">Future</option>
          </select>
        </div>
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
      {/* The grid of trip cards is rendered using the `filteredTrips` array. */}
      <div className="trip-history-grid">
        {filteredTrips.map(trip => (
          <div key={trip.tripId} className="trip-card">
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
            <div className="trip-details">
              <p><strong>Type:</strong> {trip.tripType}</p>
              <p><strong>Date:</strong> {trip.tripDate}</p>
              <p><strong>Created:</strong> {formatDate(trip.createdAt)}</p>
            </div>
            <button className="button" onClick={() => navigate(`/trip/${trip.tripId}`)}>
              View Trip
            </button>
          </div>
        ))}
      </div>
      {/* This section provides a helpful message if no trips are visible,
          distinguishing between having no trips at all and having no trips that match the current filters. */}
      {filteredTrips.length === 0 && (
        <div className="no-trips">
          <p>{trips.length === 0 ? 'No trips found in history.' : 'No trips match your current filters.'}</p>
          {trips.length === 0 ? (
            <button className="button" onClick={() => navigate('/trip-plan')}>
              Create your first trip
            </button>
          ) : (
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