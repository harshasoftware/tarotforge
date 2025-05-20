import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import LoadingScreen from '../ui/LoadingScreen';
import SubscriptionRequired from './SubscriptionRequired';

const ProtectedSubscriptionRoute = () => {
  const { user, loading } = useAuth();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const location = useLocation();
  
  // Still loading authentication or subscription data
  if (loading || subscriptionLoading) {
    return <LoadingScreen />;
  }
  
  // Not authenticated - redirect to login
  if (!user) {
    const currentPath = location.pathname;
    localStorage.setItem('authRedirectTo', currentPath);
    
    return <Navigate to="/login" />;
  }
  
  // Authenticated but not subscribed - show subscription required message
  if (!isSubscribed) {
    return <SubscriptionRequired />;
  }
  
  // Authenticated and subscribed - allow access
  return <Outlet />;
};

export default ProtectedSubscriptionRoute;