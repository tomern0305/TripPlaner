# 🧭 Trip Planner Server – Setup Guide

This is the **backend server** for the Trip Planner application. It provides a suite of **RESTful APIs** for user authentication and trip management, powered by **Node.js**, **Express**, and **MongoDB**.

---

## 🚀 Features

- 🔐 User registration & login with JWT authentication
- 🧳 Trip creation, storage, and retrieval
- 🗃️ MongoDB storage via Mongoose
- 🔑 Secure password hashing (bcrypt)
- 🌐 CORS support for frontend communication
- 🖼️ Secure API key management for external services
- 🔒 Proxy endpoints to protect API keys from client exposure

---

## ⚙️ Prerequisites

- ✅ **[Node.js](https://nodejs.org/)** (v16 or higher recommended)
- ✅ **npm** (comes with Node.js)
- ✅ A **MongoDB** database (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

---

## 📁 Setup Instructions

### 1. Navigate to the server directory

```bash
cd TripPlanner/server
```

### 2. Install dependencies

```bash
npm install
```

---

## 🔐 Environment Variables

Create a `.env` file inside the `server` directory with the following content:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key

# API KEYS
GROQ_API_KEY=your_groq_api_key_here
ORS_API_KEY=your_openrouteservice_api_key_here
WEATHER_API_KEY=your_weather_api_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

### 🔗 API Key Signup Links

- 🧠 [GROQ API](https://console.groq.com/keys)
- 🗺️ [OpenRouteService (ORS)](https://openrouteservice.org/dev/#/signup)
- 🌤️ [WeatherAPI](https://www.weatherapi.com/signup.aspx)
- 🖼️ [Unsplash API](https://unsplash.com/developers)
- 🛢️ [MongoDB Atlas (optional cloud DB)](https://www.mongodb.com/cloud/atlas/register)

> 💡 **Never commit your `.env` file.** It contains sensitive credentials.

---

## ▶️ Running the Server

Start the backend with:

```bash
npm start
```

By default, the server runs at:

👉 [http://localhost:5000](http://localhost:5000)

---

## 🔌 API Endpoints

### 🧑 Authentication

| Method | Endpoint         | Description                         |
|--------|------------------|-------------------------------------|
| POST   | `/api/register`  | Register a new user                 |
| POST   | `/api/login`     | Login and receive JWT token         |
| GET    | `/api/me`        | Get current user (requires JWT)     |

### 🌍 Trip Management

| Method | Endpoint                         | Description                                 |
|--------|----------------------------------|---------------------------------------------|
| POST   | `/api/trip/save`                | Save a new trip (requires JWT)              |
| GET    | `/api/trip/history`             | Retrieve user's trip history (requires JWT) |
| GET    | `/api/trip/trip/:tripId`        | Get details for a specific trip (JWT)       |
| GET    | `/api/trip/test-auth`           | Test authentication (JWT)                   |
| GET    | `/api/trip/decode-token`        | Decode & inspect the JWT token              |

### 🖼️ Media & External Services

| Method | Endpoint                         | Description                                 |
|--------|----------------------------------|---------------------------------------------|
| GET    | `/api/trip/country-flag/:countryName` | Get country flag image (proxy to Unsplash) |
| POST   | `/api/trip/ors-route`           | Get route data (proxy to OpenRouteService) |
| POST   | `/api/trip/weather`             | Get weather forecast (proxy to WeatherAPI) |

> 🛡️ All protected routes require the header:  
> `Authorization: Bearer <your_token_here>`

---

## 🔒 Security Features

- **Server-side API Key Storage:** All external API keys are stored securely on the server
- **Proxy Endpoints:** Client requests are proxied through the server to protect API keys
- **JWT Authentication:** Secure user authentication with JSON Web Tokens
- **CORS Protection:** Cross-origin requests are properly configured
- **Input Validation:** All user inputs are validated before processing

---

## 🧬 Data Models

### 👤 User

```js
{
  name: String,         // required
  email: String,        // required, unique, lowercase
  password: String      // required (hashed)
}
```

### 🧳 Trip

```js
{
  userId: ObjectId,     // references User
  userEmail: String,
  tripId: String,       // unique
  tirpName: String,
  tripDescription: String,
  country: String,
  city: String,
  tripType: String,     // enum: ['bike', 'trek']
  tripDate: String,
  countryFlag: String,  // optional
  tripData: Object,     // route, days, distances, etc.
  createdAt: Date
}
```