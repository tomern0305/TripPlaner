# 🌍 Trip Planner

A comprehensive full-stack travel planning application that helps users create, manage, and visualize their travel itineraries with AI-powered recommendations, interactive maps, and weather forecasting.

## ✨ Features

- **User Authentication**: Secure JWT-based authentication system
- **Trip Planning**: AI-powered itinerary generation with GROQ
- **Interactive Maps**: Route visualization using React-Leaflet and OpenRouteService
- **Weather Integration**: Real-time weather forecasts for trip destinations
- **Responsive Design**: Modern UI with dark/light theme support
- **Trip Management**: Create, view, and manage multiple trips
- **Country Flags**: Visual destination indicators using Unsplash API

## 🏗️ Architecture

### Frontend
- **React 18**: Modern component-based UI
- **React Router**: Client-side routing and navigation
- **React-Leaflet**: Interactive map components
- **Axios**: HTTP client for API communication
- **CSS Modules**: Component-scoped styling

### Backend
- **Node.js**: Server runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT**: JSON Web Tokens for authentication
- **Bcrypt**: Password hashing and security

### External APIs
- **GROQ**: AI-powered trip planning and recommendations
- **OpenRouteService**: Route calculation and optimization
- **WeatherAPI**: Weather forecasting and historical data
- **Unsplash**: Country flag images and destination photos

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- MongoDB (local installation or MongoDB Atlas)
- API keys for external services

## 🚀 Installation

---

## 📦 Project Installation

### 1. Clone the Project

```bash
git clone https://github.com/tomern0305/trip-planner.git
cd trip-planner
```

---

### 2. Backend Setup

```bash
cd server
npm install
npm install axios
npm install groq-sdk
npm install polyline
```

Create a `.env` file in the server directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# External API Keys
GROQ_API_KEY=your_groq_api_key
ORS_API_KEY=your_openrouteservice_api_key
WEATHER_API_KEY=your_weatherapi_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

Start the backend server:

```bash
npm start
```

### 3. Frontend Setup

```bash
cd ../client
npm install
npm install axios
npm install polyline
npm install react-leaflet
```

Start the development server:

```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🔑 API Keys Setup

### Required Services

1. **GROQ API**
   - Visit [GROQ Console](https://console.groq.com/keys)
   - Create an account and generate an API key
   - Used for AI-powered trip planning

2. **OpenRouteService**
   - Sign up at [ORS](https://openrouteservice.org/dev/#/signup)
   - Generate an API key for route calculations
   - Used for map routing and distance calculations

3. **WeatherAPI**
   - Register at [WeatherAPI](https://www.weatherapi.com/signup.aspx)
   - Get your API key for weather data
   - Used for trip weather forecasting

4. **Unsplash**
   - Join [Unsplash Developers](https://unsplash.com/developers)
   - Create an application to get access keys
   - Used for country flags and destination images

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User authentication
- `GET /api/me` - Get current user profile

### Trip Management Endpoints

- `POST /api/trip/save` - Save a new trip
- `GET /api/trip/history` - Get user's trip history
- `GET /api/trip/:tripId` - Get specific trip details
- `POST /api/trip/weather` - Get weather forecast for trip

### Protected Routes

All trip-related endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

## 🎨 Design System

The application uses a comprehensive design system with:

- **CSS Custom Properties**: Theme-aware color variables
- **Responsive Grid**: Flexible layout system
- **Component Architecture**: Modular, reusable components
- **Dark/Light Themes**: User-selectable theme preferences
- **Accessibility**: WCAG compliant design patterns

## 🔒 Security Features

- **Server-side API Key Storage:** All API keys are stored securely on the server
- **Proxy Endpoints:** Client requests are proxied through the server to protect API keys
- **JWT Authentication:** Secure user authentication with JSON Web Tokens
- **CORS Protection:** Cross-origin requests are properly configured

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
