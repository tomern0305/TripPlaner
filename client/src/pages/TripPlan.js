import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
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

function TripPlan() {
  // --- State Management ---
  // Form input state
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [tripType, setTripType] = useState('');
  const [tripDate, setTripDate] = useState('');

  // Map-related state
  const [mapCenter, setMapCenter] = useState([31.7683, 35.2137]); // Default to Jerusalem
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);
  
  // Trip data and status state
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countryFlag, setCountryFlag] = useState(null);

  // Saving trip state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [tripSaved, setTripSaved] = useState(false);
  
  // We store submitted form values separately to prevent the UI from updating
  // with new form inputs before a new trip is generated. This ensures the displayed
  // trip details and weather match the generated plan.
  const [submittedCountry, setSubmittedCountry] = useState('');
  const [submittedCity, setSubmittedCity] = useState('');
  const [submittedTripType, setSubmittedTripType] = useState('');
  const [submittedTripDate, setSubmittedTripDate] = useState('');

  // Weather forecast state
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  // --- API and Side Effects ---

  // Fetches the weather forecast automatically once a trip plan is successfully generated.
  useEffect(() => {
    if (submittedCity && submittedCountry && submittedTripDate && tripData) {
      fetchWeatherForecast();
    }
    // eslint-disable-next-line
  }, [submittedCity, submittedCountry, submittedTripDate, tripData]);

  // Fetches a country flag image from the Unsplash API for visual flair.
  const fetchCountryFlag = async (countryName) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/trip/country-flag/${encodeURIComponent(countryName)}`
      );
      
      if (response.data.success && response.data.flagUrl) {
        return response.data.flagUrl;
      }
      return null;
    } catch (error) {
      console.error('Error fetching country flag:', error);
      return null;
    }
  };

  // Validates the user-entered country name against the Nominatim geocoding service.
  // This helps ensure the country is real and retrieves its country code for more specific city searches.
  const validateCountry = async (countryName) => {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        countryName
      )}&limit=1&addressdetails=1`
    );

    console.log("COUNTRY RESPONSE:", response.data);

    if (
      response.data.length > 0
    ) {
      const location = response.data[0];
      const code = location.address?.country_code?.toUpperCase();
      const name = location.address?.country;

      if (code && name) {
        return {
          isValid: true,
          displayName: location.display_name,
          countryCode: code,
        };
      }

      // fallback אם אין address – עדיין מחזירים את התוצאה
      return {
        isValid: true,
        displayName: location.display_name,
        countryCode: 'IL', // ברירת מחדל זמנית, שימי כאן בדיקה לפי השם אם צריך
      };
    }

    return { isValid: false };
  } catch (error) {
    console.error('Error validating country:', error);
    return { isValid: false };
  }
};

  // Validates the user-entered city name, constrained by the previously validated country code.
  // This improves accuracy by preventing, for example, "Paris, Texas" from being found when "France" was entered.
  const validateCity = async (cityName, countryCode) => {
    if (!countryCode) return { isValid: false };
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cityName
        )}&countrycodes=${countryCode}&limit=1&addressdetails=1`
      );

      if (
        response.data &&
        response.data.length > 0 &&
        response.data[0].address &&
        response.data[0].address.country_code &&
        response.data[0].address.country_code.toUpperCase() === countryCode
      ) {
        const location = response.data[0];
        return {
          isValid: true,
          coordinates: [parseFloat(location.lat), parseFloat(location.lon)],
          displayName: location.display_name
        };
      }
      return { isValid: false };
    } catch (error) {
      console.error('Error validating city:', error);
      return { isValid: false };
    }
  };

  // --- Map and Routing Logic ---

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

  // --- Core Application Logic ---

  // Handles the main form submission for planning a trip.
  // This is the primary orchestrator function.
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Reset state for a new request
    setError('');
    setLoading(true);
    setTripData(null);
    setMarkers([]);
    setPolylines([]);
    setTripSaved(false);
    setSaveError('');
    setSaveSuccess('');

    try {
      // Step 1: Validate the country input.
      const countryValidation = await validateCountry(country);
      if (!countryValidation.isValid) {
        setError(`No country found with the name "${country}". Please check the country name and try again.`);
        setLoading(false);
        return;
      }

      // Step 2: Validate the city input, using the country code from the previous step.
      const cityValidation = await validateCity(city, countryValidation.countryCode);
      if (!cityValidation.isValid) {
        setError(`Could not find "${city}" in ${country}. Please check the city name and try again.`);
        setLoading(false);
        return;
      }

      // Step 3: Call the backend API to generate the trip plan using the LLM.
      const response = await axios.post('http://localhost:5000/api/trip/plan', {
        country,
        city,
        tripType,
        tripDate
      });

      if (response.data.success) {
        const trip = response.data.tripData;
        setTripData(trip);
        
        // Step 4: Store the submitted form values to decouple form state from the displayed results.
        setSubmittedCountry(country);
        setSubmittedCity(city);
        setSubmittedTripType(tripType);
        setSubmittedTripDate(tripDate);

        // Step 5: Process the trip data to create markers and polylines for the map.
        const allMarkers = [];
        const allPolylines = [];

        // Helper to determine the correct travel profile for the OpenRouteService API.
        const getProfile = () => (tripType === 'bike' ? 'cycling-regular' : 'foot-walking');

        // Identify the main start and end points of the entire trip.
        const mainStart = trip.days[0].cities[0];
        const mainEnd = trip.days[trip.days.length - 1].cities[trip.days[trip.days.length - 1].cities.length - 1];
        const isCircular = mainStart.coordinates[0] === mainEnd.coordinates[0] && mainStart.coordinates[1] === mainEnd.coordinates[1];

        // Add a primary marker for the start/end location.
        allMarkers.push({
          position: mainStart.coordinates,
          title: 'Start-End Location',
          isMain: true
        });

        // Add markers for intermediate stopping points (end of each day).
        trip.days.forEach((day, dayIndex) => {
          // Last city of the day
          const lastCity = day.cities[day.cities.length - 1];
          // Only add a marker if it's not the final destination of a circular trip.
          if (
            dayIndex !== trip.days.length - 1 || !isCircular
          ) {
            // Also, don't add a marker if it's identical to the main start/end point.
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

        // This async function iterates through each day and each segment of the trip,
        // fetching the actual route from ORS and constructing the polylines to be drawn on the map.
        async function buildRoutes() {
          for (const [dayIndex, day] of trip.days.entries()) {
            // Build the full route polyline for the day by combining all segments
            let fullRoute = [];
            for (let i = 0; i < day.cities.length - 1; i++) {
              const start = day.cities[i].coordinates;
              const end = day.cities[i + 1].coordinates;
              // Fetch the actual route from OpenRouteService for each segment
              const segment = await fetchORSRoute(start, end, getProfile());
              // This logic prevents adding duplicate coordinate points where segments connect.
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

        // Step 6: Execute the route building and update the component's state.
        await buildRoutes();
        setMarkers(allMarkers);
        setPolylines(allPolylines);

        // Center the map on the trip's starting location.
        if (trip.days[0] && trip.days[0].cities[0]) {
          setMapCenter(trip.days[0].cities[0].coordinates);
        }

        // Fetch a flag for the destination country.
        const flag = await fetchCountryFlag(country);
        setCountryFlag(flag);
      } else {
        setError('Failed to generate trip plan. Please try again.');
      }
    } catch (error) {
      console.error('Error planning trip:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to plan trip. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handles saving the generated trip to the user's history.
  const handleSaveTrip = async () => {
    if (!tripData) {
      setSaveError('No trip to save. Please create a trip first.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSaveError('You must be logged in to save trips.');
        setSaving(false);
        return;
      }

      const saveData = {
        country: submittedCountry,
        city: submittedCity,
        tripType: submittedTripType,
        tripDate: submittedTripDate,
        countryFlag,
        tripData
      };

      console.log('Saving trip data:', saveData);
      console.log('Token exists:', !!token);

      const response = await axios.post('http://localhost:5000/api/trip/save', saveData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Save response:', response.data);

      if (response.data.success) {
        setSaveSuccess('Trip saved successfully!');
        setTripSaved(true);
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        // Provide a more user-friendly error message for expired tokens.
        if (errorMessage.includes('Invalid token structure')) {
          setSaveError('Your session has expired. Please log out and log back in, then try saving again.');
        } else {
          setSaveError(errorMessage);
        }
      } else {
        setSaveError('Failed to save trip. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Fetches the weather forecast from the backend.
  const fetchWeatherForecast = async () => {
    if (!submittedCity || !submittedCountry || !submittedTripDate) {
      setWeatherError('Trip information is required to fetch weather forecast.');
      return;
    }

    setWeatherLoading(true);
    setWeatherError('');
    setWeatherData(null);

    try {
      const response = await axios.post('http://localhost:5000/api/trip/weather', {
        city: submittedCity,
        country: submittedCountry,
        tripDate: submittedTripDate
      });

      if (response.data.success) {
        setWeatherData(response.data.weather);
      } else {
        setWeatherError('Failed to fetch weather data.');
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      if (error.response?.data?.error) {
        setWeatherError(error.response.data.error);
      } else {
        setWeatherError('Failed to fetch weather forecast. Please try again.');
      }
    } finally {
      setWeatherLoading(false);
    }
  };


  // --- JSX Rendering ---

  return (
    <div className="trip-planner">
      <h2>Trip Planning</h2>
      
      {/* The main form for user input. */}
      <form className="trip-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="country">Country</label>
          <input
            type="text"
            id="country"
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Enter country..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="city">City</label>
          <input
            type="text"
            id="city"
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tripType">Trip Type</label>
          <select
            id="tripType"
            className="input"
            value={tripType}
            onChange={(e) => setTripType(e.target.value)}
            required
          >
            <option value="">Select trip type...</option>
            <option value="trek">Trek</option>
            <option value="bike">Bike</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tripDate">Trip Date</label>
          <input
            type="date"
            id="tripDate"
            className="input"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            required
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="button" disabled={loading}>
          {loading ? 'Creating Route...' : 'Create Route'}
        </button>
      </form>

      {/* Renders the detailed trip information once it has been generated. */}
      {tripData && (
        <div className="trip-details">
          <h3>Trip Details</h3>
          <div className="trip-summary">
            <div className="trip-header">
              {countryFlag && (
                <img 
                  src={countryFlag} 
                  alt={`${submittedCountry} flag`} 
                  className="country-flag"
                />
              )}
              <div className="trip-info">
                <p><strong>Starting City:</strong> {submittedCity}, {submittedCountry}</p>
                <p><strong>Trip Type:</strong> {submittedTripType}</p>
                <p><strong>Date:</strong> {submittedTripDate}</p>
              </div>
            </div>
          </div>
          
          {/* Maps over the days and cities to display the itinerary. */}
          {tripData.days.map((day, index) => (
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
      )}

      {/* This section handles the complex logic of displaying the correct weather information
          based on whether the trip date is in the past, present, or future. */}
      {tripData && (
        <div className="weather-section">
          <h3>Weather Forecast</h3>
          <div className="weather-content">
            {(() => {
              const today = new Date();
              const tripDateObj = new Date(submittedTripDate);
              const daysDiff = Math.ceil((tripDateObj - today) / (1000 * 60 * 60 * 24));
              // Show a loading spinner only if the date is in the future.
              if (weatherLoading && daysDiff >= 0) {
                return (
                  <div className="weather-loading">
                    <p>Loading weather forecast...</p>
                  </div>
                );
              }
              // Show an error only if the date is in the past and fetching failed.
              if (weatherError && daysDiff < 0) {
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
              // For dates within the forecast range (0-3 days), display the detailed forecast card.
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
                          <span className="temperature">{weatherData.temperature}°C</span>
                          <span className="description">{weatherData.description}</span>
                          {weatherData.maxTemp && weatherData.minTemp && (
                            <span className="temp-range">
                              H: {weatherData.maxTemp}°C L: {weatherData.minTemp}°C
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
              if (daysDiff >= 0) {
                return (
                  <div className="weather-message">
                    <p>Weather forecast for {submittedTripDate} is not available yet. Here is the current weather in {submittedCity} as reference.</p>
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
                            <span className="temperature">{weatherData.temperature}°C</span>
                            <span className="description">{weatherData.description}</span>
                            {weatherData.maxTemp && weatherData.minTemp && (
                              <span className="temp-range">
                                H: {weatherData.maxTemp}°C L: {weatherData.minTemp}°C
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

      {/* The map is only rendered after a trip plan has been successfully generated. */}
      {tripData && (
        <div className="map-container" style={{ position: 'relative' }}>
          {/* A legend is displayed for multi-day trips to clarify the route colors. */}
          {tripData.days && tripData.days.length > 1 && (
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
                {tripData.days.map((day, idx) => (
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
      )}
      
      {/* The save button is displayed below the map after a trip is generated. */}
      {tripData && (
        <div className="save-trip-section">
          <button 
            onClick={handleSaveTrip} 
            className="save-trip-button"
            disabled={saving || tripSaved}
          >
            {saving ? 'Saving Trip...' : tripSaved ? 'Trip Saved' : 'Save Trip'}
          </button>
          {saveError && <div className="error-message">{saveError}</div>}
          {saveSuccess && <div className="success-message">{saveSuccess}</div>}
        </div>
      )}
    </div>
  );
}

export default TripPlan; 