import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
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
  const [weather, setWeather] = useState(null);
  const WEATHER_API_KEY = 'YOUR_KEY_HERE';
  
  // Store submitted values separately from form state
  const [submittedCountry, setSubmittedCountry] = useState('');
  const [submittedCity, setSubmittedCity] = useState('');
  const [submittedTripType, setSubmittedTripType] = useState('');
  const [submittedTripDate, setSubmittedTripDate] = useState('');

  // Unsplash API configuration
  const UNSPLASH_ACCESS_KEY = 'iF8jdg69v6YjZOZgn73hfj4_GVdyyjoHnwwStC5wwVc';

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

  // Helper to normalize strings for comparison
  function normalize(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z]/g, '');
  }

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

  async function fetchORSRoute(start, end, profile = 'foot-walking') {
  const url = `http://localhost:5000/api/trip/ors-route`;
  try {
    const response = await axios.post(url, { start, end, profile });

    if (
      response.data &&
      response.data.routes &&
      response.data.routes[0] &&
      response.data.routes[0].geometry
    ) {
      const polyline = response.data.routes[0].geometry;
      const coords = decodePolyline(polyline); // assuming decodePolyline exists
      return coords;
    } else {
      console.error('ORS API returned unexpected structure:', response.data);
      return [start, end]; // fallback
    }
  } catch (error) {
    console.error('ORS route error:', error);
    return [start, end]; // fallback
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

      const getProfile = () => (tripType === 'bike' ? 'cycling-regular' : 'foot-walking');
      const mainStart = trip.days[0].cities[0];
      const mainEnd = trip.days[trip.days.length - 1].cities[trip.days[trip.days.length - 1].cities.length - 1];
      const isCircular = mainStart.coordinates[0] === mainEnd.coordinates[0] && mainStart.coordinates[1] === mainEnd.coordinates[1];

      allMarkers.push({
        position: mainStart.coordinates,
        title: 'Start-End Location',
        isMain: true
      });

      trip.days.forEach((day, dayIndex) => {
        const lastCity = day.cities[day.cities.length - 1];
        if (dayIndex !== trip.days.length - 1 || !isCircular) {
          if (lastCity.coordinates[0] !== mainStart.coordinates[0] || lastCity.coordinates[1] !== mainStart.coordinates[1]) {
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
          let fullRoute = [];
          for (let i = 0; i < day.cities.length - 1; i++) {
            const start = day.cities[i].coordinates;
            const end = day.cities[i + 1].coordinates;
            const segment = await fetchORSRoute(start, end, getProfile());
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

      // Step 6: Execute the route building and update the component's state.
      await buildRoutes();
      setMarkers(allMarkers);
      setPolylines(allPolylines);

      // Step 7: Center the map on the trip's starting location.
      if (trip.days[0] && trip.days[0].cities[0]) {
        setMapCenter(trip.days[0].cities[0].coordinates);
      }

      // Step 8: Fetch country flag (but do not save trip yet)
      const flag = await fetchCountryFlag(country);
      setCountryFlag(flag);

    } else {
      setError('Failed to generate trip plan. Please try again.');
    }
  } catch (error) {
    console.error('Error planning trip:', error);
    setError('Failed to plan trip. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
};

/*
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

        trip.days.forEach((day, dayIndex) => {
          const dayMarkers = day.cities.map((cityData, cityIndex) => {
            // Check if this is the start/end point (same coordinates as first city)
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

          // Create polyline for this day's route
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
  */

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

      <div className="map-container">
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