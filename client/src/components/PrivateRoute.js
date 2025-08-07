import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * PrivateRoute Component - Route Protection Wrapper
 * 
 * This component acts as a route guard for authenticated routes in the application.
 * It checks for the presence of a valid JWT token in localStorage before allowing
 * access to protected components.
 * 
 * Functionality:
 * - Validates user authentication status
 * - Redirects unauthenticated users to login page
 * - Renders protected content for authenticated users
 * 
 * Usage:
 * Wrap any component that requires authentication with this component:
 * <PrivateRoute><ProtectedComponent /></PrivateRoute>
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The protected component to render
 * @returns {React.ReactNode} Either the protected component or a redirect to login
 */
const PrivateRoute = ({ children }) => {
  // Check for authentication token in localStorage
  const token = localStorage.getItem('token');
  
  // If token exists, render the protected component
  // Otherwise, redirect to login page
  return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute; 