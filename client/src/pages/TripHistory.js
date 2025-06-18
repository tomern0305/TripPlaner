import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function TripHistory() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
      <div className="trip-history-grid">
        {trips.map(trip => (
          <div key={trip.tripId} className="trip-card">
            <div className="flag-title-group">
              {trip.countryFlag && (
                <img
                  src={trip.countryFlag}
                  alt={`${trip.country} flag`}
                  className="country-flag-small"
                />
              )}
              <h3>{trip.city}, {trip.country}</h3>
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
      {trips.length === 0 && (
        <div className="no-trips">
          <p>No trips found in history. Create your first trip!</p>
        </div>
      )}
    </div>
  );
}

export default TripHistory; 