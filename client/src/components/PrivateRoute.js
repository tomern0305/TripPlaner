import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * PrivateRoute Component
 * Route protection wrapper that ensures only authenticated users can access protected components.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The protected component to render
 * @returns {React.ReactNode} Protected component or redirect to login
 */
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute; 