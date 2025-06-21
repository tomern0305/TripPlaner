import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import polyline from 'polyline';

// --- Leaflet Icon Fix ---
// A common issue with React-Leaflet and Webpack is the misconfiguration of default marker icon paths.
// This block of code manually resets the icon URLs to a CDN source, ensuring markers display correctly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Map Utility Component ---
// This component is a workaround to programmatically change the map's center and zoom level.
// The `useMap` hook can only be used by children of `<MapContainer>`, so we create this small component
// to listen for changes to the `center` prop and call `map.setView` accordingly.
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}


// This function acts as a proxy to our backend's OpenRouteService endpoint.
// It fetches the geographical coordinates for a route between two points, which are then used to draw polylines on the map.
// Using a backend proxy keeps the ORS API key secure.
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

// --- TripView Component ---
// This component is responsible for fetching and displaying the details of a single, previously saved trip.
// It retrieves the trip ID from the URL parameters.
export default function TripView() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  // State for storing trip data, loading/error status, and map elements.
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([31.7683, 35.2137]); // Default center
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);

  // State for weather information.
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  // The main effect hook that triggers fetching the trip data when the component mounts or the tripId changes.
  useEffect(() => {
    fetchTrip();
    // eslint-disable-next-line
  }, [tripId]);

  // Fetches the weather forecast automatically once the trip data has been successfully loaded.
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
  if (loading) return <div className="loading">Loading trip...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!trip) return null;

  return (
    <div className="trip-view-page">
      <div className="trip-view-content">
        {/* Displays the primary trip details, such as destination, date, and type. */}
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
          {/* Renders the detailed itinerary for each day of the trip. */}
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
          {/* This section handles the complex logic of displaying the correct weather information
              based on whether the trip date is in the past, present, or future. */}
          <div className="weather-section">
            <h3>Weather Forecast</h3>
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
        </div>
        {/* Renders the Leaflet map with all markers and route polylines. */}
        <div className="map-container" style={{ position: 'relative', marginTop: 24 }}>
          {/* A legend is displayed for multi-day trips to clarify the route colors. */}
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
            {/* This component handles map view changes. */}
            <ChangeMapView center={mapCenter} />
            {/* Renders the route polylines on the map. */}
            {polylines.map((polyline, index) => (
              <Polyline
                key={index}
                positions={polyline.positions}
                color={polyline.color}
                weight={polyline.weight}
                opacity={polyline.opacity}
              />
            ))}
            {/* Renders the markers for start/end and intermediate points. */}
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
        {/* A button to navigate back to the previous page (likely the trip history). */}
        <div className="trip-view-back-btn-container">
          <button className="button" onClick={() => navigate(-1)}>
            &larr; Back
          </button>
        </div>
      </div>
    </div>
  );
} 