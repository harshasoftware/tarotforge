import LogRocket from 'logrocket';
import { User } from '../types';
import { StripeProduct } from '../lib/stripe-config';

// Initialize LogRocket
export const initializeLogRocket = () => {
  const token = import.meta.env.VITE_LOGROCKET_APP_ID;
  
  if (token) {
    LogRocket.init(token, {
      console: {
        shouldAggregateConsoleErrors: true,
        isEnabled: {
          error: true,
          warn: true,
          info: false, // Only capture errors and warnings
          debug: false,
          log: false
        }
      },
      network: {
        requestSanitizer: (request) => {
          // Don't record auth requests
          if (request.url.includes('/auth/') || request.url.includes('/login')) {
            // Remove sensitive information from auth requests
            request.headers['Authorization'] = '[REDACTED]';
            if (request.body) {
              try {
                const body = JSON.parse(request.body);
                if (body.password) body.password = '[REDACTED]';
                if (body.email) body.email = '[REDACTED]';
                request.body = JSON.stringify(body);
              } catch (e) {
                // If parsing fails, sanitize the whole body
                request.body = '[REDACTED]';
              }
            }
          }
          return request;
        },
        responseSanitizer: (response) => {
          // Don't record auth responses
          if (response.url.includes('/auth/') || response.url.includes('/login')) {
            // Sanitize auth responses
            if (response.body) {
              try {
                const body = JSON.parse(response.body);
                if (body.access_token) body.access_token = '[REDACTED]';
                if (body.refresh_token) body.refresh_token = '[REDACTED]';
                response.body = JSON.stringify(body);
              } catch (e) {
                // If parsing fails, sanitize the whole body
                response.body = '[REDACTED]';
              }
            }
          }
          return response;
        },
      },
      release: `${import.meta.env.VITE_APP_VERSION || '0.1.0'}`
    });
    
    console.log('LogRocket initialized');
  }
};

// Identify user in LogRocket
export const identifyUser = (
  user: User | null, 
  subscription?: {
    status: string;
    type: string;
    price_id?: string;
  },
  credits?: {
    basicCredits: number;
    premiumCredits: number;
    plan: string;
  }
) => {
  if (!user) {
    // Clear identity when user is null
    LogRocket.identify('');
    return;
  }
  
  try {
    // Prepare user data for identification
    const userData: Record<string, any> = {
      name: user.username || user.full_name || user.email.split('@')[0],
      email: user.email,
      id: user.id,
      createdAt: user.created_at,
      isCreator: user.is_creator || false,
      isReader: user.is_reader || false,
    };
    
    // Add subscription data if available
    if (subscription) {
      userData.subscriptionStatus = subscription.status;
      userData.subscriptionType = subscription.type;
      userData.subscriptionPriceId = subscription.price_id;
    }
    
    // Add credit information if available
    if (credits) {
      userData.basicCredits = credits.basicCredits;
      userData.premiumCredits = credits.premiumCredits;
      userData.planTier = credits.plan;
    }
    
    // Add reader level info if the user is a reader
    if (user.is_reader && user.level_id) {
      userData.readerLevelId = user.level_id;
      if (user.readerLevel) {
        userData.readerLevelName = user.readerLevel.name;
        userData.readerLevelRank = user.readerLevel.rank_order;
      }
    }
    
    // Identify the user in LogRocket
    LogRocket.identify(user.id, userData);
    
    console.log('User identified in LogRocket', { userId: user.id });
  } catch (error) {
    console.error('Error identifying user in LogRocket:', error);
  }
};

// Update subscription data in LogRocket
export const updateSubscriptionData = (
  userId: string, 
  subscription: { 
    status: string; 
    type: string; 
    price_id?: string;
  }
) => {
  if (!userId) return;
  
  try {
    LogRocket.identify(userId, {
      subscriptionStatus: subscription.status,
      subscriptionType: subscription.type,
      subscriptionPriceId: subscription.price_id,
      subscriptionUpdatedAt: new Date().toISOString()
    });
    
    console.log('Subscription data updated in LogRocket', { userId });
  } catch (error) {
    console.error('Error updating subscription data in LogRocket:', error);
  }
};

// Update credit data in LogRocket
export const updateCreditData = (
  userId: string,
  credits: {
    basicCredits: number;
    premiumCredits: number;
    plan: string;
  }
) => {
  if (!userId) return;
  
  try {
    LogRocket.identify(userId, {
      basicCredits: credits.basicCredits,
      premiumCredits: credits.premiumCredits,
      planTier: credits.plan,
      creditUpdatedAt: new Date().toISOString()
    });
    
    console.log('Credit data updated in LogRocket', { userId });
  } catch (error) {
    console.error('Error updating credit data in LogRocket:', error);
  }
};

// Track specific errors
export const trackError = (error: Error, context?: Record<string, any>) => {
  // Add context to console for local debugging
  console.error('Error tracked:', error, context);
  
  // Log to LogRocket
  LogRocket.captureException(error, {
    tags: {
      errorContext: context ? JSON.stringify(context) : 'unknown'
    }
  });
};

// Get plan name from price ID
export const getPlanNameFromPriceId = (priceId?: string): string => {
  if (!priceId) return 'free';
  
  // Find which product the price ID belongs to
  for (const [key, product] of Object.entries(StripeProduct)) {
    if (product.priceId === priceId) {
      // Extract the plan name (mystic, creator, visionary)
      return key.split('-')[0]; 
    }
  }
  
  return 'free';
};