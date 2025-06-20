# Trip Planner Server

This is the backend server for the Trip Planner application. It provides RESTful APIs for user authentication and trip management, using Node.js, Express, and MongoDB.

## Features
- User registration and login with JWT authentication
- Trip creation, history, and retrieval
- MongoDB data storage via Mongoose
- Secure password hashing
- CORS support for frontend integration

## Prerequisites
- Node.js (v16 or higher recommended)
- npm
- MongoDB database (local or cloud, e.g., MongoDB Atlas)

## Installation
1. Navigate to the `server` directory:
   ```bash
   cd TripPlaner/server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables
Create a `.env` file in the `server` directory with the following variables:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000 # or any port you prefer
JWT_SECRET=your_jwt_secret_key
```

## Running the Server
Start the server with:
```bash
npm start
```
The server will run on `http://localhost:5000` by default.

## API Endpoints

### Authentication
- `POST /api/register` — Register a new user
- `POST /api/login` — Login and receive a JWT token
- `GET /api/me` — Get current user info (requires JWT)

### Trip Management
- `POST /api/trip/save` — Save a new trip (requires JWT)
- `GET /api/trip/history` — Get user's trip history (requires JWT)
- `GET /api/trip/trip/:tripId` — Get details for a specific trip (requires JWT)
- `GET /api/trip/test-auth` — Test authentication (requires JWT)
- `GET /api/trip/decode-token` — Decode and inspect JWT token

## Models

### User
- `name`: String, required
- `email`: String, required, unique, stored lowercase
- `password`: String, required (hashed)

### Trip
- `userId`: ObjectId (refers to User), required
- `userEmail`: String, required
- `tripId`: String, required, unique
- `country`: String, required
- `city`: String, required
- `tripType`: String, enum: ['bike', 'trek'], required
- `tripDate`: String, required
- `countryFlag`: String (optional)
- `tripData`: Object (days, cities, distances, etc.)
- `createdAt`: Date, default now

## Notes
- All protected routes require the `Authorization: Bearer <token>` header.
- Ensure your MongoDB instance is running and accessible.
- For development, you can use tools like Postman to test the API endpoints.

---

Feel free to contribute or open issues for improvements! 