import { useState, useEffect } from 'react';

function TripHistory() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Here you would typically fetch trips from your database
    // For now, we'll use some dummy data
    const dummyTrips = [
      {
        id: 1,
        location: 'Jerusalem',
        type: 'Trek',
        date: '2024-03-15',
        duration: '3 hours',
        difficulty: 'Medium'
      },
      {
        id: 2,
        location: 'Tel Aviv',
        type: 'Bike',
        date: '2024-03-10',
        duration: '2 hours',
        difficulty: 'Easy'
      }
    ];

    setTrips(dummyTrips);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading trips...</div>;
  }

  return (
    <div className="trip-history-page">
      <h2>Trip History</h2>
      
      <div className="trip-history">
        {trips.map(trip => (
          <div key={trip.id} className="trip-card">
            <h3>{trip.location}</h3>
            <div className="trip-details">
              <p><strong>Type:</strong> {trip.type}</p>
              <p><strong>Date:</strong> {trip.date}</p>
              <p><strong>Duration:</strong> {trip.duration}</p>
              <p><strong>Difficulty:</strong> {trip.difficulty}</p>
            </div>
            <button className="button" onClick={() => window.location.href = `/trip-planner?trip=${trip.id}`}>
              View Trip
            </button>
          </div>
        ))}
      </div>

      {trips.length === 0 && (
        <div className="no-trips">
          <p>No trips found in history</p>
        </div>
      )}
    </div>
  );
}

export default TripHistory; 