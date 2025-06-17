import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
  const [error, setError] = useState('');

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
        )}&featuretype=country&limit=1&addressdetails=1`
      );

      if (
        response.data &&
        response.data.length > 0 &&
        response.data[0].class === 'boundary' &&
        response.data[0].type === 'administrative' &&
        response.data[0].address &&
        response.data[0].address.country &&
        response.data[0].address.country_code
      ) {
        const location = response.data[0];
        // Normalize and compare country names
        const userCountry = normalize(countryName);
        const resultCountry = normalize(location.address.country);
        if (userCountry === resultCountry) {
          return {
            isValid: true,
            displayName: location.display_name,
            countryCode: location.address.country_code.toUpperCase(),
          };
        }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // First validate the country
    const countryValidation = await validateCountry(country);
    if (!countryValidation.isValid) {
      setError(`No country found with the name "${country}". Please check the country name and try again.`);
      return;
    }

    // Then validate the city, restricted to the country code
    const cityValidation = await validateCity(city, countryValidation.countryCode);
    if (!cityValidation.isValid) {
      setError(`Could not find "${city}" in ${country}. Please check the city name and try again.`);
      return;
    }

    const newMarker = {
      position: cityValidation.coordinates,
      title: `${city}, ${country} - ${tripType} Trip - ${tripDate}`
    };

    setMapCenter(cityValidation.coordinates);
    setMarkers([newMarker]);
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

        <button type="submit" className="button">
          Create Route
        </button>
      </form>

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
          {markers.map((marker, index) => (
            <Marker key={index} position={marker.position}>
              <Popup>
                {marker.title}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default TripPlan; 