import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import polyline from 'polyline';

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

const ORS_API_KEY = '5b3ce3597851110001cf62483581bb6eecd44fca82594cc3a6b2cd7f';

// Utility to fetch route from OpenRouteService
async function fetchORSRoute(start, end, profile = 'foot-walking') {
  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
  try {
    const response = await axios.post(
      url,
      {
        coordinates: [
          [start[1], start[0]], // [lon, lat]
          [end[1], end[0]]
        ]
      },
      {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('ORS API response:', response.data);
    if (
      response.data &&
      response.data.routes &&
      response.data.routes[0] &&
      response.data.routes[0].geometry
    ) {
      // Decode the polyline geometry
      const coords = polyline.decode(response.data.routes[0].geometry);
      return coords;
    } else {
      console.error('ORS API unexpected response:', response.data);
      return [start, end];
    }
  } catch (err) {
    if (err.response) {
      console.error('ORS route error', err.response.data);
    } else {
      console.error('ORS route error', err);
    }
    return [start, end]; // fallback to straight line
  }
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
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    fetchTrip();
    // eslint-disable-next-line
  }, [tripId]);

  // Fetch weather forecast when trip is loaded
  useEffect(() => {
    if (trip && trip.city && trip.country && trip.tripDate) {
      fetchWeatherForecast();
    }
    // eslint-disable-next-line
  }, [trip]);

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
        // Helper to get ORS profile
        const getProfile = () => (response.data.trip.tripType === 'bike' ? 'cycling-regular' : 'foot-walking');
        // Build all polylines for all days using actual routes from OpenRouteService
        async function buildRoutes() {
          for (const [dayIndex, day] of tripData.days.entries()) {
            // Only pin start and end
            const dayMarkers = [];
            if (day.cities.length > 0) {
              dayMarkers.push({
                position: day.cities[0].coordinates,
                title: `Day ${day.day} - ${day.cities[0].name} (Start)`,
                day: day.day,
                cityIndex: 0,
                isStartEnd: true
              });
              if (day.cities.length > 1) {
                const lastIdx = day.cities.length - 1;
                dayMarkers.push({
                  position: day.cities[lastIdx].coordinates,
                  title: `Day ${day.day} - ${day.cities[lastIdx].name} (End)`,
                  day: day.day,
                  cityIndex: lastIdx,
                  isStartEnd: true
                });
              }
            }
            allMarkers.push(...dayMarkers);
            // Build the full route polyline for the day by combining all segments
            let fullRoute = [];
            for (let i = 0; i < day.cities.length - 1; i++) {
              const start = day.cities[i].coordinates;
              const end = day.cities[i + 1].coordinates;
              // Fetch the actual route from OpenRouteService for each segment
              const segment = await fetchORSRoute(start, end, getProfile());
              // Avoid duplicate points between segments
              if (fullRoute.length > 0 && segment.length > 0 && fullRoute[fullRoute.length - 1][0] === segment[0][0] && fullRoute[fullRoute.length - 1][1] === segment[0][1]) {
                fullRoute = fullRoute.concat(segment.slice(1));
              } else {
                fullRoute = fullRoute.concat(segment);
              }
            }
            if (fullRoute.length > 1) {
              allPolylines.push({
                positions: fullRoute,
                color: dayIndex === 0 ? '#ff4444' : '#4444ff',
                weight: 3,
                opacity: 0.7,
                day: day.day
              });
            }
          }
        }
        await buildRoutes();
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

  const fetchWeatherForecast = async () => {
    if (!trip || !trip.city || !trip.country || !trip.tripDate) {
      setWeatherError('Trip information is required to fetch weather forecast.');
      return;
    }
    setWeatherLoading(true);
    setWeatherError('');
    setWeatherData(null);
    try {
      const response = await axios.post('http://localhost:5000/api/trip/weather', {
        city: trip.city,
        country: trip.country,
        tripDate: trip.tripDate
      });
      if (response.data.success) {
        setWeatherData(response.data.weather);
      } else {
        setWeatherError('Failed to fetch weather data.');
      }
    } catch (error) {
      if (error.response?.data?.error) {
        setWeatherError(error.response.data.error);
      } else {
        setWeatherError('Failed to fetch weather forecast. Please try again.');
      }
    } finally {
      setWeatherLoading(false);
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
          {/* Weather Forecast Display */}
          <div className="weather-section">
            <h3>Weather Forecast</h3>
            <div className="weather-content">
              {(() => {
                if (!trip || !trip.tripDate) return null;
                const today = new Date();
                const tripDateObj = new Date(trip.tripDate);
                const daysDiff = Math.ceil((tripDateObj - today) / (1000 * 60 * 60 * 24));
                // Only show loading spinner for daysDiff >= 0
                if (weatherLoading && daysDiff >= 0) {
                  return (
                    <div className="weather-loading">
                      <p>Loading weather forecast...</p>
                    </div>
                  );
                }
                // Only show error/retry for 0-3 days
                if (weatherError && daysDiff >= 0 && daysDiff <= 3) {
                  return (
                    <div className="weather-error">
                      <p>{weatherError}</p>
                      <button 
                        onClick={fetchWeatherForecast} 
                        className="retry-weather-button"
                        disabled={weatherLoading}
                      >
                        Retry
                      </button>
                    </div>
                  );
                }
                // 0-3 days: show actual forecast
                if (weatherData && !weatherData.message && daysDiff >= 0 && daysDiff <= 3) {
                  return (
                    <div className="weather-card">
                      <div className="weather-header">
                        <h4>{weatherData.city}, {weatherData.country}</h4>
                        <p className="weather-date">{weatherData.date}</p>
                      </div>
                      <div className="weather-main">
                        <div className="weather-icon">
                          <img 
                            src={`https:${weatherData.icon}`} 
                            alt={weatherData.description}
                          />
                        </div>
                        <div className="weather-temp">
                          <span className="temperature">{weatherData.temperature}&deg;C</span>
                          <span className="description">{weatherData.description}</span>
                          {weatherData.maxTemp && weatherData.minTemp && (
                            <span className="temp-range">
                              H: {weatherData.maxTemp}&deg;C L: {weatherData.minTemp}&deg;C
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="weather-item">
                        <span className="label">Humidity:</span>
                        <span className="value">{weatherData.humidity}%</span>
                      </div>
                      <div className="weather-item">
                        <span className="label">Wind Speed:</span>
                        <span className="value">{weatherData.windSpeed} km/h</span>
                      </div>
                      {weatherData.precipitation !== undefined && (
                        <div className="weather-item">
                          <span className="label">Precipitation:</span>
                          <span className="value">{weatherData.precipitation} mm</span>
                        </div>
                      )}
                      {weatherData.uvIndex !== undefined && (
                        <div className="weather-item">
                          <span className="label">UV Index:</span>
                          <span className="value">{weatherData.uvIndex}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                // 4+ days: always show current weather as reference (no error)
                if (daysDiff >= 4) {
                  return (
                    <div className="weather-message">
                      <p>Weather for {trip.tripDate} is not available yet, you may try again closer to the trip date. Here is the current weather in {trip.city} as reference.</p>
                      {weatherData && weatherData.currentTemperature && (
                        <div className="current-weather-info">
                          <div className="current-weather-main">
                            <img 
                              src={`https:${weatherData.currentIcon}`} 
                              alt={weatherData.currentDescription}
                              className="current-weather-icon"
                            />
                            <div className="current-weather-details">
                              <span className="current-temperature">{weatherData.currentTemperature}&deg;C</span>
                              <span className="current-description">{weatherData.currentDescription}</span>
                            </div>
                          </div>
                          <div className="current-weather-stats">
                            <span>Humidity: {weatherData.currentHumidity}%</span>
                            <span>Wind: {weatherData.currentWindSpeed} km/h</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                // Past dates: only show historical weather if available, else only show unavailable message
                if (daysDiff < 0) {
                  if (weatherData && !weatherData.message) {
                    // If API provides historical weather
                    return (
                      <div className="weather-card">
                        <div className="weather-header">
                          <h4>{weatherData.city}, {weatherData.country}</h4>
                          <p className="weather-date">{weatherData.date}</p>
                        </div>
                        <div className="weather-main">
                          <div className="weather-icon">
                            <img 
                              src={`https:${weatherData.icon}`} 
                              alt={weatherData.description}
                            />
                          </div>
                          <div className="weather-temp">
                            <span className="temperature">{weatherData.temperature}&deg;C</span>
                            <span className="description">{weatherData.description}</span>
                            {weatherData.maxTemp && weatherData.minTemp && (
                              <span className="temp-range">
                                H: {weatherData.maxTemp}&deg;C L: {weatherData.minTemp}&deg;C
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="weather-item">
                          <span className="label">Humidity:</span>
                          <span className="value">{weatherData.humidity}%</span>
                        </div>
                        <div className="weather-item">
                          <span className="label">Wind Speed:</span>
                          <span className="value">{weatherData.windSpeed} km/h</span>
                        </div>
                        {weatherData.precipitation !== undefined && (
                          <div className="weather-item">
                            <span className="label">Precipitation:</span>
                            <span className="value">{weatherData.precipitation} mm</span>
                          </div>
                        )}
                        {weatherData.uvIndex !== undefined && (
                          <div className="weather-item">
                            <span className="label">UV Index:</span>
                            <span className="value">{weatherData.uvIndex}</span>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Only show this message for past dates if no historical weather
                    return (
                      <div className="weather-error">
                        <p>Date has already passed, weather forecast unavailable.</p>
                      </div>
                    );
                  }
                }
                return null;
              })()}
              {!weatherData && !weatherLoading && !weatherError && (
                <div className="weather-placeholder">
                  <p>Weather forecast will be displayed here once available.</p>
                  <button 
                    onClick={fetchWeatherForecast} 
                    className="fetch-weather-button"
                    disabled={weatherLoading}
                  >
                    Get Weather Forecast
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="map-container" style={{ position: 'relative', marginTop: 24 }}>
          {/* Legend for multi-day trips */}
          {trip && trip.tripData && trip.tripData.days && trip.tripData.days.length > 1 && (
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              padding: '8px 16px',
              zIndex: 1000,
              fontSize: 14,
              border: '1px solid #ccc'
            }}>
              <strong>Route Colors:</strong>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {trip.tripData.days.map((day, idx) => (
                  <li key={day.day} style={{ display: 'flex', alignItems: 'center', marginTop: idx === 0 ? 4 : 2 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 18,
                      height: 6,
                      background: idx === 0 ? '#ff4444' : '#4444ff',
                      borderRadius: 3,
                      marginRight: 8
                    }}></span>
                    Day {day.day}
                  </li>
                ))}
              </ul>
            </div>
          )}
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