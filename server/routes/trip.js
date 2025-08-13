const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Trip = require('../models/Trip');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const ORS_API_KEY = process.env.ORS_API_KEY;

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

router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: req.user
  });
});

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

router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { country, city, tripType, tripDate, tripName, tripDescription, countryFlag, tripData } = req.body;
    const { email, userId } = req.user;

    console.log('Save trip request:', { country, city, tripType, tripDate, tripName, tripDescription, hasCountryFlag: !!countryFlag, hasTripData: !!tripData });
    console.log('User info:', { email, userId });

    if (!userId || !email) {
      console.log('Missing userId or email, attempting to extract from token...');
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        try {
          const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
          const decoded = jwt.verify(token, jwtSecret);
          console.log('Decoded token:', decoded);
          
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

    if (!country || !city || !tripType || !tripDate || !tripName || !tripData) {
      console.log('Missing required fields:', { country, city, tripType, tripDate, tripName, hasTripData: !!tripData });
      return res.status(400).json({ 
        error: 'All required fields must be provided',
        message: 'Please provide country, city, trip type, trip date, trip name, and trip data'
      });
    }

    const tripId = `${req.user.email}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTrip = new Trip({
      userId: req.user.userId,
      userEmail: req.user.email,
      tripId,
      tripName,
      tripDescription,
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

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;

    const trips = await Trip.find({ userEmail: email })
      .sort({ createdAt: -1 })
      .select('tripId country city tripType tripDate countryFlag createdAt tripName tripDescription');

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

router.get('/trip/:tripId', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { email } = req.user;

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

async function validateORSRoutesAndDistances(tripData, tripType) {
  const profile = tripType === 'bike' ? 'cycling-regular' : 'foot-walking';
  
  const dayDistanceLimits = tripType === 'bike' 
    ? { min: 10000, max: 60000 }
    : { min: 5000, max: 15000 };
  
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
              [start[1], start[0]],
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
      return res.status(400).json({ 
        error: 'All fields are required',
        message: 'Please provide country, city, trip type, and trip date'
      });
    }

    if (!['bike', 'trek'].includes(tripType)) {
      return res.status(400).json({ 
        error: 'Invalid trip type',
        message: 'Trip type must be either "bike" or "trek"'
      });
    }

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
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          tripData = JSON.parse(jsonMatch[0]);
        } else {
          tripData = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        continue;
      }
      
      const validation = await validateORSRoutesAndDistances(tripData, tripType);
      if (validation.valid) {
        foundValid = true;
        orsData = validation.allORSData;
        break;
      }
    }

    if (!foundValid) {
      return res.status(500).json({ 
        error: 'Failed to generate valid trip plan',
        message: 'Unable to create a feasible trip plan after multiple attempts. Please try again.',
        rawResponse: lastRawResponse 
      });
    }

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

router.post('/generate', authenticateToken, async (req, res) => {
  const { country, city, tripType, tripDate } = req.body;
  
  if (!country || !city || !tripType || !tripDate) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'Please provide country, city, trip type, and trip date'
    });
  }

  try {
    const tripPlan = await generateTripPlan(country, city, tripType, tripDate);
    const validatedPlan = await validateORSRoutesAndDistances(tripPlan, tripType);
    const weatherData = await getWeatherForecast(city, tripDate);
    const countryFlag = await getCountryFlag(country);
    
    res.json({
      success: true,
      tripData: validatedPlan,
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

router.post('/weather', async (req, res) => {
  try {
    const { city, country, tripDate } = req.body;

    if (!city || !country || !tripDate) {
      return res.status(400).json({ 
        error: 'City, country, and trip date are required',
        message: 'Please provide all required weather lookup parameters'
      });
    }

    const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
    const baseUrl = 'https://api.weatherapi.com/v1';

    const tripDateObj = new Date(tripDate);
    const today = new Date();
    const diffTime = tripDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      const weatherUrl = `${baseUrl}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)},${encodeURIComponent(country)}&days=3&aqi=no`;
      
      const weatherResponse = await axios.get(weatherUrl);
      
      if (weatherResponse.data.error) {
        return res.status(400).json({ 
          error: weatherResponse.data.error.message,
          message: 'Unable to find weather data for the specified location'
        });
      }

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
        res.status(400).json({ 
          error: 'Weather forecast not available for this date',
          message: 'Forecast data could not be found for the specified date'
        });
      }
    } else if (diffDays >= 4) {
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

router.post('/ors-route', async (req, res) => {
  const { start, end, profile } = req.body;

  if (!start || !end || !profile) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      message: 'Please provide start coordinates, end coordinates, and routing profile'
    });
  }

  if (!Array.isArray(start) || !Array.isArray(end) || start.length !== 2 || end.length !== 2) {
    return res.status(400).json({
      error: 'Invalid coordinate format',
      message: 'Coordinates must be arrays with [latitude, longitude] format'
    });
  }

  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
  
  try {
    const response = await axios.post(
      url,
      {
        coordinates: [
          [start[1], start[0]],
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
    
    res.json(response.data);
  } catch (error) {
    console.error('ORS proxy error:', error.response ? error.response.data : error.message);
    
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