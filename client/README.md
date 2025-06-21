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

## 🖼️ Unsplash API Setup (for Images)

1. Create a free developer account on [Unsplash](https://unsplash.com/developers).
2. Generate an **Access Key** for your application.
3. In the project root (`TripPlanner/client`), create a `.env` file and add the following line:

```env
REACT_APP_UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

> 🔐 **Do not share your API key publicly**. The `.env` file should not be committed to version control.

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
- 🖼️ Display location-based images using Unsplash API
- 🌐 Backend communication via RESTful APIs

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
