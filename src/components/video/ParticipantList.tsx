import React from 'react';
import { Users, Crown, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Participant {
  user_id: string;
  username: string;
  online_at: string;
  avatar_url?: string;
}

interface ParticipantListProps {
  participants: Participant[];
  isHost: boolean;
  currentUserId: string;
  maxParticipants: number;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ 
  participants, 
  isHost,
  currentUserId,
  maxParticipants
}) => {
  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="bg-card/60 border border-border rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Users className="h-4 w-4 text-primary mr-2" />
          <h3 className="text-sm font-medium">Session Participants</h3>
        </div>
        <span className="text-xs bg-muted/30 px-2 py-0.5 rounded-full">
          {participants.length}/{maxParticipants}
        </span>
      </div>
      
      <AnimatePresence>
        <div className="space-y-2">
          {participants.map((participant) => (
            <motion.div 
              key={participant.user_id}
              className="flex items-center justify-between text-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                  {participant.avatar_url ? (
                    <img 
                      src={participant.avatar_url} 
                      alt={participant.username} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-3 w-3 text-primary" />
                  )}
                </div>
                <span>
                  {participant.username}
                  {participant.user_id === currentUserId && " (You)"}
                </span>
              </div>
              
              {(isHost && participant.user_id === currentUserId) && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center">
                  <Crown className="h-3 w-3 mr-1" />
                  Host
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
};

export default ParticipantList;