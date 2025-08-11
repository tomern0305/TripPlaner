import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import polyline from 'polyline';
import './Trip.css';

/**
 * Trip View Component
 * Displays detailed information about a saved trip with interactive map visualization, route details, and weather information.
 */

/**
 * Leaflet Icon Configuration
 * Fixes React-Leaflet icon path issues by setting icon URLs to CDN sources.
 */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Map View Controller Component
 * Utility component that programmatically controls map center and zoom level.
 * @param {Object} props - Component props
 * @param {Array} props.center - [latitude, longitude] coordinates for map center
 * @returns {null} This component doesn't render anything visible
 */
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

/**
 * Fetch ORS Route
 * Retrieves route data from OpenRouteService through backend proxy for route visualization.
 * @param {Array} start - Starting coordinates [latitude, longitude]
 * @param {Array} end - Ending coordinates [latitude, longitude]
 * @param {string} profile - Routing profile ('foot-walking', 'cycling-regular', etc.)
 * @returns {Array} Array of coordinate pairs for route visualization
 */
async function fetchORSRoute(start, end, profile = 'foot-walking') {
  const url = `http://localhost:5000/api/trip/ors-route`;
  try {
    const response = await axios.post(
      url,
      {
        start,
        end,
        profile
      },
    );
    console.log('ORS API response:', response.data);
    if (
      response.data &&
      response.data.routes &&
      response.data.routes[0] &&
      response.data.routes[0].geometry
    ) {
      // The ORS API returns an encoded polyline string, which we decode into a series of [lat, lng] coordinates.
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
    return [start, end]; // As a fallback, return a straight line between the points.
  }
}

/**
 * Main Trip View Component
 * Displays comprehensive information about a previously saved trip,
 * including interactive map visualization, route details, and weather data.
 * 
 * @returns {JSX.Element} The trip view interface
 */
export default function TripView() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  // --- State Management ---
  
  /**
   * Trip Data State
   * Manages the trip information and loading status
   */
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  /**
   * Map Visualization State
   * Controls map display, markers, and route polylines
   */
  const [mapCenter, setMapCenter] = useState([31.7683, 35.2137]); // Default center
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);

  /**
   * Weather Information State
   * Manages weather forecast data and loading states
   */
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  // --- Side Effects ---

  /**
   * Trip Data Fetching Effect
   * 
   * Loads trip data when the component mounts or when the tripId changes.
   * This ensures the component always displays the correct trip information.
   */
  useEffect(() => {
    fetchTrip();
    // eslint-disable-next-line
  }, [tripId]);

  /**
   * Weather Fetching Effect
   * 
   * Automatically fetches weather forecast when trip data is successfully loaded.
   * This ensures weather information is available for the displayed trip.
   */
  useEffect(() => {
    if (trip && trip.city && trip.country && trip.tripDate) {
      fetchWeatherForecast();
    }
    // eslint-disable-next-line
  }, [trip]);

  // --- Data Fetching and Processing ---

  // Fetches the complete trip data from the backend using the tripId.
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
        
        // --- Map Data Preparation ---
        // Once the trip data is fetched, we process it to generate the necessary markers and polylines for the map.
        // This logic is very similar to the one in TripPlan.js.
        const tripData = response.data.trip.tripData;
        const allMarkers = [];
        const allPolylines = [];
        
        // Helper to determine the travel profile for the routing API.
        const getProfile = () => (response.data.trip.tripType === 'bike' ? 'cycling-regular' : 'foot-walking');
        
        // Identify the main start and end points of the entire trip to handle circular routes.
        const mainStart = tripData.days[0].cities[0];
        const mainEnd = tripData.days[tripData.days.length - 1].cities[tripData.days[tripData.days.length - 1].cities.length - 1];
        const isCircular = mainStart.coordinates[0] === mainEnd.coordinates[0] && mainStart.coordinates[1] === mainEnd.coordinates[1];
        
        // Add a primary marker for the start/end location.
        allMarkers.push({
          position: mainStart.coordinates,
          title: 'Start-End Location',
          isMain: true
        });

        // Add markers for intermediate stopping points (end of each day).
        tripData.days.forEach((day, dayIndex) => {
          // Last city of the day
          const lastCity = day.cities[day.cities.length - 1];
          // Avoid adding redundant markers for the final destination on circular trips.
          if (
            dayIndex !== tripData.days.length - 1 || !isCircular
          ) {
            // Don't add if it's the same as main start/end
            if (
              lastCity.coordinates[0] !== mainStart.coordinates[0] ||
              lastCity.coordinates[1] !== mainStart.coordinates[1]
            ) {
              allMarkers.push({
                position: lastCity.coordinates,
                title: `Stopping point - end of day ${day.day}`,
                isMain: false
              });
            }
          }
        });

        // Asynchronously build the route polylines for each day by fetching data from OpenRouteService.
        async function buildRoutes() {
          for (const [dayIndex, day] of tripData.days.entries()) {
            // Build the full route polyline for the day by combining all segments
            let fullRoute = [];
            for (let i = 0; i < day.cities.length - 1; i++) {
              const start = day.cities[i].coordinates;
              const end = day.cities[i + 1].coordinates;
              // Fetch the actual route from OpenRouteService for each segment
              const segment = await fetchORSRoute(start, end, getProfile());
              // Prevent duplicate coordinate points where segments connect.
              if (fullRoute.length > 0 && segment.length > 0 && fullRoute[fullRoute.length - 1][0] === segment[0][0] && fullRoute[fullRoute.length - 1][1] === segment[0][1]) {
                fullRoute = fullRoute.concat(segment.slice(1));
              } else {
                fullRoute = fullRoute.concat(segment);
              }
            }
            if (fullRoute.length > 1) {
              allPolylines.push({
                positions: fullRoute,
                color: dayIndex === 0 ? '#ff4444' : '#4444ff', // Different colors for different days
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

        // Center the map on the starting location of the trip.
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

  // Fetches the weather forecast from the backend for the trip's location and date.
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

  // --- Conditional Rendering ---
  // Display loading or error messages before rendering the main content.
  if (loading) return (
    <div className="trip-view-container">
      <div className="loading">Loading trip...</div>
    </div>
  );
  if (error) return (
    <div className="trip-view-container">
      <div className="error-message">{error}</div>
    </div>
  );
  if (!trip) return null;

  return (
    <div className="trip-view-container">
      <div className="trip-view-content">
        {/* Page Header */}
        <div className="trip-view-header">
          <h1 className="trip-view-title">{trip.tripName || `${trip.city}, ${trip.country}`}</h1>
          {trip.tripDescription && (
            <p className="trip-view-description">{trip.tripDescription}</p>
          )}
          {trip.countryFlag && (
            <div className="trip-view-flag-container">
              <img 
                src={trip.countryFlag} 
                alt={`${trip.country} flag`} 
                className="trip-view-flag"
              />
            </div>
          )}
          <div className="trip-view-info">
            <div className="trip-view-info-item">
              <span className="trip-view-info-icon">📍</span>
              <span className="trip-view-info-label">Location</span>
              <span className="trip-view-info-value">{trip.city}, {trip.country}</span>
            </div>
            <div className="trip-view-info-item">
              <span className="trip-view-info-icon">🚶</span>
              <span className="trip-view-info-label">Type</span>
              <span className="trip-view-info-value">{trip.tripType}</span>
            </div>
            <div className="trip-view-info-item">
              <span className="trip-view-info-icon">📅</span>
              <span className="trip-view-info-label">Date</span>
              <span className="trip-view-info-value">{trip.tripDate}</span>
            </div>
            <div className="trip-view-info-item">
              <span className="trip-view-info-icon">📝</span>
              <span className="trip-view-info-label">Created</span>
              <span className="trip-view-info-value">{new Date(trip.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="trip-view-actions">
            <button className="trip-view-btn trip-view-btn-secondary" onClick={() => navigate(-1)}>
              ← Back to History
            </button>
          </div>
        </div>

        {/* Itinerary Section */}
        {trip.tripData && (
          <div className="itinerary-section">
            {trip.tripData.days.map((day, index) => (
              <div key={index} className="day-route-card">
                <h3 className="day-title">Day {day.day}</h3>
                <div className="route-summary">
                  <div className="route-stat">
                    <span className="stat-label">Total Distance:</span>
                    <span className="stat-value">{day.totalDistance}</span>
                  </div>
                  <div className="route-stat">
                    <span className="stat-label">Estimated Time:</span>
                    <span className="stat-value">{day.estimatedTime}</span>
                  </div>
                </div>
                <div className="cities-list">
                  <h4 className="route-title">Route:</h4>
                  <ul className="cities-route">
                    {day.cities.map((cityData, cityIndex) => (
                      <li key={cityIndex} className="city-item">
                        <span className="city-name">{cityData.name}</span>
                        <span className="city-coords">({cityData.coordinates[0].toFixed(4)}, {cityData.coordinates[1].toFixed(4)})</span>
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
        )}

        {/* Weather Section */}
        {trip.tripData && (
          <div className="weather-section">
            <h2 className="section-title">Weather Forecast</h2>
            <div className="weather-content">
              {(() => {
                if (!trip || !trip.tripDate) return null;
                const today = new Date();
                const tripDateObj = new Date(trip.tripDate);
                const daysDiff = Math.ceil((tripDateObj - today) / (1000 * 60 * 60 * 24));
                // Show a loading spinner only if the date is in the future.
                if (weatherLoading && daysDiff >= 0) {
                  return (
                    <div className="weather-loading">
                      <p>Loading weather forecast...</p>
                    </div>
                  );
                }
                // Show an error and a retry button if fetching fails for a near-future date.
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
                // For dates within the forecast range, display the detailed forecast card.
                if (weatherData && !weatherData.message && daysDiff >= 0 && daysDiff <= 3) {
                  return (
                    <div className="weather-card">
                      <div className="weather-header">
                        <h4>{weatherData.city}, {weatherData.country}</h4>
                        <p className="weather-date">{weatherData.date}</p>
                      </div>
                      <div className="weather-details">
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
                        <div className="weather-info">
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
                      </div>
                    </div>
                  );
                }
                // For dates further in the future, display a message and the current weather as a reference.
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
                // For dates in the past, attempt to show historical weather if available,
                // otherwise show an "unavailable" message.
                if (daysDiff < 0) {
                  if (weatherData && !weatherData.message) {
                    // If API provides historical weather
                    return (
                      <div className="weather-card">
                        <div className="weather-header">
                          <h4>{weatherData.city}, {weatherData.country}</h4>
                          <p className="weather-date">{weatherData.date}</p>
                        </div>
                        <div className="weather-details">
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
                          <div className="weather-info">
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
                        </div>
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
              {/* A placeholder is shown before any weather data is loaded or requested. */}
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
        )}

        {/* Map Section */}
        {trip.tripData && (
          <div className="map-section">
            <h2 className="section-title">Trip Route Map</h2>
            <div className="map-container">
              {/* A legend is displayed to clarify the route colors. */}
              {trip.tripData.days && trip.tripData.days.length > 0 && (
                <div className="map-legend">
                  <strong>Route Colors:</strong>
                  <ul className="legend-items">
                    {trip.tripData.days.map((day, idx) => (
                      <li key={day.day} className="legend-item">
                        <span 
                          className="legend-color"
                          style={{ background: idx === 0 ? '#ff4444' : '#4444ff' }}
                        ></span>
                        Day {day.day}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {/* This component handles map view changes. */}
                <ChangeMapView center={mapCenter} />
                {/* Render polylines for the trip routes. */}
                {polylines.map((polyline, index) => (
                  <Polyline
                    key={index}
                    positions={polyline.positions}
                    color={polyline.color}
                    weight={polyline.weight}
                    opacity={polyline.opacity}
                  />
                ))}
                {/* Render markers for the start/end and stopping points. */}
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
          </div>
        )}


      </div>
    </div>
  );
} 