import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { CreditProvider } from './context/CreditContext';
import { VideoCallProvider } from './context/VideoCallContext';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { 
  registerDailyTarotUpdates, 
  requestNotificationPermission, 
  registerBackgroundSync,
  isBackgroundSyncSupported,
  isPeriodicSyncSupported,
  isPushNotificationSupported
} from './utils/pwa-features';
import * as Sentry from "@sentry/react";
import { initializeLogRocket } from './utils/analytics';

// Initialize LogRocket
initializeLogRocket();

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

// Register service worker for PWA functionality
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
    // Initialize advanced PWA features when offline ready
    initPWAFeatures();
  },
});

// Initialize advanced PWA features
async function initPWAFeatures() {
  try {
    // Log feature support for debugging
    console.log('PWA Features Support:', {
      backgroundSync: isBackgroundSyncSupported(),
      pushNotifications: isPushNotificationSupported(),
      periodicSync: await isPeriodicSyncSupported()
    });

    // Request notification permission
    const notificationPermission = await requestNotificationPermission();
    if (notificationPermission === 'granted') {
      console.log('Notification permission granted');
      
      // Show welcome notification
      if ('Notification' in window) {
        new Notification('Tarot Forge PWA', {
          body: 'Your tarot app is now available offline with background sync!',
          icon: '/ios/192.png'
        });
      }
    }

    // Register for background sync if supported
    if (isBackgroundSyncSupported()) {
      await registerBackgroundSync('tarotforge-outbox');
      console.log('Background sync registered for offline uploads');
    }
    
    // Register for periodic sync (daily tarot updates)
    const periodicSyncSupported = await isPeriodicSyncSupported();
    if (periodicSyncSupported) {
      await registerDailyTarotUpdates();
      console.log('Periodic sync registered for daily tarot card updates');
    }
  } catch (error) {
    console.error('Error initializing PWA features:', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <CreditProvider>
            <VideoCallProvider>
              <App />
            </VideoCallProvider>
          </CreditProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);