import toast from 'react-hot-toast';
import { UserPlus, UserMinus, RotateCcw } from 'lucide-react';
import { createElement } from 'react';

export interface NotificationData {
  type: 'join' | 'leave' | 'deck-cleared';
  participantName: string;
  isAnonymous: boolean;
}

// Helper function to get the appropriate icon for notification type
const getNotificationIcon = (type: NotificationData['type']) => {
  switch (type) {
    case 'join':
      return UserPlus;
    case 'leave':
      return UserMinus;
    case 'deck-cleared':
      return RotateCcw;
    default:
      return UserPlus;
  }
};

// Helper function to get the message for notification
const getNotificationMessage = (data: NotificationData) => {
  const userType = data.isAnonymous ? 'Guest' : 'User';
  
  switch (data.type) {
    case 'join':
      return `${userType} "${data.participantName}" joined the session`;
    case 'leave':
      return `${userType} "${data.participantName}" left the session`;
    case 'deck-cleared':
      return `${userType} "${data.participantName}" cleared the deck`;
    default:
      return `${userType} "${data.participantName}" joined the session`;
  }
};

// Show participant notification using react-hot-toast
export const showParticipantNotification = (data: NotificationData) => {
  const message = getNotificationMessage(data);
  const Icon = getNotificationIcon(data.type);
  
  const toastContent = createElement('div', {
    className: 'flex items-center gap-3'
  }, [
    createElement(Icon, {
      key: 'icon',
      className: `h-5 w-5 ${
        data.type === 'join' ? 'text-green-500' : 
        data.type === 'leave' ? 'text-orange-500' : 
        'text-blue-500'
      }`
    }),
    createElement('div', {
      key: 'content',
      className: 'flex-1'
    }, [
      createElement('p', {
        key: 'message',
        className: 'text-sm font-medium'
      }, message),
      data.isAnonymous && createElement('p', {
        key: 'anonymous',
        className: 'text-xs opacity-75 mt-1'
      }, 'Anonymous participant')
    ])
  ]);

  // Use different toast styles based on notification type
  if (data.type === 'join') {
    toast.success(toastContent, {
      style: {
        background: 'hsl(var(--card))',
        color: 'hsl(var(--foreground))',
        border: '1px solid rgb(34 197 94 / 0.3)',
        backgroundColor: 'rgb(34 197 94 / 0.1)',
      }
    });
  } else if (data.type === 'leave') {
    toast(toastContent, {
      icon: '👋',
      style: {
        background: 'hsl(var(--card))',
        color: 'hsl(var(--foreground))',
        border: '1px solid rgb(249 115 22 / 0.3)',
        backgroundColor: 'rgb(249 115 22 / 0.1)',
      }
    });
  } else {
    toast(toastContent, {
      icon: '🔄',
      style: {
        background: 'hsl(var(--card))',
        color: 'hsl(var(--foreground))',
        border: '1px solid rgb(59 130 246 / 0.3)',
        backgroundColor: 'rgb(59 130 246 / 0.1)',
      }
    });
  }
};

// General toast helpers
export const showSuccessToast = (message: string) => {
  toast.success(message);
};

export const showErrorToast = (message: string) => {
  toast.error(message);
};

export const showInfoToast = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
  });
};

export const showLoadingToast = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
}; 