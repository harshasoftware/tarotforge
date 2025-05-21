import * as Sentry from "@sentry/react";
import { Transaction } from "@sentry/tracing";

// Error types for Google Sign-In
export enum GoogleSignInErrorType {
  SCRIPT_LOAD_FAILED = 'SCRIPT_LOAD_FAILED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  FEDCM_NOT_SUPPORTED = 'FEDCM_NOT_SUPPORTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  USER_CANCELLED = 'USER_CANCELLED',
  CREDENTIALS_UNAVAILABLE = 'CREDENTIALS_UNAVAILABLE',
  LOCK_ACQUISITION_FAILED = 'LOCK_ACQUISITION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// App-wide error types
export enum AppErrorType {
  ROUTE_ERROR = 'ROUTE_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  API_ERROR = 'API_ERROR',
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  STATE_ERROR = 'STATE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Error messages for different error types
export const ERROR_MESSAGES = {
  // Google Sign-In errors
  [GoogleSignInErrorType.SCRIPT_LOAD_FAILED]: 'Failed to load Google Sign-In script. Please check your internet connection and try again.',
  [GoogleSignInErrorType.INITIALIZATION_FAILED]: 'Failed to initialize Google Sign-In. Please refresh the page and try again.',
  [GoogleSignInErrorType.FEDCM_NOT_SUPPORTED]: 'Your browser does not support the latest sign-in features. Please try using a different browser.',
  [GoogleSignInErrorType.NETWORK_ERROR]: 'Network error occurred. Please check your internet connection and try again.',
  [GoogleSignInErrorType.POPUP_BLOCKED]: 'Popup was blocked by your browser. Please allow popups for this site and try again.',
  [GoogleSignInErrorType.USER_CANCELLED]: 'Sign-in was cancelled. You can try again when you\'re ready.',
  [GoogleSignInErrorType.CREDENTIALS_UNAVAILABLE]: 'Google Sign-In is not available. Please try using the manual sign-in option.',
  [GoogleSignInErrorType.LOCK_ACQUISITION_FAILED]: 'Unable to start sign-in process. Please try again in a moment.',
  [GoogleSignInErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again or use the manual sign-in option.',

  // App-wide errors
  [AppErrorType.ROUTE_ERROR]: 'Failed to load the requested page. Please try again or navigate to a different page.',
  [AppErrorType.AUTH_ERROR]: 'Authentication error occurred. Please try signing in again.',
  [AppErrorType.API_ERROR]: 'Failed to communicate with the server. Please try again later.',
  [AppErrorType.COMPONENT_ERROR]: 'An error occurred while loading this component. Please refresh the page.',
  [AppErrorType.NETWORK_ERROR]: 'Network error occurred. Please check your internet connection.',
  [AppErrorType.STATE_ERROR]: 'Application state error occurred. Please refresh the page.',
  [AppErrorType.VALIDATION_ERROR]: 'Invalid input detected. Please check your input and try again.',
  [AppErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again or contact support.'
};

// Error tracking with Sentry
export const trackError = (
  error: Error,
  type: GoogleSignInErrorType | AppErrorType,
  context?: Record<string, any>
) => {
  // Add error type to the error object
  const enhancedError = new Error(error.message);
  enhancedError.name = type;

  // Set Sentry tags
  Sentry.setTag('error.type', type);
  Sentry.setTag('error.source', type in GoogleSignInErrorType ? 'google-sign-in' : 'app');

  // Add context if provided
  if (context) {
    Sentry.setContext('error.context', context);
  }

  // Get LogRocket session URL and add to Sentry error - removed direct LogRocket usage

  // Capture the error
  Sentry.captureException(enhancedError);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error] ${type}:`, error);
    if (context) {
      console.error('Error Context:', context);
    }
  }
};

// Performance monitoring
export const startPerformanceSpan = (name: string, op: string): Transaction => {
  const transaction = Sentry.startTransaction({
    name,
    op,
  });
  return transaction;
};

// User action tracking
export const trackUserAction = (action: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: action,
    level: 'info',
    data,
  });

  // Also track in LogRocket - removed direct LogRocket usage
};

// API call tracking
export const trackApiCall = (endpoint: string, method: string, status?: number) => {
  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: status && status >= 400 ? 'error' : 'info',
    data: { endpoint, method, status },
  });
};

// Route change tracking
export const trackRouteChange = (from: string, to: string) => {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Route changed from ${from} to ${to}`,
    level: 'info',
    data: { from, to },
  });
};

// Determine if an error is retryable
export const isRetryableError = (type: GoogleSignInErrorType | AppErrorType): boolean => {
  const retryableErrors = [
    GoogleSignInErrorType.SCRIPT_LOAD_FAILED,
    GoogleSignInErrorType.NETWORK_ERROR,
    GoogleSignInErrorType.LOCK_ACQUISITION_FAILED,
    AppErrorType.NETWORK_ERROR,
    AppErrorType.API_ERROR
  ];
  return retryableErrors.includes(type as any);
};

// Get retry delay based on error type
export const getRetryDelay = (type: GoogleSignInErrorType | AppErrorType): number => {
  switch (type) {
    case AppErrorType.NETWORK_ERROR:
      return 2000; // 2 seconds
    case GoogleSignInErrorType.NETWORK_ERROR:
      return 3000; // 3 seconds
    case GoogleSignInErrorType.LOCK_ACQUISITION_FAILED:
      return 1000; // 1 second
    case AppErrorType.API_ERROR:
      return 1500; // 1.5 seconds
    default:
      return 0;
  }
};

// Get user-friendly error message
export const getUserFriendlyMessage = (type: GoogleSignInErrorType | AppErrorType): string => {
  return ERROR_MESSAGES[type] || ERROR_MESSAGES[AppErrorType.UNKNOWN_ERROR];
};

// Set user context in Sentry and LogRocket
export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Set user in LogRocket as well - removed direct LogRocket usage
};

// Clear user context in Sentry and LogRocket
export const clearUserContext = () => {
  Sentry.setUser(null);
  // Clear LogRocket identity - removed direct LogRocket usage
};