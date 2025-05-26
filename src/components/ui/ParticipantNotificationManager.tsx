import React, { useState, useCallback } from 'react';
import ParticipantNotification from './ParticipantNotification';

interface NotificationData {
  id: string;
  type: 'join' | 'leave' | 'deck-cleared';
  participantName: string;
  isAnonymous: boolean;
  timestamp: number;
}

interface ParticipantNotificationManagerProps {
  notifications: NotificationData[];
  onRemoveNotification: (id: string) => void;
}

const ParticipantNotificationManager: React.FC<ParticipantNotificationManagerProps> = ({
  notifications,
  onRemoveNotification
}) => {
  const handleCloseNotification = useCallback((id: string) => {
    onRemoveNotification(id);
  }, [onRemoveNotification]);

  return (
    <div className="fixed top-4 right-4 z-[200] space-y-2 pointer-events-none">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 80}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <ParticipantNotification
            type={notification.type}
            participantName={notification.participantName}
            isAnonymous={notification.isAnonymous}
            onClose={() => handleCloseNotification(notification.id)}
            autoCloseDelay={4000}
          />
        </div>
      ))}
    </div>
  );
};

export default ParticipantNotificationManager; 