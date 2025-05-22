import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useDeckLimits } from '../../context/DeckLimitContext';
import LoadingScreen from '../ui/LoadingScreen';
import SubscriptionRequired from './SubscriptionRequired';

const ProtectedSubscriptionRoute = () => {
  const { user, loading } = useAuth();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const { canGenerateMajorArcana, loading: decksLoading } = useDeckLimits();
  const location = useLocation();
  
  // Still loading authentication, subscription, or deck data
  if (loading || subscriptionLoading || decksLoading) {
    return <LoadingScreen />;
  }
  
  // Not authenticated - redirect to login
  if (!user) {
    const currentPath = location.pathname;
    localStorage.setItem('authRedirectTo', currentPath);
    
    return <Navigate to="/login" />;
  }

  // Check if user can generate at least a Major Arcana deck
  const canCreateDeck = isSubscribed || canGenerateMajorArcana;
  
  // Authenticated but not allowed to create - show subscription required message
  if (!canCreateDeck) {
    return <SubscriptionRequired />;
  }
  
  // Authenticated and either subscribed or has deck allowance - allow access
  return <Outlet />;
};

export default ProtectedSubscriptionRoute;