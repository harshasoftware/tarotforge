import React from 'react';
import { motion } from 'framer-motion';
import { Users, AlertCircle } from 'lucide-react';

interface RoomFullMessageProps {
  maxParticipants: number;
  onClose: () => void;
}

/**
 * Component to display when a room is full
 */
const RoomFullMessage: React.FC<RoomFullMessageProps> = ({
  maxParticipants,
  onClose
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-card rounded-xl overflow-hidden max-w-md w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-warning" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2">Room is Full</h2>
          <p className="text-muted-foreground mb-6">
            This reading room has reached its maximum capacity of {maxParticipants} participants. 
            Please try again later or create your own reading room.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onClose}
              className="btn btn-primary py-2 px-6"
            >
              Return to Reading Room
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RoomFullMessage;