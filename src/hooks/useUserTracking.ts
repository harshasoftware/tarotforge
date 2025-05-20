import { useCallback } from 'react';
import { trackUserAction } from '../utils/errorTracking';

interface TrackingOptions {
  category?: string;
  data?: Record<string, any>;
}

export function useUserTracking() {
  const trackAction = useCallback((action: string, options: TrackingOptions = {}) => {
    const { category = 'user-action', data } = options;
    trackUserAction(action, {
      category,
      ...data,
    });
  }, []);

  const trackPageView = useCallback((pageName: string, data?: Record<string, any>) => {
    trackAction(`Viewed ${pageName}`, {
      category: 'page-view',
      data: {
        page: pageName,
        ...data,
      },
    });
  }, [trackAction]);

  const trackButtonClick = useCallback((buttonName: string, data?: Record<string, any>) => {
    trackAction(`Clicked ${buttonName}`, {
      category: 'button-click',
      data: {
        button: buttonName,
        ...data,
      },
    });
  }, [trackAction]);

  const trackFormSubmit = useCallback((formName: string, data?: Record<string, any>) => {
    trackAction(`Submitted ${formName}`, {
      category: 'form-submit',
      data: {
        form: formName,
        ...data,
      },
    });
  }, [trackAction]);

  const trackError = useCallback((errorName: string, data?: Record<string, any>) => {
    trackAction(`Encountered ${errorName}`, {
      category: 'user-error',
      data: {
        error: errorName,
        ...data,
      },
    });
  }, [trackAction]);

  return {
    trackAction,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackError,
  };
}

// Example usage:
/*
const { trackPageView, trackButtonClick } = useUserTracking();

// In your component:
useEffect(() => {
  trackPageView('Home Page', { referrer: document.referrer });
}, []);

const handleClick = () => {
  trackButtonClick('Sign Up', { location: 'header' });
  // Handle click
};
*/ 