const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Trip = require('../models/Trip');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const groq = new Groq({
  apiKey: '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'
});

const ORS_API_KEY = '5b3ce3597851110001cf62483581bb6eecd44fca82594cc3a6b2cd7f';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    // Ensure we have the required user data
    if (!user.userId || !user.email) {
      console.error('JWT token missing required fields:', user);
      return res.status(403).json({ 
        error: 'Invalid token structure. Please log out and log back in to get a new token.',
        tokenStructure: user,
        missingFields: {
          userId: !user.userId,
          email: !user.email
        }
      });
    }
    
    req.user = {
      userId: user.userId,
      email: user.email,
      id: user.id || user.userId
    };
    
    console.log('Authenticated user:', req.user);
    next();
  });
};

// Test route to verify authentication
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: req.user
  });
});

// Test route to decode JWT token
router.get('/decode-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
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
    res.status(400).json({ error: 'Invalid token', details: error.message });
  }
});

// Save trip to database
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { country, city, tripType, tripDate, countryFlag, tripData } = req.body;
    const { email, userId } = req.user;

    console.log('Save trip request:', { country, city, tripType, tripDate, hasCountryFlag: !!countryFlag, hasTripData: !!tripData });
    console.log('User info:', { email, userId });

    // Fallback: if userId or email is missing, try to get from token
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
            return res.status(400).json({ error: 'Unable to determine user information from token' });
          }
        } catch (tokenError) {
          console.error('Error decoding token:', tokenError);
          return res.status(400).json({ error: 'Invalid token structure' });
        }
      }
    }

    if (!country || !city || !tripType || !tripDate || !tripData) {
      console.log('Missing required fields:', { country, city, tripType, tripDate, hasTripData: !!tripData });
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Generate unique trip ID
    const tripId = `${req.user.email}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    res.status(500).json({ error: 'Failed to save trip: ' + error.message });
  }
});

// Get user's trip history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;

    const trips = await Trip.find({ userEmail: email })
      .sort({ createdAt: -1 }) // Most recent first
      .select('tripId country city tripType tripDate countryFlag createdAt');

    res.json({
      success: true,
      trips
    });

  } catch (error) {
    console.error('Error fetching trip history:', error);
    res.status(500).json({ error: 'Failed to fetch trip history' });
  }
});

// Get specific trip details
router.get('/trip/:tripId', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { email } = req.user;

    const trip = await Trip.findOne({ tripId, userEmail: email });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({
      success: true,
      trip
    });

  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

// Helper to check if all legs of a trip are routable via OpenRouteService
async function validateORSRoutesAndDistances(tripData, tripType) {
  const profile = tripType === 'bike' ? 'cycling-regular' : 'foot-walking';
  // Real validation range
  const dayDistanceLimits = tripType === 'bike' ? { min: 10000, max: 60000 } : { min: 5000, max: 15000 }; // meters
  let allORSData = [];
  for (const day of tripData.days) {
    let dayDistance = 0;
    let dayDuration = 0;
    let orsSegments = [];
    for (let i = 0; i < day.cities.length - 1; i++) {
      const start = day.cities[i].coordinates;
      const end = day.cities[i + 1].coordinates;
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
        if (!response.data || !response.data.routes || !response.data.routes[0] || !response.data.routes[0].geometry) {
          return { valid: false };
        }
        const summary = response.data.routes[0].summary;
        // Only add if both are numbers
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
        return { valid: false };
      }
    }
    // Check if day distance is within limits
    if (dayDistance < dayDistanceLimits.min || dayDistance > dayDistanceLimits.max) {
      return { valid: false };
    }
    allORSData.push({ dayDistance, dayDuration, orsSegments });
  }
  return { valid: true, allORSData };
}

router.post('/plan', async (req, res) => {
  try {
    const { country, city, tripType, tripDate } = req.body;

    if (!country || !city || !tripType || !tripDate) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create the prompt for the LLM based on trip type
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
    } else {
      return res.status(400).json({ error: 'Invalid trip type. Must be "bike" or "trek"' });
    }

    let tripData;
    let lastRawResponse = null;
    let maxRetries = 5;
    let foundValid = false;
    let orsData = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
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
      // Try to parse the JSON response
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
        continue; // Try again
      }
      // Validate all legs and distances with OpenRouteService
      const validation = await validateORSRoutesAndDistances(tripData, tripType);
      if (validation.valid) {
        foundValid = true;
        orsData = validation.allORSData;
        break;
      }
    }
    if (!foundValid) {
      return res.status(500).json({ error: 'LLM Failed to generate a valid trip with routable segments and correct distances after several attempts.', rawResponse: lastRawResponse });
    }
    // Overwrite tripData distances and durations with ORS values
    tripData.days.forEach((day, idx) => {
      day.totalDistance = (typeof orsData[idx].dayDistance === 'number' ? (orsData[idx].dayDistance / 1000).toFixed(2) + ' km' : 'N/A');
      day.estimatedTime = (typeof orsData[idx].dayDuration === 'number' ? (orsData[idx].dayDuration / 3600).toFixed(2) + ' hours' : 'N/A');
      day.distances = orsData[idx].orsSegments.map(seg => (typeof seg.distance === 'number' ? (seg.distance / 1000).toFixed(2) + ' km' : 'N/A'));
      day.durations = orsData[idx].orsSegments.map(seg => (typeof seg.duration === 'number' ? (seg.duration / 60).toFixed(1) + ' min' : 'N/A'));
    });
    res.json({
      success: true,
      tripData,
      originalRequest: { country, city, tripType, tripDate }
    });

  } catch (error) {
    console.error('Error planning trip:', error);
    res.status(500).json({ error: 'Failed to plan trip' });
  }
});

// Get weather forecast for trip
router.post('/weather', async (req, res) => {
  try {
    const { city, country, tripDate } = req.body;

    if (!city || !country || !tripDate) {
      return res.status(400).json({ error: 'City, country, and trip date are required' });
    }

    // WeatherAPI.com configuration
    const WEATHER_API_KEY = 'ef37f3a7d99a4efaace143948251806';
    const baseUrl = 'https://api.weatherapi.com/v1';

    // Calculate the date difference to get the forecast day
    const tripDateObj = new Date(tripDate);
    const today = new Date();
    const diffTime = tripDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // WeatherAPI.com provides 3-day forecast for free
    if (diffDays >= 0 && diffDays <= 3) {
      const weatherUrl = `${baseUrl}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)},${encodeURIComponent(country)}&days=3&aqi=no`;
      
      const weatherResponse = await axios.get(weatherUrl);
      
      if (weatherResponse.data.error) {
        return res.status(400).json({ error: weatherResponse.data.error.message });
      }

      // Find the forecast for the trip date
      const tripDateStr = tripDateObj.toISOString().split('T')[0];
      const dayForecast = weatherResponse.data.forecast.forecastday.find(day => 
        day.date === tripDateStr
      );

      if (dayForecast) {
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
        res.status(400).json({ error: 'Weather forecast not available for this date' });
      }
    } else if (diffDays >= 4) {
      // For any trip 4+ days in the future, provide current weather as reference
      const currentWeatherUrl = `${baseUrl}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)},${encodeURIComponent(country)}&aqi=no`;
      const currentResponse = await axios.get(currentWeatherUrl);

      if (currentResponse.data.error) {
        return res.status(400).json({ error: currentResponse.data.error.message });
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
    if (error.response?.status === 401) {
      res.status(500).json({ error: 'Weather API key is invalid or missing' });
    } else if (error.response?.status === 400) {
      res.status(400).json({ error: 'City not found or invalid location' });
    } else {
      res.status(500).json({ error: 'Failed to fetch weather data' });
    }
  }
});

module.exports = router; 
module.exports = router; 