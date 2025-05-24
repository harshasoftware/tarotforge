import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (roomId: string, content: string) => Promise<boolean>;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  currentRoomId: string | null;
  loading: boolean;
  error: string | null;
}

const ChatContext = createContext<ChatContextType>({
  messages: [],
  sendMessage: async () => false,
  joinRoom: () => {},
  leaveRoom: () => {},
  currentRoomId: null,
  loading: false,
  error: null,
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<any>(null);

  // Join a chat room
  const joinRoom = useCallback((roomId: string) => {
    if (!roomId) {
      setError('Room ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentRoomId(roomId);

    // Create and subscribe to the channel
    const newChannel = supabase.channel(`chat:${roomId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    newChannel
      .on('broadcast', { event: 'message' }, (payload) => {
        const newMessage = payload.payload as ChatMessage;
        setMessages((prev) => [...prev, newMessage]);
        console.log('Received message:', newMessage);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to chat:${roomId}`);
          setChannel(newChannel);
          setLoading(false);
          
          // Add system message
          const systemMessage: ChatMessage = {
            id: uuidv4(),
            room_id: roomId,
            user_id: 'system',
            username: 'System',
            content: 'You have joined the chat room',
            created_at: new Date().toISOString(),
          };

          setMessages([systemMessage]);
          console.log('Added system message:', systemMessage);
        } else if (status === 'CHANNEL_ERROR') {
          setError('Failed to join chat room');
          setLoading(false);
        }
      });

    // Fetch previous messages
    fetchMessages(roomId);
  }, []);

  // Leave the current chat room
  const leaveRoom = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
    }
    setCurrentRoomId(null);
    setMessages([]);
  }, [channel]);

  // Fetch previous messages for a room
  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        throw error;
      }

      if (data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load chat history');
    }
  }, []);

  // Send a message to the current room
  const sendMessage = useCallback(async (roomId: string, content: string): Promise<boolean> => {
    if (!user || !content.trim() || !roomId) {
      return false;
    }

    try {
      // Create message object
      const newMessage: Omit<ChatMessage, 'id' | 'created_at'> & { id?: string, created_at?: string } = {
        room_id: roomId,
        user_id: user.id,
        username: user.username || user.email.split('@')[0],
        content: content.trim(),
      };

      // Insert into database
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([newMessage])
        .select()
        .single();

      if (error) {
        console.error('Error saving message:', error);
        setError('Failed to send message');
        return false;
      }

      // Broadcast to channel
      if (channel) {
        channel.send({
          type: "broadcast",
          event: "message",
          payload: data
        });
        console.log('Sent message to channel:', data);
      }

      // Add to local state (for the sender)
      setMessages((prev) => [...prev, data as ChatMessage]);
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return false;
    }
  }, [user, channel]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channel]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        joinRoom,
        leaveRoom,
        currentRoomId,
        loading,
        error,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};