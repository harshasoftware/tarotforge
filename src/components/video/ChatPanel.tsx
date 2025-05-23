import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Minimize2, Maximize2, MessageSquare } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import ChatBubble from './ChatBubble';

interface ChatPanelProps {
  roomId: string;
  isVisible: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onMinimize: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  roomId,
  isVisible,
  isMinimized,
  position,
  onClose,
  onMinimize,
  onPositionChange,
  onDragStart,
  onDragEnd
}) => {
  const { messages, sendMessage, joinRoom, leaveRoom, loading, error } = useChat();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Join the chat room when component mounts
  useEffect(() => {
    if (roomId && isVisible) {
      joinRoom(roomId);
    }
    
    return () => {
      leaveRoom();
    };
  }, [roomId, isVisible, joinRoom, leaveRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Send message handler
  const handleSendMessage = async () => {
    if (message.trim() && roomId) {
      const success = await sendMessage(roomId, message);
      if (success) {
        setMessage('');
      }
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    onDragStart();
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed bg-card/95 backdrop-blur-sm border border-border rounded-lg overflow-hidden shadow-lg z-[998]"
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{ left: 0, right: window.innerWidth - 300, top: 0, bottom: window.innerHeight - 300 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={{
        x: position.x,
        y: position.y,
        width: isMinimized ? 200 : 300,
        height: isMinimized ? 40 : 300,
        scale: isDragging ? 1.02 : 1
      }}
      transition={{ duration: 0.3 }}
      style={{ 
        position: 'fixed',
        left: 0,
        top: 0
      }}
      onDrag={(e, info) => onPositionChange(info.point)}
    >
      <div className="p-2 border-b border-border flex items-center justify-between cursor-move"
           onDoubleClick={onMinimize}>
        <div className="flex items-center">
          <MessageSquare className="h-4 w-4 text-primary mr-1" />
          <h3 className="text-sm font-medium">Chat</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={onMinimize}
            className="p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="p-2 flex flex-col h-[calc(100%-40px)]">
          <div className="flex-grow overflow-y-auto mb-2 text-sm p-2 bg-background/50 rounded-lg scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    sender={msg.username}
                    content={msg.content}
                    isCurrentUser={msg.user_id === user?.id}
                    isSystem={msg.user_id === 'system'}
                    timestamp={new Date(msg.created_at)}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input 
              type="text" 
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full p-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button 
              onClick={handleSendMessage}
              className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              disabled={!message.trim()}
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ChatPanel;