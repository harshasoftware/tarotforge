import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useDeckLimits } from '../../context/DeckLimitContext';
import LoadingScreen from '../ui/LoadingScreen';
import SubscriptionRequired from './SubscriptionRequired';

const ProtectedSubscriptionRoute = () => {
  const { user, loading } = useAuth();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const { canGenerateCompleteDeck, loading: decksLoading } = useDeckLimits();
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

  // Check if user can generate a deck (either subscribed or has deck allowance)
  const canCreateDeck = isSubscribed || canGenerateCompleteDeck;
  
  // Authenticated but not subscribed and no credits - still allow access but with limitations
  if (!canCreateDeck) {
    return <Outlet />;
  }
  
  // Authenticated and either subscribed or has credits - allow access
  return <Outlet />;
};

export default ProtectedSubscriptionRoute;