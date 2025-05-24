import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../context/SubscriptionContext';
import { useDeckQuotas } from '../../context/DeckQuotaContext';
import LoadingScreen from '../ui/LoadingScreen';
import SubscriptionRequired from './SubscriptionRequired';

const ProtectedSubscriptionRoute = () => {
  const { user, loading } = useAuthStore();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();
  const { quotas, loading: quotasLoading } = useDeckQuotas();
  const location = useLocation();
  
  // Determine if user can generate complete decks based on quotas
  const canGenerateCompleteDeck = quotas && quotas.completeDeckQuota > quotas.completeDeckUsed;
  
  // Still loading authentication, subscription, or deck data
  if (loading || subscriptionLoading || quotasLoading) {
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