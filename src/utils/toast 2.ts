import toast from 'react-hot-toast';

// Success toast
export const showSuccess = (message: string) => {
  return toast.success(message);
};

// Error toast
export const showError = (message: string) => {
  return toast.error(message);
};

// Loading toast
export const showLoading = (message: string) => {
  return toast.loading(message);
};

// Custom toast
export const showToast = (message: string) => {
  return toast(message);
};

// Promise toast - automatically handles loading, success, and error states
export const showPromiseToast = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return toast.promise(promise, messages);
};

// Dismiss a specific toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Collaborative action toasts with user attribution
export const showCollaborativeAction = (
  action: string,
  userName: string,
  isCurrentUser: boolean = false
) => {
  const message = isCurrentUser 
    ? `You ${action}`
    : `${userName} ${action}`;
    
  return toast(message, {
    icon: '👥',
    duration: 3000,
    style: {
      background: '#3b82f6',
      color: '#ffffff',
    },
  });
};

// Permission denied toast
export const showPermissionDenied = (action: string) => {
  return toast.error(`You don't have permission to ${action}`, {
    duration: 3000,
  });
};

// Connection status toasts
export const showConnectionLost = () => {
  return toast.error('Connection lost. Trying to reconnect...', {
    id: 'connection-lost',
    duration: Infinity,
  });
};

export const showConnectionRestored = () => {
  toast.dismiss('connection-lost');
  return toast.success('Connection restored!', {
    duration: 2000,
  });
};

// Command processing toasts
export const showCommandProcessing = (action: string) => {
  return toast.loading(`Processing ${action}...`, {
    duration: 2000,
  });
};

export const showCommandSuccess = (action: string) => {
  return toast.success(`${action} completed successfully`, {
    duration: 2000,
  });
};

export const showCommandError = (action: string, error?: string) => {
  const message = error 
    ? `Failed to ${action}: ${error}`
    : `Failed to ${action}. Please try again.`;
    
  return toast.error(message, {
    duration: 4000,
  });
}; 