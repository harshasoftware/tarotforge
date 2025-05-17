import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';
import { useEffect, useState } from 'react';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [waitTimeExceeded, setWaitTimeExceeded] = useState(false);
  
  // Set a maximum wait time for the loading state
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setWaitTimeExceeded(true);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading]);
  
  // Still loading, but within acceptable time limit
  if (loading && !waitTimeExceeded) {
    return <LoadingScreen />;
  }
  
  // Allow access if user exists
  if (user) {
    return <Outlet />;
  }
  
  // If loading for too long or not authenticated, redirect to login
  const currentPath = location.pathname;
  localStorage.setItem('authRedirectTo', currentPath);
  
  return <Navigate to="/login" />;
};

export default ProtectedRoute;