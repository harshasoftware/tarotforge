import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserMinus, X } from 'lucide-react';

interface ParticipantNotificationProps {
  type: 'join' | 'leave';
  participantName: string;
  isAnonymous: boolean;
  onClose: () => void;
  autoCloseDelay?: number;
}

const ParticipantNotification: React.FC<ParticipantNotificationProps> = ({
  type,
  participantName,
  isAnonymous,
  onClose,
  autoCloseDelay = 4000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [autoCloseDelay, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getIcon = () => {
    return type === 'join' ? (
      <UserPlus className="h-5 w-5 text-green-500" />
    ) : (
      <UserMinus className="h-5 w-5 text-orange-500" />
    );
  };

  const getMessage = () => {
    const action = type === 'join' ? 'joined' : 'left';
    const userType = isAnonymous ? 'Guest' : 'User';
    return `${userType} "${participantName}" ${action} the session`;
  };

  const getBorderColor = () => {
    return type === 'join' ? 'border-green-500/30' : 'border-orange-500/30';
  };

  const getBackgroundColor = () => {
    return type === 'join' ? 'bg-green-500/10' : 'bg-orange-500/10';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className={`
            bg-card/95 backdrop-blur-sm border ${getBorderColor()} rounded-lg shadow-lg
            ${getBackgroundColor()}
            p-4 flex items-center gap-3
          `}>
            {/* Icon */}
            <div className="flex-shrink-0">
              {getIcon()}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {getMessage()}
              </p>
              {isAnonymous && (
                <p className="text-xs text-muted-foreground mt-1">
                  Anonymous participant
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors"
              aria-label="Close notification"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ParticipantNotification; 