const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Trip = require('../models/Trip');
const jwt = require('jsonwebtoken');
const axios = require('axios');

/**
 * Trip Planning API Routes
 * 
 * This module provides comprehensive trip planning functionality including:
 * - Trip plan generation using AI/LLM services
 * - Route validation using OpenRouteService
 * - Trip persistence and retrieval
 * - Weather forecasting integration
 * - User authentication and authorization
 */

// Initialize Groq SDK for AI-powered trip planning
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// OpenRouteService API key for route validation and distance calculations
const ORS_API_KEY = process.env.ORS_API_KEY;

/**
 * JWT Authentication Middleware
 * 
 * Verifies JWT tokens and extracts user information for protected routes.
 * This middleware ensures that only authenticated users can access trip-related endpoints.
 * 
 * Security Features:
 * - Token format validation
 * - JWT signature verification
 * - User information extraction and validation
 * - Comprehensive error handling
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

  // Use environment variable for JWT secret with fallback for development
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
    }
    
    // Validate that the token contains required user information
    // This prevents issues with malformed or outdated tokens
    if (!user.userId || !user.email) {
      console.error('JWT token missing required fields:', user);
      return res.status(403).json({ 
        error: 'Invalid token structure',
        message: 'Please log out and log back in to get a new token',
        tokenStructure: user,
        missingFields: {
          userId: !user.userId,
          email: !user.email
        }
      });
    }
    
    // Attach user information to request object for use in route handlers
    req.user = {
      userId: user.userId,
      email: user.email,
      id: user.id || user.userId
    };
    
    console.log('Authenticated user:', req.user);
    next();
  });
};

/**
 * Authentication Test Endpoint
 * 
 * GET /api/trip/test-auth
 * 
 * Simple endpoint to verify that the authentication middleware is working correctly.
 * Useful for debugging authentication issues during development.
 * 
 * Headers:
 * - Authorization: Bearer <JWT_TOKEN> (required)
 * 
 * Response:
 * - 200: Authentication successful with user information
 * - 401/403: Authentication failed
 */
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: req.user
  });
});

/**
 * JWT Token Decoder Endpoint
 * 
 * GET /api/trip/decode-token
 * 
 * Debugging endpoint that decodes and displays the contents of a provided JWT token.
 * This is useful for troubleshooting token-related issues during development.
 * 
 * Headers:
 * - Authorization: Bearer <JWT_TOKEN> (required)
 * 
 * Response:
 * - 200: Token decoded successfully with payload information
 * - 400: Invalid token format
 * - 401: No token provided
 */
router.get('/decode-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'No token provided',
      message: 'Please provide a JWT token in the Authorization header'
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const decoded = jwt.verify(token, jwtSecret);
    res.json({
      success: true,
      decoded,
      hasUserId: !!decoded.userId,
      hasEmail: !!decoded.email,
      hasId: !!decoded.id
    });
  } catch (error) {
    res.status(400).json({ 
      error: 'Invalid token', 
      details: error.message,
      message: 'The provided token could not be decoded'
    });
  }
});

/**
 * Save Trip Endpoint
 * 
 * POST /api/trip/save
 * 
 * Saves a generated trip plan to the database for the authenticated user.
 * This endpoint creates a persistent record of the trip that can be retrieved later.
 * 
 * Headers:
 * - Authorization: Bearer <JWT_TOKEN> (required)
 * 
 * Request Body:
 * - country: Country where the trip takes place (required)
 * - city: City where the trip starts/ends (required)
 * - tripType: Type of trip ('bike' or 'trek') (required)
 * - tripDate: Planned date for the trip (required)
 * - countryFlag: URL of country flag image (optional)
 * - tripData: Complete trip itinerary data (required)
 * 
 * Response:
 * - 200: Trip saved successfully with trip ID
 * - 400: Missing required fields or validation error
 * - 401/403: Authentication error
 * - 500: Server error during save operation
 */
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { country, city, tripType, tripDate, countryFlag, tripData } = req.body;
    const { email, userId } = req.user;

    console.log('Save trip request:', { country, city, tripType, tripDate, hasCountryFlag: !!countryFlag, hasTripData: !!tripData });
    console.log('User info:', { email, userId });

    // Fallback logic to handle cases where user details might be missing from the request object
    // This can happen due to inconsistencies in how the token payload is handled
    if (!userId || !email) {
      console.log('Missing userId or email, attempting to extract from token...');
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        try {
          const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
          const decoded = jwt.verify(token, jwtSecret);
          console.log('Decoded token:', decoded);
          
          // Use whatever fields are available
          const fallbackUserId = userId || decoded.userId || decoded.id;
          const fallbackEmail = email || decoded.email;
          
          if (fallbackUserId && fallbackEmail) {
            console.log('Using fallback values:', { fallbackUserId, fallbackEmail });
            req.user.userId = fallbackUserId;
            req.user.email = fallbackEmail;
          } else {
            return res.status(400).json({ 
              error: 'Unable to determine user information from token',
              message: 'Authentication token is missing required user information'
            });
          }
        } catch (tokenError) {
          console.error('Error decoding token:', tokenError);
          return res.status(400).json({ 
            error: 'Invalid token structure',
            message: 'The authentication token could not be processed'
          });
        }
      }
    }

    // Validate that all required fields are provided
    if (!country || !city || !tripType || !tripDate || !tripData) {
      console.log('Missing required fields:', { country, city, tripType, tripDate, hasTripData: !!tripData });
      return res.status(400).json({ 
        error: 'All required fields must be provided',
        message: 'Please provide country, city, trip type, trip date, and trip data'
      });
    }

    // Generate a unique identifier for the trip
    // Format: {userEmail}_{timestamp}_{randomString} for guaranteed uniqueness
    const tripId = `${req.user.email}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new trip document with all provided data
    const newTrip = new Trip({
      userId: req.user.userId,
      userEmail: req.user.email,
      tripId,
      country,
      city,
      tripType,
      tripDate,
      countryFlag,
      tripData
    });

    console.log('Saving trip with ID:', tripId);
    await newTrip.save();
    console.log('Trip saved successfully');

    res.json({
      success: true,
      message: 'Trip saved successfully',
      tripId
    });

  } catch (error) {
    console.error('Error saving trip:', error);
    console.error('Error details:', error.message);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
    res.status(500).json({ 
      error: 'Failed to save trip',
      message: 'Unable to save trip to database. Please try again.',
      details: error.message 
    });
  }
});

/**
 * Get Trip History Endpoint
 * 
 * GET /api/trip/history
 * 
 * Retrieves all trips for the authenticated user, sorted by creation date.
 * This endpoint provides a summary of all user's trips for display in trip history.
 * 
 * Headers:
 * - Authorization: Bearer <JWT_TOKEN> (required)
 * 
 * Response:
 * - 200: Trip history retrieved successfully
 * - 401/403: Authentication error
 * - 500: Server error during retrieval
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;

    // Fetch trips for the authenticated user, sorted by creation date (most recent first)
    // Only select necessary fields for trip history display
    const trips = await Trip.find({ userEmail: email })
      .sort({ createdAt: -1 }) // Most recent first
      .select('tripId country city tripType tripDate countryFlag createdAt');

    res.json({
      success: true,
      trips
    });

  } catch (error) {
    console.error('Error fetching trip history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trip history',
      message: 'Unable to retrieve trip history. Please try again.'
    });
  }
});

/**
 * Get Specific Trip Endpoint
 * 
 * GET /api/trip/trip/:tripId
 * 
 * Retrieves the complete details of a specific trip by its unique identifier.
 * This endpoint ensures users can only access their own trips for security.
 * 
 * Headers:
 * - Authorization: Bearer <JWT_TOKEN> (required)
 * 
 * Parameters:
 * - tripId: Unique identifier of the trip to retrieve (required)
 * 
 * Response:
 * - 200: Trip details retrieved successfully
 * - 401/403: Authentication error
 * - 404: Trip not found or access denied
 * - 500: Server error during retrieval
 */
router.get('/trip/:tripId', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { email } = req.user;

    // Find trip by ID and ensure it belongs to the authenticated user
    const trip = await Trip.findOne({ tripId, userEmail: email });

    if (!trip) {
      return res.status(404).json({ 
        error: 'Trip not found',
        message: 'The requested trip could not be found or you do not have access to it'
      });
    }

    res.json({
      success: true,
      trip
    });

  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trip',
      message: 'Unable to retrieve trip details. Please try again.'
    });
  }
});

/**
 * Route Validation Helper Function
 * 
 * Validates a trip plan by checking route feasibility and distance constraints
 * using the OpenRouteService (ORS) API. This ensures that generated trips are
 * actually routable and meet realistic distance requirements.
 * 
 * @param {Object} tripData - The trip plan data containing daily itineraries
 * @param {string} tripType - Type of trip ('bike' or 'trek')
 * @returns {Object} Validation result with route data and feasibility status
 * 
 * Validation Process:
 * 1. Determines appropriate routing profile based on trip type
 * 2. Validates each route segment between consecutive waypoints
 * 3. Calculates total daily distances and durations
 * 4. Ensures distances fall within realistic limits for the trip type
 * 5. Returns detailed route information for accurate trip planning
 */
async function validateORSRoutesAndDistances(tripData, tripType) {
  // Select appropriate routing profile based on trip type
  const profile = tripType === 'bike' ? 'cycling-regular' : 'foot-walking';
  
  // Define realistic distance limits for each trip type (in meters)
  const dayDistanceLimits = tripType === 'bike' 
    ? { min: 10000, max: 60000 }  // 10-60km for biking
    : { min: 5000, max: 15000 };  // 5-15km for trekking
  
  let allORSData = [];
  
  // Validate each day's route
  for (const day of tripData.days) {
    let dayDistance = 0;
    let dayDuration = 0;
    let orsSegments = [];
    
    // Check each route segment between consecutive waypoints
    for (let i = 0; i < day.cities.length - 1; i++) {
      const start = day.cities[i].coordinates;
      const end = day.cities[i + 1].coordinates;
      const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
      
      try {
        // Request route from OpenRouteService
        const response = await axios.post(
          url,
          {
            coordinates: [
              [start[1], start[0]], // ORS expects [longitude, latitude]
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
        
        // Validate response structure
        if (!response.data || !response.data.routes || !response.data.routes[0] || !response.data.routes[0].geometry) {
          return { valid: false };
        }
        
        const summary = response.data.routes[0].summary;
        
        // Only add valid distance and duration data
        if (typeof summary.distance === 'number' && typeof summary.duration === 'number') {
          dayDistance += summary.distance;
          dayDuration += summary.duration;
          orsSegments.push({
            distance: summary.distance,
            duration: summary.duration
          });
        } else {
          orsSegments.push({ distance: null, duration: null });
        }
      } catch (err) {
        // If any segment fails, the entire route is invalid
        return { valid: false };
      }
    }
    
    // Verify that the total daily distance is within acceptable limits
    if (dayDistance < dayDistanceLimits.min || dayDistance > dayDistanceLimits.max) {
      return { valid: false };
    }
    
    allORSData.push({ dayDistance, dayDuration, orsSegments });
  }
  
  return { valid: true, allORSData };
}

/**
 * Generate Trip Plan Endpoint
 * 
 * POST /api/trip/plan
 * 
 * Creates a detailed trip itinerary using AI-powered route planning.
 * This endpoint combines LLM-generated trip suggestions with real-world
 * route validation to ensure feasible and enjoyable trip plans.
 * 
 * Request Body:
 * - country: Country where the trip takes place (required)
 * - city: City where the trip starts/ends (required)
 * - tripType: Type of trip ('bike' or 'trek') (required)
 * - tripDate: Planned date for the trip (required)
 * 
 * Response:
 * - 200: Trip plan generated successfully with validated route data
 * - 400: Missing required fields or invalid trip type
 * - 500: Failed to generate valid trip plan after multiple attempts
 * 
 * Process:
 * 1. Validates input parameters
 * 2. Constructs detailed prompt for LLM based on trip type
 * 3. Generates trip plan using AI service
 * 4. Validates routes using OpenRouteService
 * 5. Retries up to 5 times if validation fails
 * 6. Returns validated trip data with accurate distances and times
 */
router.post('/plan', async (req, res) => {
  try {
    const { country, city, tripType, tripDate } = req.body;

    // Validate required input parameters
    if (!country || !city || !tripType || !tripDate) {
      return res.status(400).json({ 
        error: 'All fields are required',
        message: 'Please provide country, city, trip type, and trip date'
      });
    }

    // Validate trip type
    if (!['bike', 'trek'].includes(tripType)) {
      return res.status(400).json({ 
        error: 'Invalid trip type',
        message: 'Trip type must be either "bike" or "trek"'
      });
    }

    /**
     * Construct AI prompt based on trip type
     * 
     * The prompt is carefully designed to ensure the LLM generates:
     * - Realistic routes with appropriate distances
     * - Valid geographical coordinates
     * - Structured JSON response format
     * - Land-based waypoints only (no water routes)
     */
    let prompt;
    if (tripType === 'bike') {
      prompt = `Plan a 2-day bike trip starting and ending in ${city}, ${country}.
Requirements:
- Day 1: 10-60km route, must pass through 3-8 different points (cities, towns, streets, landmarks, or notable locations)
- Day 2: 10-60km route back to starting point, also passing through 3-8 different points
- ***CRITICAL: UNDER NO CIRCUMSTANCES CAN ANY POINT BE IN WATER (SEA, LAKE, RIVER, ETC.). ALL POINTS MUST BE ON LAND. THIS IS A HARD REQUIREMENT.***
- DISTANCE LIMITS: EACH DAY CAN BE UP TO 60KM INDEPENDENTLY
- Day 1: 10-60km (up to 60km)
- Day 2: 10-60km (up to 60km)
- Total possible: Up to 120km over 2 days (60km + 60km)
- The trip must start and end in ${city} (same coordinates)
- Include estimated trip time for each day
- Include distance from each point to the next point
- You can include streets, intersections, parks, viewpoints, or any interesting points along the way

Return the response as a JSON object with this exact structure:
{
  "days": [
    {
      "day": 1,
      "cities": [
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]}
      ],
      "distances": ["0 km", "X km", "X km", "X km"],
      "totalDistance": "XX km",
      "estimatedTime": "X hours"
    },
    {
      "day": 2,
      "cities": [
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]}
      ],
      "distances": ["0 km", "X km", "X km", "X km"],
      "totalDistance": "XX km",
      "estimatedTime": "X hours"
    }
  ]
}
CRITICAL: EACH DAY IS INDEPENDENT! Day 1 can be 10-60km AND Day 2 can be 10-60km. This means you can have Day 1 = 50km and Day 2 = 55km (total 105km). Each day can reach the full 60km limit independently. Create a realistic bike route that passes through multiple interesting points each day. The trip must end back in ${city} with the same coordinates as the starting point. Include realistic distances between each consecutive point.`;
    } else if (tripType === 'trek') {
      prompt = `Plan a 1-day trek trip starting and ending in ${city}, ${country}.
Requirements:
- 5-15km circular route
- The route must pass through 3-8 different points (landmarks, viewpoints, parks, streets, or interesting locations)
- ***CRITICAL: UNDER NO CIRCUMSTANCES CAN ANY POINT BE IN WATER (SEA, LAKE, RIVER, ETC.). ALL POINTS MUST BE ON LAND. THIS IS A HARD REQUIREMENT.***
- STRICT DISTANCE LIMIT: Total route must be between 5-15km
- The trip must start and end in ${city} (same coordinates)
- Include estimated trip time
- Include distance from each point to the next point
- You can include hiking trails, viewpoints, parks, streets, or any interesting points along the way

Return the response as a JSON object with this exact structure:
{
  "days": [
    {
      "day": 1,
      "cities": [
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]},
        {"name": "City Name", "coordinates": [lat, lng]}
      ],
      "distances": ["0 km", "X km", "X km", "X km"],
      "totalDistance": "XX km",
      "estimatedTime": "X hours"
    }
  ]
}
IMPORTANT: Respect the distance limit - Total route must be 5-15km. Create a realistic trek route that passes through multiple interesting points. The trip must end back in ${city} with the same coordinates as the starting point. Include realistic distances between each consecutive point.`;
    }

    let tripData;
    let lastRawResponse = null;
    let maxRetries = 5;
    let foundValid = false;
    let orsData = null;

    /**
     * Trip Generation and Validation Loop
     * 
     * The system attempts to generate a valid trip plan up to maxRetries times.
     * This resilience mechanism handles cases where the LLM produces invalid
     * or unroutable plans, ensuring users receive feasible trip suggestions.
     */
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Generate trip plan using Groq LLM
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
      const response = completion.choices[0]?.message?.content;
      lastRawResponse = response;
      
      // Parse JSON response from LLM
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          tripData = JSON.parse(jsonMatch[0]);
        } else {
          tripData = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        continue; // Try again with next attempt
      }
      
      // Validate the generated trip plan using OpenRouteService
      const validation = await validateORSRoutesAndDistances(tripData, tripType);
      if (validation.valid) {
        foundValid = true;
        orsData = validation.allORSData;
        break;
      }
    }

    // If no valid plan could be generated after all retries
    if (!foundValid) {
      return res.status(500).json({ 
        error: 'Failed to generate valid trip plan',
        message: 'Unable to create a feasible trip plan after multiple attempts. Please try again.',
        rawResponse: lastRawResponse 
      });
    }

    /**
     * Enhance Trip Data with Validated Information
     * 
     * Replace LLM estimates with accurate data from OpenRouteService:
     * - Convert distances from meters to kilometers
     * - Convert durations from seconds to hours/minutes
     * - Ensure all numerical data is properly formatted
     */
    tripData.days.forEach((day, idx) => {
      day.totalDistance = (typeof orsData[idx].dayDistance === 'number' 
        ? (orsData[idx].dayDistance / 1000).toFixed(2) + ' km' 
        : 'N/A');
      day.estimatedTime = (typeof orsData[idx].dayDuration === 'number' 
        ? (orsData[idx].dayDuration / 3600).toFixed(2) + ' hours' 
        : 'N/A');
      day.distances = orsData[idx].orsSegments.map(seg => 
        (typeof seg.distance === 'number' 
          ? (seg.distance / 1000).toFixed(2) + ' km' 
          : 'N/A'));
      day.durations = orsData[idx].orsSegments.map(seg => 
        (typeof seg.duration === 'number' 
          ? (seg.duration / 60).toFixed(1) + ' min' 
          : 'N/A'));
    });
    
    res.json({
      success: true,
      tripData,
      originalRequest: { country, city, tripType, tripDate }
    });

  } catch (error) {
    console.error('Error planning trip:', error);
    res.status(500).json({ 
      error: 'Failed to plan trip',
      message: 'An error occurred while generating your trip plan. Please try again.'
    });
  }
});

/**
 * Weather Forecast Endpoint
 * 
 * POST /api/trip/weather
 * 
 * Retrieves weather forecast information for a specific location and date.
 * This endpoint provides weather data to help users plan their trips effectively.
 * 
 * Request Body:
 * - city: City name for weather lookup (required)
 * - country: Country name for weather lookup (required)
 * - tripDate: Date for weather forecast (required)
 * 
 * Response:
 * - 200: Weather data retrieved successfully
 * - 400: Missing required fields or location not found
 * - 500: Weather API error or server error
 * 
 * Features:
 * - Provides detailed 3-day forecast for near-future trips
 * - Falls back to current weather for distant future trips
 * - Handles API limitations gracefully
 */
router.post('/weather', async (req, res) => {
  try {
    const { city, country, tripDate } = req.body;

    // Validate required input parameters
    if (!city || !country || !tripDate) {
      return res.status(400).json({ 
        error: 'City, country, and trip date are required',
        message: 'Please provide all required weather lookup parameters'
      });
    }

    // WeatherAPI.com configuration
    const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
    const baseUrl = 'https://api.weatherapi.com/v1';

    // Calculate days difference between trip date and today
    // This determines whether to fetch forecast or current weather
    const tripDateObj = new Date(tripDate);
    const today = new Date();
    const diffTime = tripDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // For trips within the next 3 days, fetch detailed forecast
    if (diffDays >= 0 && diffDays <= 3) {
      const weatherUrl = `${baseUrl}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)},${encodeURIComponent(country)}&days=3&aqi=no`;
      
      const weatherResponse = await axios.get(weatherUrl);
      
      if (weatherResponse.data.error) {
        return res.status(400).json({ 
          error: weatherResponse.data.error.message,
          message: 'Unable to find weather data for the specified location'
        });
      }

      // Find the specific day's forecast from the response
      const tripDateStr = tripDateObj.toISOString().split('T')[0];
      const dayForecast = weatherResponse.data.forecast.forecastday.find(day => 
        day.date === tripDateStr
      );

      if (dayForecast) {
        // Compile comprehensive weather data for the trip date
        const weatherData = {
          date: tripDateStr,
          temperature: Math.round(dayForecast.day.avgtemp_c),
          description: dayForecast.day.condition.text,
          icon: dayForecast.day.condition.icon,
          humidity: Math.round(dayForecast.day.avghumidity),
          windSpeed: Math.round(dayForecast.day.maxwind_kph),
          city: weatherResponse.data.location.name,
          country: weatherResponse.data.location.country,
          maxTemp: Math.round(dayForecast.day.maxtemp_c),
          minTemp: Math.round(dayForecast.day.mintemp_c),
          precipitation: Math.round(dayForecast.day.totalprecip_mm),
          uvIndex: dayForecast.day.uv
        };

        res.json({
          success: true,
          weather: weatherData
        });
      } else {
        res.status(400).json({ 
          error: 'Weather forecast not available for this date',
          message: 'Forecast data could not be found for the specified date'
        });
      }
    } else if (diffDays >= 4) {
      // For trips 4+ days in the future, provide current weather as reference
      // This handles API limitations while still providing useful information
      const currentWeatherUrl = `${baseUrl}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)},${encodeURIComponent(country)}&aqi=no`;
      const currentResponse = await axios.get(currentWeatherUrl);

      if (currentResponse.data.error) {
        return res.status(400).json({ 
          error: currentResponse.data.error.message,
          message: 'Unable to find current weather for the specified location'
        });
      }

      const weatherData = {
        date: tripDate,
        message: `Weather for ${tripDate} is not available yet, you may try again closer to the trip date. Here is the current weather in ${city} as reference.`,
        city: currentResponse.data.location.name,
        country: currentResponse.data.location.country,
        currentTemperature: Math.round(currentResponse.data.current.temp_c),
        currentDescription: currentResponse.data.current.condition.text,
        currentIcon: currentResponse.data.current.condition.icon,
        currentHumidity: Math.round(currentResponse.data.current.humidity),
        currentWindSpeed: Math.round(currentResponse.data.current.wind_kph)
      };

      res.json({
        success: true,
        weather: weatherData
      });
    }

  } catch (error) {
    console.error('Error fetching weather:', error);
    
    // Handle specific API errors with appropriate messages
    if (error.response?.status === 401) {
      res.status(500).json({ 
        error: 'Weather API key is invalid or missing',
        message: 'Weather service is currently unavailable'
      });
    } else if (error.response?.status === 400) {
      res.status(400).json({ 
        error: 'City not found or invalid location',
        message: 'The specified location could not be found'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch weather data',
        message: 'Unable to retrieve weather information. Please try again.'
      });
    }
  }
});

/**
 * OpenRouteService Proxy Endpoint
 * 
 * POST /api/trip/ors-route
 * 
 * Proxies route requests to OpenRouteService API for client-side map visualization.
 * This endpoint keeps the ORS API key secure by handling requests server-side.
 * 
 * Request Body:
 * - start: Starting coordinates [latitude, longitude] (required)
 * - end: Ending coordinates [latitude, longitude] (required)
 * - profile: Routing profile ('foot-walking', 'cycling-regular', etc.) (required)
 * 
 * Response:
 * - 200: Route data retrieved successfully
 * - 400: Missing required parameters
 * - 500: ORS API error or server error
 * 
 * Security: This proxy prevents exposure of the ORS API key to the client
 */
router.post('/ors-route', async (req, res) => {
  const { start, end, profile } = req.body;

  // Validate required parameters
  if (!start || !end || !profile) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      message: 'Please provide start coordinates, end coordinates, and routing profile'
    });
  }

  // Validate coordinate format
  if (!Array.isArray(start) || !Array.isArray(end) || start.length !== 2 || end.length !== 2) {
    return res.status(400).json({
      error: 'Invalid coordinate format',
      message: 'Coordinates must be arrays with [latitude, longitude] format'
    });
  }

  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
  
  try {
    // Forward request to OpenRouteService API
    const response = await axios.post(
      url,
      {
        coordinates: [
          [start[1], start[0]], // ORS expects [longitude, latitude]
          [end[1], end[0]]
        ]
      },
      {
        headers: {
          'Authorization': process.env.ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return the route data to the client
    res.json(response.data);
  } catch (error) {
    console.error('ORS proxy error:', error.response ? error.response.data : error.message);
    
    // Handle different types of ORS API errors
    if (error.response?.status === 401) {
      res.status(500).json({ 
        error: 'ORS API key is invalid or missing',
        message: 'Route service is currently unavailable'
      });
    } else if (error.response?.status === 400) {
      res.status(400).json({ 
        error: 'Invalid route request',
        message: 'The requested route could not be calculated',
        details: error.response?.data 
      });
    } else {
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch route from ORS',
        message: 'Unable to calculate route. Please try again.',
        details: error.response?.data 
      });
    }
  }
});

// Proxy endpoint for fetching country flags from Unsplash
// This keeps the Unsplash API key secure on the server side
router.get('/country-flag/:countryName', async (req, res) => {
  try {
    const { countryName } = req.params;
    
    if (!countryName) {
      return res.status(400).json({ error: 'Country name is required' });
    }

    const response = await axios.get(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(countryName + ' flag')}&per_page=1`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );
    
    if (response.data.results && response.data.results.length > 0) {
      res.json({
        success: true,
        flagUrl: response.data.results[0].urls.small
      });
    } else {
      res.json({
        success: false,
        message: 'No flag image found for this country'
      });
    }
  } catch (error) {
    console.error('Error fetching country flag:', error);
    res.status(500).json({ 
      error: 'Failed to fetch country flag',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router; 