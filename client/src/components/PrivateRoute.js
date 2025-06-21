import React from 'react';
import { Navigate } from 'react-router-dom';

// This component acts as a route guard for authenticated routes.
// It checks for the presence of a JWT token in localStorage.
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  // If a token exists, the child components (the protected page) are rendered.
  // Otherwise, the user is redirected to the /login page.
  return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute; 