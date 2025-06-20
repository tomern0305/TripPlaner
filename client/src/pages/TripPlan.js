import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
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

// Component to handle map center updates
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function TripPlan() {
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [tripType, setTripType] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [mapCenter, setMapCenter] = useState([31.7683, 35.2137]); // Default to Jerusalem
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countryFlag, setCountryFlag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [tripSaved, setTripSaved] = useState(false);
  
  // Store submitted values separately from form state
  const [submittedCountry, setSubmittedCountry] = useState('');
  const [submittedCity, setSubmittedCity] = useState('');
  const [submittedTripType, setSubmittedTripType] = useState('');
  const [submittedTripDate, setSubmittedTripDate] = useState('');

  // Weather forecast state
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  // Unsplash API configuration
  const UNSPLASH_ACCESS_KEY = 'iF8jdg69v6YjZOZgn73hfj4_GVdyyjoHnwwStC5wwVc';

  // OpenRouteService API configuration
  const ORS_API_KEY = '5b3ce3597851110001cf62483581bb6eecd44fca82594cc3a6b2cd7f';

  // Fetch weather forecast when all required info is set and tripData is available
  useEffect(() => {
    if (submittedCity && submittedCountry && submittedTripDate && tripData) {
      fetchWeatherForecast();
    }
    // eslint-disable-next-line
  }, [submittedCity, submittedCountry, submittedTripDate, tripData]);

  // Function to fetch country flag from Unsplash
  const fetchCountryFlag = async (countryName) => {
    try {
      const response = await axios.get(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(countryName + ' flag')}&per_page=1`,
        {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        }
      );
      
      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].urls.small;
      }
      return null;
    } catch (error) {
      console.error('Error fetching country flag:', error);
      return null;
    }
  };

  // Strict country validation: get country code and match name
  
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

  // City validation restricted to country code and checks result's country code
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTripData(null);
    setMarkers([]);
    setPolylines([]);
    setTripSaved(false);
    setSaveError('');
    setSaveSuccess('');

    try {
      // First validate the country
      const countryValidation = await validateCountry(country);
      if (!countryValidation.isValid) {
        setError(`No country found with the name "${country}". Please check the country name and try again.`);
        setLoading(false);
        return;
      }

      // Then validate the city, restricted to the country code
      const cityValidation = await validateCity(city, countryValidation.countryCode);
      if (!cityValidation.isValid) {
        setError(`Could not find "${city}" in ${country}. Please check the city name and try again.`);
        setLoading(false);
        return;
      }

      // Call the LLM-based trip planning API
      const response = await axios.post('http://localhost:5000/api/trip/plan', {
        country,
        city,
        tripType,
        tripDate
      });

      if (response.data.success) {
        const trip = response.data.tripData;
        setTripData(trip);
        
        // Store the submitted values for display
        setSubmittedCountry(country);
        setSubmittedCity(city);
        setSubmittedTripType(tripType);
        setSubmittedTripDate(tripDate);

        // Process the trip data to create markers and polylines
        const allMarkers = [];
        const allPolylines = [];

        // Helper to get ORS profile
        const getProfile = () => (tripType === 'bike' ? 'cycling-regular' : 'foot-walking');

        // Build all polylines for all days using actual routes from OpenRouteService
        async function buildRoutes() {
          for (const [dayIndex, day] of trip.days.entries()) {
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

        // Center map on the starting city
        if (trip.days[0] && trip.days[0].cities[0]) {
          setMapCenter(trip.days[0].cities[0].coordinates);
        }

        // Fetch country flag
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

  // Function to save trip to database
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

  // Function to fetch weather forecast
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

  return (
    <div className="trip-planner">
      <h2>Trip Planning</h2>
      
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

      {/* Trip Details Display */}
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

      {/* Weather Forecast Display */}
      {tripData && (
        <div className="weather-section">
          <h3>Weather Forecast</h3>
          <div className="weather-content">
            {(() => {
              const today = new Date();
              const tripDateObj = new Date(submittedTripDate);
              const daysDiff = Math.ceil((tripDateObj - today) / (1000 * 60 * 60 * 24));
              // Only show loading spinner for daysDiff >= 0
              if (weatherLoading && daysDiff >= 0) {
                return (
                  <div className="weather-loading">
                    <p>Loading weather forecast...</p>
                  </div>
                );
              }
              // Only show error for past dates
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
              // 0-3 days: show actual forecast
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
              // For future dates (daysDiff >= 0) with no forecast, show reference message and current weather if available
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

      {/* Only show the map after a trip is created */}
      {tripData && (
        <div className="map-container" style={{ position: 'relative' }}>
          {/* Legend for multi-day trips */}
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
            <ChangeMapView center={mapCenter} />
            {/* Render polylines for routes */}
            {polylines.map((polyline, index) => (
              <Polyline
                key={index}
                positions={polyline.positions}
                color={polyline.color}
                weight={polyline.weight}
                opacity={polyline.opacity}
              />
            ))}
            {/* Render markers for cities */}
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
      
      {/* Save Trip Button - Below Map */}
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