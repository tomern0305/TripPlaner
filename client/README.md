# Trip Planner Client

This is the React frontend for the Trip Planner application. It allows users to register, log in, and plan trips, interacting with the backend server via RESTful APIs.

## Prerequisites
- Node.js (v16 or higher recommended)
- npm
- The Trip Planner server must be running before starting the client.

## Required Libraries
The following npm packages are required for the client:

- @testing-library/dom
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- axios
- leaflet
- polyline
- react
- react-dom
- react-leaflet
- react-router-dom
- react-scripts
- web-vitals

## Installation
1. Open a terminal and navigate to the client directory:
   ```bash
   cd TripPlaner/client
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```

## Running the Application
**Important:** Make sure the Trip Planner server is running before starting the client.

To start the client in development mode, run:
```bash
npm start
```
This will open the app in your browser at [http://localhost:3000](http://localhost:3000).

## Usage
- Register a new account or log in with existing credentials.
- Plan and save trips, view your trip history, and see trip details.
- All data is managed via the backend server.

## Notes
- The client communicates with the backend server via RESTful API calls.
- If you encounter issues connecting, ensure the server is running and accessible.

---

For more information or troubleshooting, please refer to the server README or open an issue.
