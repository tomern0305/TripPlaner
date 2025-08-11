const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Trip = require('../models/Trip');
const jwt = require('jsonwebtoken');
const axios = require('axios');

/**
 * Trip Planning API Routes
 * Handles AI-powered trip generation, route validation, weather forecasting, and trip management.
 */

// Initialize external services
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const ORS_API_KEY = process.env.ORS_API_KEY;

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and extracts user information for protected routes.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
    }
    
    if (!user.userId || !user.email) {
      console.error('JWT token missing required fields:', user);
      return res.status(403).json({ 
        error: 'Invalid token structure',
        message: 'Please log out and log back in to get a new token'
      });
    }
    
    req.user = {
      userId: user.userId,
      email: user.email,
      id: user.id || user.userId
    };
    
    next();
  });
};

/**
 * Authentication Test Endpoint
 * GET /api/trip/test-auth
 * Verifies authentication middleware functionality.
 */
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Authentication successful',
    user: req.user
  });
});

/**
 * JWT Token Decoder (Debug Endpoint)
 * GET /api/trip/decode-token
 * Decodes and returns JWT token contents for debugging purposes.
 */
router.get('/decode-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({ 
      error: 'No token provided',
      message: 'Please provide a token in the Authorization header'
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const decoded = jwt.verify(token, jwtSecret);
    res.json({ 
      message: 'Token decoded successfully',
      decoded: decoded
    });
  } catch (err) {
    res.status(400).json({ 
      error: 'Token decode failed',
      message: err.message
    });
  }
});

/**
 * Generate Trip Plan
 * POST /api/trip/generate
 * Creates a comprehensive trip plan using AI-powered itinerary generation
 * with route validation and weather forecasting.
 * 
 * @param {string} country - Destination country
 * @param {string} city - Destination city
 * @param {string} tripType - Type of trip (bike/trek)
 * @param {string} tripDate - Planned trip date
 * 
 * @returns {Object} Complete trip plan with itinerary and weather data
 */
router.post('/generate', authenticateToken, async (req, res) => {
  const { country, city, tripType, tripDate } = req.body;
  
  if (!country || !city || !tripType || !tripDate) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'Please provide country, city, trip type, and trip date'
    });
  }

  try {
    // Generate AI-powered trip plan
    const tripPlan = await generateTripPlan(country, city, tripType, tripDate);
    
    // Validate routes and calculate distances
    const validatedPlan = await validateORSRoutesAndDistances(tripPlan, tripType);
    
    // Get weather forecast
    const weatherData = await getWeatherForecast(city, tripDate);
    
    // Get country flag
    const countryFlag = await getCountryFlag(country);
    
    res.json({
      success: true,
      tripPlan: validatedPlan,
      weather: weatherData,
      countryFlag: countryFlag
    });
  } catch (error) {
    console.error('Trip generation error:', error);
    res.status(500).json({ 
      error: 'Trip generation failed',
      message: error.message || 'Unable to generate trip plan'
    });
  }
});

/**
 * Save Trip
 * POST /api/trip/save
 * Saves a complete trip plan to the database with user association.
 * 
 * @param {string} tripName - User-defined trip name
 * @param {string} tripDescription - Trip description
 * @param {Object} tripData - Complete trip data
 * @param {string} countryFlag - Country flag URL
 * 
 * @returns {Object} Saved trip information
 */
router.post('/save', authenticateToken, async (req, res) => {
  const { 
    tripName, 
    tripDescription, 
    tripData, 
    country, 
    city, 
    tripType, 
    tripDate, 
    countryFlag 
  } = req.body;

  if (!tripName || !tripData || !country || !city || !tripType || !tripDate) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'Please provide all required trip information'
    });
  }

  try {
    const tripId = `${req.user.email}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const trip = new Trip({
      userId: req.user.userId,
      userEmail: req.user.email,
      tripId: tripId,
      tripName: tripName,
      tripDescription: tripDescription || '',
      country: country,
      city: city,
      tripType: tripType,
      tripDate: tripDate,
      tripData: tripData,
      countryFlag: countryFlag
    });

    await trip.save();
    
    res.status(201).json({
      success: true,
      message: 'Trip saved successfully',
      tripId: tripId
    });
  } catch (error) {
    console.error('Trip save error:', error);
    res.status(500).json({ 
      error: 'Failed to save trip',
      message: 'Unable to save trip to database'
    });
  }
});

/**
 * Get Trip History
 * GET /api/trip/history
 * Retrieves all trips for the authenticated user.
 * 
 * @returns {Array} User's trip history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const trips = await Trip.find({ userEmail: req.user.email })
      .select('tripId tripName tripDescription country city tripType tripDate countryFlag createdAt')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      trips: trips
    });
  } catch (error) {
    console.error('Trip history error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve trip history',
      message: 'Unable to load your trips'
    });
  }
});

/**
 * Get Specific Trip
 * GET /api/trip/:tripId
 * Retrieves detailed information for a specific trip.
 * 
 * @param {string} tripId - Unique trip identifier
 * @returns {Object} Complete trip information
 */
router.get('/:tripId', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findOne({ 
      tripId: req.params.tripId, 
      userEmail: req.user.email 
    });
    
    if (!trip) {
      return res.status(404).json({ 
        error: 'Trip not found',
        message: 'The requested trip does not exist or you do not have access to it'
      });
    }
    
    res.json({
      success: true,
      trip: trip
    });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve trip',
      message: 'Unable to load trip details'
    });
  }
});

/**
 * Get Weather Forecast
 * POST /api/trip/weather
 * Retrieves weather forecast for a specific location and date.
 * 
 * @param {string} city - City name
 * @param {string} date - Forecast date
 * @returns {Object} Weather forecast data
 */
router.post('/weather', authenticateToken, async (req, res) => {
  const { city, date } = req.body;
  
  if (!city || !date) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'Please provide city and date'
    });
  }

  try {
    const weatherData = await getWeatherForecast(city, date);
    res.json({
      success: true,
      weather: weatherData
    });
  } catch (error) {
    console.error('Weather forecast error:', error);
    res.status(500).json({ 
      error: 'Weather forecast failed',
      message: 'Unable to retrieve weather information'
    });
  }
});

/**
 * Get Country Flag
 * GET /api/trip/country-flag/:countryName
 * Retrieves country flag image URL from Unsplash.
 * 
 * @param {string} countryName - Country name
 * @returns {Object} Country flag URL
 */
router.get('/country-flag/:countryName', authenticateToken, async (req, res) => {
  try {
    const countryFlag = await getCountryFlag(req.params.countryName);
    res.json({
      success: true,
      countryFlag: countryFlag
    });
  } catch (error) {
    console.error('Country flag error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve country flag',
      message: 'Unable to load country flag'
    });
  }
});

/**
 * Generate AI-powered trip plan using GROQ
 * @param {string} country - Destination country
 * @param {string} city - Destination city
 * @param {string} tripType - Type of trip
 * @param {string} tripDate - Trip date
 * @returns {Object} Generated trip plan
 */
async function generateTripPlan(country, city, tripType, tripDate) {
  const prompt = `Create a detailed ${tripType} trip plan for ${city}, ${country} on ${tripDate}. 
  Include 3-5 days of activities with specific locations, coordinates, and estimated distances. 
  Format the response as a JSON object with a 'days' array containing day objects with 'day', 'cities', 'distances', 'totalDistance', and 'estimatedTime' fields. 
  Each city should have 'name' and 'coordinates' [latitude, longitude]. 
  Provide realistic distances and timing for ${tripType} activities.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "mixtral-8x7b-32768",
    temperature: 0.7,
    max_tokens: 4000,
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('Failed to generate trip plan');
  }

  try {
    return JSON.parse(response);
  } catch (parseError) {
    throw new Error('Invalid trip plan format generated');
  }
}

/**
 * Validate routes and calculate distances using OpenRouteService
 * @param {Object} tripData - Trip data with coordinates
 * @param {string} tripType - Type of trip
 * @returns {Object} Validated trip data with accurate distances
 */
async function validateORSRoutesAndDistances(tripData, tripType) {
  const profile = tripType === 'bike' ? 'cycling-regular' : 'foot-walking';
  
  for (let day of tripData.days) {
    if (day.cities.length < 2) continue;
    
    const coordinates = day.cities.map(city => city.coordinates);
    const body = {
      coordinates: coordinates,
      profile: profile,
      format: 'json'
    };

    try {
      const response = await axios.post(
        `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
        body,
        {
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.features && response.data.features.length > 0) {
        const route = response.data.features[0];
        const distance = (route.properties.segments[0].distance / 1000).toFixed(1);
        day.totalDistance = `${distance} km`;
        day.estimatedTime = `${Math.round(route.properties.segments[0].duration / 60)} min`;
      }
    } catch (error) {
      console.error('ORS API error:', error);
      // Fallback to estimated distances
      day.totalDistance = 'Distance calculation unavailable';
      day.estimatedTime = 'Time calculation unavailable';
    }
  }
  
  return tripData;
}

/**
 * Get weather forecast for a location and date
 * @param {string} city - City name
 * @param {string} date - Forecast date
 * @returns {Object} Weather forecast data
 */
async function getWeatherForecast(city, date) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('Weather API key not configured');
  }

  try {
    const response = await axios.get(
      `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=7&aqi=no`
    );

    const forecast = response.data.forecast.forecastday.find(
      day => day.date === date
    );

    if (!forecast) {
      return {
        condition: 'Weather data unavailable',
        temperature: 'N/A',
        humidity: 'N/A',
        windSpeed: 'N/A'
      };
    }

    return {
      condition: forecast.day.condition.text,
      temperature: `${forecast.day.avgtemp_c}°C`,
      humidity: `${forecast.day.avghumidity}%`,
      windSpeed: `${forecast.day.maxwind_kph} km/h`
    };
  } catch (error) {
    console.error('Weather API error:', error);
    throw new Error('Unable to retrieve weather forecast');
  }
}

/**
 * Get country flag image URL from Unsplash
 * @param {string} countryName - Name of the country
 * @returns {string} Flag image URL
 */
async function getCountryFlag(countryName) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new Error('Unsplash API key not configured');
  }

  try {
    const response = await axios.get(
      `https://api.unsplash.com/search/photos?query=${countryName}%20flag&per_page=1`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        }
      }
    );

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].urls.regular;
    }

    throw new Error('No flag image found');
  } catch (error) {
    console.error('Unsplash API error:', error);
    throw new Error('Unable to retrieve country flag');
  }
}

module.exports = router; 