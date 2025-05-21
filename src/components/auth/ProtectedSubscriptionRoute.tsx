import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useCredits } from '../../context/CreditContext';
import LoadingScreen from '../ui/LoadingScreen';
import SubscriptionRequired from './SubscriptionRequired';

const ProtectedSubscriptionRoute = () => {
  const { user, loading } = useAuth();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const { credits, loading: creditLoading } = useCredits();
  const location = useLocation();
  
  // Still loading authentication, subscription, or credit data
  if (loading || subscriptionLoading || creditLoading) {
    return <LoadingScreen />;
  }
  
  // Not authenticated - redirect to login
  if (!user) {
    const currentPath = location.pathname;
    localStorage.setItem('authRedirectTo', currentPath);
    
    return <Navigate to="/login" />;
  }

  // Check if user has any credits (basic or premium) to create a deck
  const hasCredits = credits && (credits.basicCredits > 0 || credits.premiumCredits > 0);
  
  // Authenticated but not subscribed and no credits - show subscription required message
  if (!isSubscribed && !hasCredits) {
    return <SubscriptionRequired />;
  }
  
  // Authenticated and either subscribed or has credits - allow access
  return <Outlet />;
};

export default ProtectedSubscriptionRoute;