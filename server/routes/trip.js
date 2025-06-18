const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: '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'
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