# 🌍 Trip Planner – Full Stack Setup Guide

Welcome to **Trip Planner**, a full-stack travel planning application featuring:

- 🧭 **Backend:** Node.js + Express + MongoDB
- 🎨 **Frontend:** React + Leaflet + REST APIs

> ⚡️ *May the builds be swift, the bugs be silent, and the APIs forever respond.*

---

## 🗂️ Project Structure

```
TripPlanner/
├── client/       # React frontend
├── server/       # Node.js + Express backend
└── README.md     # You're here.
```

---

## ⚙️ Prerequisites

Ensure the following tools are installed on your system:

- ✅ [Node.js](https://nodejs.org/) (v16+ recommended)
- ✅ npm (comes with Node.js)
- ✅ [MongoDB](https://www.mongodb.com/) (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- ✅ Internet connection for fetching API data (Unsplash, ORS, Weather)

---

## 🔐 Required API Keys

You must register and obtain **API keys** from the following services:

| Service               | Purpose                 | Get Key From                                | Storage Location |
|-----------------------|--------------------------|----------------------------------------------|------------------|
| Unsplash              | City/country images      | [Unsplash Developers](https://unsplash.com/developers) | Server |
| GROQ (optional)       | AI features (if used)    | [GROQ Console](https://console.groq.com/keys) | Server |
| OpenRouteService (ORS)| Route calculation        | [ORS Signup](https://openrouteservice.org/dev/#/signup) | Server |
| WeatherAPI            | Weather data             | [WeatherAPI Signup](https://www.weatherapi.com/signup.aspx) | Server |

> 🔒 **Security Note:** All API keys are stored securely on the server side to prevent client-side exposure.

---

## 📦 Project Installation

### 1. Clone the Project

```bash
git clone https://github.com/tomern0305/trip-planner.git
cd trip-planner
```
## currently un avilable(the project is private)
---

## 🛠️ Server Setup (Backend)

### Navigate and install:

```bash
cd server
npm install
npm install axios
npm install groq-sdk
npm install polyline
```

### Create `.env` in `/server` with the following:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key

# API KEYS
GROQ_API_KEY=your_groq_api_key
ORS_API_KEY=your_ors_api_key
WEATHER_API_KEY=your_weather_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

### Start the server:

```bash
node server.js
```

Server runs by default at: [http://localhost:5000](http://localhost:5000)

---

## 💻 Client Setup (Frontend)

### Navigate and install:

```bash
cd ../client
npm install
npm install axios
npm install polyline
npm install react-leaflet
```

### Start the client:

```bash
npm start
```

Client runs at: [http://localhost:3000](http://localhost:3000)

> 🔒 **Security Update:** The client no longer requires a `.env` file as all API keys are now securely stored on the server.

---

## 📚 API Overview

### Auth Routes (`/api/`)

- `POST /api/register` – Create a new user
- `POST /api/login` – Log in and get JWT
- `GET /api/me` – Get current user (JWT required)

### Trip Routes (`/api/trip/`)

- `POST /save` – Save a trip
- `GET /history` – Get user trip history
- `GET /trip/:tripId` – Get trip by ID
- `GET /test-auth` – Auth check (JWT)
- `GET /decode-token` – Decode JWT (debug)
- `GET /country-flag/:countryName` – Get country flag (proxy to Unsplash)

> 🔐 All protected routes require the header:  
> `Authorization: Bearer <your_token>`

---

## 🔒 Security Features

- **Server-side API Key Storage:** All API keys are stored securely on the server
- **Proxy Endpoints:** Client requests are proxied through the server to protect API keys
- **JWT Authentication:** Secure user authentication with JSON Web Tokens
- **CORS Protection:** Cross-origin requests are properly configured

---

## 📚 Useful Docs

- [React](https://reactjs.org/)
- [React Router](https://reactrouter.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [Axios](https://axios-http.com/)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Mongoose](https://mongoosejs.com/)
- [Unsplash API](https://unsplash.com/developers)
- [OpenRouteService API](https://openrouteservice.org/dev/#/signup)
- [WeatherAPI](https://www.weatherapi.com/)

---
