import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoadingScreen from './components/ui/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ProtectedSubscriptionRoute from './components/auth/ProtectedSubscriptionRoute';
import ErrorBoundary from './components/error/ErrorBoundary';
import * as Sentry from "@sentry/react";
import setupLogRocketReact from 'logrocket-react';
import LogRocket from 'logrocket';
import { trackPageView } from './utils/analytics';
import ScrollToTop from './components/ui/ScrollToTop';

// Initialize LogRocket React plugin
setupLogRocketReact(LogRocket);

// Initialize Sentry
Sentry.init({
  dsn: "https://9c3c4747996da8b597048265023ff2f0@o4509354423156736.ingest.us.sentry.io/4509354424860677",
  sendDefaultPii: true,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing({
      // Set sampling rate for performance monitoring
      tracingOrigins: ['localhost', 'tarotforge.xyz'],
    }),
  ],
});

// Connect LogRocket sessions to Sentry
LogRocket.getSessionURL(sessionURL => {
  Sentry.configureScope(scope => {
    scope.setExtra("logRocketSessionURL", sessionURL);
  });
});

// Lazy loaded components
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const Marketplace = lazy(() => import('./pages/marketplace/Marketplace'));
const DeckDetails = lazy(() => import('./pages/marketplace/DeckDetails'));
const Collection = lazy(() => import('./pages/user/Collection')); 
const ReadingRoom = lazy(() => import('./pages/reading/ReadingRoom'));
const Profile = lazy(() => import('./pages/user/Profile'));
const Checkout = lazy(() => import('./pages/marketplace/Checkout'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const DeckCreator = lazy(() => import('./pages/creator/DeckCreator'));

// New components for Readers and Reader Quiz
const ReadersPage = lazy(() => import('./pages/readers/ReadersPage'));
const BecomeReader = lazy(() => import('./pages/readers/BecomeReader'));
const TarotQuiz = lazy(() => import('./pages/readers/TarotQuiz'));
const ReaderDashboard = lazy(() => import('./pages/readers/ReaderDashboard'));
const CertificateShare = lazy(() => import('./components/readers/CertificateShare'));

// Subscription pages
const SubscriptionPage = lazy(() => import('./pages/subscription/SubscriptionPage'));
const SubscriptionSuccess = lazy(() => import('./pages/subscription/SubscriptionSuccess'));

// Pricing page (for logged-out users)
const PricingPage = lazy(() => import('./pages/pricing/PricingPage'));

// Wrap the app with Sentry's error boundary
const SentryErrorBoundary = Sentry.withErrorBoundary(ErrorBoundary, {
  fallback: ({ error, componentStack, resetError }: { 
    error: unknown; 
    componentStack: string; 
    resetError: () => void; 
  }) => (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h2 className="text-lg font-semibold text-red-800 mb-2">
        Something went wrong
      </h2>
      <p className="text-red-600 mb-4">
        {error instanceof Error ? error.message : 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
      >
        Try again
      </button>
    </div>
  ),
});

function App() {
  const { checkAuth, loading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Initial auth check - only run once on component mount
  useEffect(() => {
    // Run auth check once when the component mounts
    checkAuth();
  }, []); // Empty dependency array ensures it only runs once

  // Handle auth redirect from URL params for deep linking
  useEffect(() => {
    // Only process auth redirects when auth state is settled (not loading)
    if (!loading) {
      // If "auth=required" is in the URL and user is not authenticated,
      // store the current path and redirect to login
      const params = new URLSearchParams(location.search);
      if (params.get('auth') === 'required' && !user) {
        // Store the intended destination
        localStorage.setItem('authRedirectTo', location.pathname);
        navigate('/login');
      }
      
      // If user is authenticated and there's a stored redirect path, go there
      if (user) {
        const redirectTo = localStorage.getItem('authRedirectTo');
        if (redirectTo) {
          localStorage.removeItem('authRedirectTo');
          navigate(redirectTo);
        }
      }
    }
  }, [location, loading, user, navigate]);

  // Scroll to top on route change and track page view
  useEffect(() => {
    // Track page view in analytics
    const pageName = location.pathname.split('/')[1] || 'home';
    trackPageView(pageName, {
      path: location.pathname,
      search: location.search,
      url: window.location.href
    });
  }, [location.pathname]);

  return (
    <SentryErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="marketplace/:deckId" element={<DeckDetails />} />
            <Route path="readers" element={<ReadersPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="subscription/success" element={<SubscriptionSuccess />} />
            
            {/* Certificate sharing route (public) */}
            <Route path="certificate/:certificateId" element={<CertificateShare />} />
            
            {/* Authentication callback route */}
            <Route path="auth/callback" element={<AuthCallback />} />
            
            {/* Make reading room directly accessible */}
            <Route path="reading-room/:deckId?" element={<ReadingRoom />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="collection" element={<Collection />} />
              <Route path="profile" element={<Profile />} />
              <Route path="checkout/:deckId" element={<Checkout />} />
              <Route path="become-reader" element={<BecomeReader />} />
              <Route path="tarot-quiz" element={<TarotQuiz />} />
              <Route path="reader-dashboard" element={<ReaderDashboard />} />
            </Route>
            
            {/* Routes that require subscription */}
            <Route element={<ProtectedSubscriptionRoute />}>
              <Route path="create-deck" element={<DeckCreator />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </SentryErrorBoundary>
  );
}

export default App;