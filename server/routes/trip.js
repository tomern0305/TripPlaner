const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Trip = require('../models/Trip');
const jwt = require('jsonwebtoken');

const groq = new Groq({
  apiKey: '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'
});

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
- Day 1: 10-60km route, must pass through at least 3-4 different points (cities, towns, streets, landmarks, or notable locations)
- Day 2: 10-60km route back to starting point, also passing through at least 3-4 different points
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
- The route must pass through at least 4-5 different points (landmarks, viewpoints, parks, streets, or interesting locations)
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
    
    // Try to parse the JSON response
    let tripData;
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
      return res.status(500).json({ 
        error: 'Failed to parse trip data from LLM response',
        rawResponse: response 
      });
    }

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

module.exports = router; 