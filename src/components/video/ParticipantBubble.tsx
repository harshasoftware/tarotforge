import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface ParticipantBubbleProps {
  username: string;
  isHost?: boolean;
  isCurrentUser?: boolean;
  avatarUrl?: string;
}

/**
 * A small bubble showing a participant in the video call
 */
const ParticipantBubble: React.FC<ParticipantBubbleProps> = ({
  username,
  isHost = false,
  isCurrentUser = false,
  avatarUrl
}) => {
  return (
    <motion.div
      className="flex items-center bg-card/80 backdrop-blur-sm border border-border rounded-full px-2 py-1 shadow-md"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-1.5">
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="w-full h-full rounded-full object-cover" />
        ) : (
          <User className="h-3 w-3 text-primary" />
        )}
      </div>
      <span className="text-xs font-medium truncate max-w-[80px]">
        {username}
        {isCurrentUser && " (You)"}
      </span>
      {isHost && (
        <span className="ml-1 w-2 h-2 bg-primary rounded-full"></span>
      )}
    </motion.div>
  );
};

export default ParticipantBubble;