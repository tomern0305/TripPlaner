import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function TripView() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([31.7683, 35.2137]);
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);

  useEffect(() => {
    fetchTrip();
    // eslint-disable-next-line
  }, [tripId]);

  const fetchTrip = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to view this trip.');
        setLoading(false);
        return;
      }
      const response = await axios.get(`http://localhost:5000/api/trip/trip/${tripId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setTrip(response.data.trip);
        // Prepare map data
        const tripData = response.data.trip.tripData;
        const allMarkers = [];
        const allPolylines = [];
        tripData.days.forEach((day, dayIndex) => {
          const dayMarkers = day.cities.map((cityData, cityIndex) => {
            const isStartEnd = cityIndex === 0 ||
              (cityIndex === day.cities.length - 1 &&
                cityData.coordinates[0] === day.cities[0].coordinates[0] &&
                cityData.coordinates[1] === day.cities[0].coordinates[1]);
            return {
              position: cityData.coordinates,
              title: isStartEnd ?
                `Day ${day.day} - ${cityData.name} (Start/End)` :
                `Day ${day.day} - ${cityData.name}`,
              day: day.day,
              cityIndex: cityIndex,
              isStartEnd: isStartEnd
            };
          });
          allMarkers.push(...dayMarkers);
          if (day.cities.length > 1) {
            const positions = day.cities.map(cityData => cityData.coordinates);
            allPolylines.push({
              positions,
              color: dayIndex === 0 ? '#ff4444' : '#4444ff',
              weight: 3,
              opacity: 0.7,
              day: day.day
            });
          }
        });
        setMarkers(allMarkers);
        setPolylines(allPolylines);
        if (tripData.days[0] && tripData.days[0].cities[0]) {
          setMapCenter(tripData.days[0].cities[0].coordinates);
        }
      } else {
        setError('Failed to fetch trip details.');
      }
    } catch (err) {
      setError('Failed to fetch trip details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading trip...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!trip) return null;

  return (
    <div className="trip-view-page">
      <div className="trip-view-content">
        <div className="trip-details">
          <div className="trip-header">
            {trip.countryFlag && (
              <img src={trip.countryFlag} alt={`${trip.country} flag`} className="country-flag" />
            )}
            <div className="trip-info">
              <h3>{trip.city}, {trip.country}</h3>
              <p><strong>Type:</strong> {trip.tripType}</p>
              <p><strong>Date:</strong> {trip.tripDate}</p>
              <p><strong>Created:</strong> {new Date(trip.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          {trip.tripData && trip.tripData.days.map((day, index) => (
            <div key={index} className="day-route">
              <h4>Day {day.day}</h4>
              <div className="route-info">
                <p><strong>Total Distance:</strong> {day.totalDistance}</p>
                <p><strong>Estimated Time:</strong> {day.estimatedTime}</p>
              </div>
              <div className="cities-list">
                <strong>Route:</strong>
                <ul>
                  {day.cities.map((cityData, cityIndex) => (
                    <li key={cityIndex}>
                      <strong>{cityData.name}</strong> ({cityData.coordinates[0].toFixed(4)}, {cityData.coordinates[1].toFixed(4)})
                      {day.distances && day.distances[cityIndex] && (
                        <span className="distance-info"> → {day.distances[cityIndex]}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="map-container" style={{ marginTop: 24 }}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <ChangeMapView center={mapCenter} />
            {polylines.map((polyline, index) => (
              <Polyline
                key={index}
                positions={polyline.positions}
                color={polyline.color}
                weight={polyline.weight}
                opacity={polyline.opacity}
              />
            ))}
            {markers.map((marker, index) => (
              <Marker key={index} position={marker.position}>
                <Popup>
                  <div>
                    <strong>{marker.title}</strong>
                    <br />
                    Coordinates: {marker.position[0].toFixed(4)}, {marker.position[1].toFixed(4)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="trip-view-back-btn-container">
          <button className="button" onClick={() => navigate(-1)}>
            &larr; Back
          </button>
        </div>
      </div>
    </div>
  );
} 