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
└── README.md     # You're here, mortal.
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

| Service               | Purpose                 | Get Key From                                |
|-----------------------|--------------------------|----------------------------------------------|
| Unsplash              | City/country images      | [Unsplash Developers](https://unsplash.com/developers) |
| GROQ (optional)       | AI features (if used)    | [GROQ Console](https://console.groq.com/keys) |
| OpenRouteService (ORS)| Route calculation        | [ORS Signup](https://openrouteservice.org/dev/#/signup) |
| WeatherAPI            | Weather data             | [WeatherAPI Signup](https://www.weatherapi.com/signup.aspx) |

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
```

### Start the server:

```bash
npm start
```

Server runs by default at: [http://localhost:5000](http://localhost:5000)

---

## 💻 Client Setup (Frontend)

### Navigate and install:

```bash
cd ../client
npm install
```

### Create `.env` in `/client` with the following:

```env
REACT_APP_UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

### Start the client:

```bash
npm start
```

Client runs at: [http://localhost:3000](http://localhost:3000)

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

> 🔐 All protected routes require the header:  
> `Authorization: Bearer <your_token>`

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