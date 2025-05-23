import React from 'react';
import { motion } from 'framer-motion';

interface ChatBubbleProps {
  sender: string;
  content: string;
  isCurrentUser: boolean;
  isSystem?: boolean;
  timestamp: Date;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  sender,
  content,
  isCurrentUser,
  isSystem = false,
  timestamp
}) => {
  // Format time as HH:MM
  const formattedTime = timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="chat-bubble system"
      >
        <p className="text-xs">{content}</p>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: isCurrentUser ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`chat-bubble ${isCurrentUser ? 'sent' : 'received'}`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-medium text-xs">
          {isCurrentUser ? 'You' : sender}
        </span>
        <span className="text-xs text-muted-foreground ml-2">
          {formattedTime}
        </span>
      </div>
      <p className="break-words">{content}</p>
    </motion.div>
  );
};

export default ChatBubble;