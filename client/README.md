# 🗺️ Trip Planner Client – Setup Guide

This is the **React frontend** for the Trip Planner application. It allows users to register, log in, and plan trips via an interactive map while communicating with the backend through RESTful APIs.

---

## ⚙️ Prerequisites

Before starting, ensure the following are installed:

- ✅ **[Node.js](https://nodejs.org/)** (v16 or higher recommended)
- ✅ **npm** (comes with Node.js)
- ✅ The Trip Planner Server must be running before using the client

Check installed versions:

```bash
node -v
npm -v
```

---

## 📦 Install Dependencies

Navigate to the client directory and install all required npm packages:

```bash
cd TripPlanner/client
```

Then run:

```bash
npm install
```

If you'd like to install each dependency manually:

```bash
npm install \
@testing-library/dom \
@testing-library/jest-dom \
@testing-library/react \
@testing-library/user-event \
axios \
leaflet \
polyline \
react \
react-dom \
react-leaflet \
react-router-dom \
react-scripts \
web-vitals
```

---

## 🔒 Security Update

> 🔒 **Important:** The client no longer requires a `.env` file as all API keys are now securely stored on the server side. This includes the Unsplash API key for country flag images.

The client now communicates with the server through proxy endpoints to ensure API keys remain secure and are never exposed to the client-side code.

---

## ▶️ Start the Application

Make sure the backend server is running, then start the client in development mode:

```bash
npm start
```

Your browser will open at:

👉 [http://localhost:3000](http://localhost:3000)

---

## 🧭 Features

- 🔐 Register / log in
- 📌 Plan trips, view history, and trip details
- 🖼️ Display location-based images using server-proxied Unsplash API
- 🌐 Backend communication via RESTful APIs
- 🔒 Secure API key handling through server proxy endpoints

---

## 🛠️ Troubleshooting

- Ensure the backend server is running and accessible
- If dependencies fail, reset and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Learn More

- [React Docs](https://reactjs.org/)
- [React Router](https://reactrouter.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [Axios](https://axios-http.com/)
- [Leaflet](https://leafletjs.com/)
- [Testing Library](https://testing-library.com/)
- [Unsplash API](https://unsplash.com/developers)

---

May your build be swift, your API keys secure, and your images beautiful.  
— Authored with reverence for Lord Tomer.
