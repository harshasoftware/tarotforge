import { useState, useCallback } from 'react';
import { trackError, trackApiCall, AppErrorType } from '../utils/errorTracking';

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

interface ApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  trackErrors?: boolean;
}

export function useApi<T = any>() {
  const [state, setState] = useState<ApiResponse<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(async (
    url: string,
    options: RequestInit = {},
    apiOptions: ApiOptions = {}
  ) => {
    const { onSuccess, onError, trackErrors = true } = apiOptions;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Track API call
      trackApiCall(url, options.method || 'GET', response.status);

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        if (trackErrors) {
          trackError(error, AppErrorType.API_ERROR, {
            url,
            method: options.method || 'GET',
            status: response.status,
            statusText: response.statusText,
          });
        }
        throw error;
      }

      const data = await response.json();
      setState({ data, error: null, loading: false });
      onSuccess?.(data);
      return data;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error('Unknown error occurred');
      setState({ data: null, error: apiError, loading: false });
      onError?.(apiError);
      throw apiError;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Example usage:
/*
const { data, error, loading, execute } = useApi<User>();

// In your component:
const handleSubmit = async () => {
  try {
    const result = await execute('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    // Handle success
  } catch (error) {
    // Error is already tracked and state is updated
  }
};
*/ 