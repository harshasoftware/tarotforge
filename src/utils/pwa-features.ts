/**
 * Utility functions for PWA features: 
 * - Background Sync
 * - Periodic Sync
 * - Push Notifications
 */

// Check if the browser supports service workers
export const isServiceWorkerSupported = (): boolean => {
  return 'serviceWorker' in navigator;
};

// Check if the browser supports background sync
export const isBackgroundSyncSupported = (): boolean => {
  return isServiceWorkerSupported() && 'serviceWorker' in navigator && 
    'SyncManager' in window && window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// Check if the browser supports periodic background sync
export const isPeriodicSyncSupported = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported()) return false;
  
  // Check if running in secure context or localhost (required for periodic sync)
  const isSecureOrLocalhost = window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
  if (!isSecureOrLocalhost) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    // Check if periodicSync exists in the registration
    // @ts-ignore - TypeScript may not know about periodicSync
    return registration && 'periodicSync' in registration;
  } catch (error) {
    console.error('Error checking periodic sync support:', error);
    return false;
  }
};

// Check if push notifications are supported
export const isPushNotificationSupported = (): boolean => {
  return isServiceWorkerSupported() && 'PushManager' in window;
};

/**
 * Request permission for push notifications
 * @returns Permission status: 'granted', 'denied', or 'default'
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications');
    return 'denied';
  }
  
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

/**
 * Register for push notifications
 * @param subscribeOptions Push subscription options
 * @returns PushSubscription or null if not supported/failed
 */
export const subscribeToPushNotifications = async (
  subscribeOptions = {
    userVisibleOnly: true,
    applicationServerKey: null // You'll need to provide your VAPID public key here
  }
): Promise<PushSubscription | null> => {
  if (!isPushNotificationSupported()) {
    console.error('Push notifications not supported in this browser');
    return null;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    
    // Send the subscription to your server
    // await sendSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
};

/**
 * Register a background sync task
 * @param syncTag Name of the sync task
 * @returns True if registered successfully
 */
export const registerBackgroundSync = async (syncTag: string): Promise<boolean> => {
  if (!isBackgroundSyncSupported()) {
    console.warn('Background sync not supported in this browser or requires HTTPS');
    return false;
  }

  try {
    // Wait for service worker registration to be ready
    const registration = await navigator.serviceWorker.ready;
    
    // Verify sync exists on the registration
    if (!registration.sync) {
      console.warn('SyncManager exists, but registration.sync is undefined');
      return false;
    }
    
    // Register the sync tag
    await registration.sync.register(syncTag);
    console.log(`Background sync registered successfully: ${syncTag}`);
    return true;
  } catch (error) {
    console.error('Error registering background sync:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
      syncTag
    });
    return false;
  }
};

/**
 * Register a periodic sync task
 * @param syncTag Name of the periodic sync task
 * @param minInterval Minimum interval in milliseconds (minimum 1 day)
 * @returns True if registered successfully
 */
export const registerPeriodicSync = async (
  syncTag: string,
  minInterval: number = 24 * 60 * 60 * 1000 // 1 day in milliseconds
): Promise<boolean> => {
  const isSupported = await isPeriodicSyncSupported();
  if (!isSupported) {
    console.warn('Periodic background sync not supported in this browser or requires HTTPS');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Verify periodicSync exists on the registration
    // @ts-ignore - TypeScript doesn't know about periodicSync yet
    if (!registration.periodicSync) {
      console.warn('PeriodicSync API seems to exist, but registration.periodicSync is undefined');
      return false;
    }
    
    // Check if permission is granted
    try {
      // @ts-ignore - TypeScript doesn't know about periodicSync yet
      const permission = await registration.periodicSync.getPermission();
      if (permission !== 'granted') {
        console.warn(`Periodic sync permission is ${permission}, not granted`);
      }
    } catch (permError) {
      // Some browsers might not support getPermission
      console.warn('Could not check periodic sync permission:', permError);
    }
    
    // Register the periodic sync
    // @ts-ignore - TypeScript doesn't know about periodicSync yet
    await registration.periodicSync.register(syncTag, {
      minInterval,
    });
    
    console.log(`Periodic sync registered successfully: ${syncTag}`);
    return true;
  } catch (error) {
    console.error('Error registering periodic sync:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
      syncTag,
      minInterval
    });
    return false;
  }
};

/**
 * Upload tarot deck to the server with background sync fallback
 * @param deckData The deck data to upload
 * @returns True if successful or queued for background sync
 */
export const uploadDeckWithBackgroundSync = async (deckData: any): Promise<boolean> => {
  // Try to upload directly first
  try {
    const response = await fetch('/api/upload-deck', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deckData),
    });
    
    if (response.ok) {
      return true;
    }
  } catch (error) {
    console.warn('Network error, will try background sync:', error);
  }
  
  // If direct upload fails, store data for background sync
  if (isBackgroundSyncSupported()) {
    try {
      // Store the request in IndexedDB for later sync
      const db = await openDatabase();
      await storeRequestForSync(db, 'upload-deck', deckData);
      
      // Register for background sync
      await registerBackgroundSync('tarotforge-outbox');
      return true;
    } catch (syncError) {
      console.error('Failed to set up background sync:', syncError);
      return false;
    }
  }
  
  return false;
};

/**
 * Register for daily tarot card updates via periodic sync
 */
export const registerDailyTarotUpdates = async (): Promise<boolean> => {
  return registerPeriodicSync('tarot-daily-update');
};

// Helper functions for IndexedDB
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tarotforge-sync', 1);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const storeRequestForSync = (
  db: IDBDatabase,
  url: string,
  data: any
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('outbox', 'readwrite');
    const store = transaction.objectStore('outbox');
    
    const request = store.add({
      url,
      data,
      timestamp: Date.now(),
    });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
