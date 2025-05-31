import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DoorOpen } from 'lucide-react';
import { Card as TarotCardType, User } from '../../../../types'; // Path to types, ensure User is exported here
// import { User } from '@supabase/supabase-js'; // Removed Supabase User type
import { SessionParticipant } from '../../../../stores/readingSessionStore'; // Path to store

interface ExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  user: User | null;
  selectedCards: TarotCardType[]; // Use the aliased TarotCardType
  participants: SessionParticipant[];
  isInCall: boolean;
  endCall: () => void;
}

const ExitModal: React.FC<ExitModalProps> = ({
  isOpen,
  onClose,
  isMobile,
  user,
  selectedCards,
  participants,
  isInCall,
  endCall,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className={`bg-card border border-border rounded-lg shadow-lg ${isMobile ? 'w-full max-w-sm' : 'w-full max-w-md'} p-6`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-destructive/10 rounded-full">
            <DoorOpen className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Exit Reading Room</h3>
            <p className="text-sm text-muted-foreground">Are you sure you want to leave?</p>
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          <p className="text-sm text-muted-foreground">
            {selectedCards.some((card: any) => card) ? (
              <>Your reading progress will be saved and you can return to this session later.</>
            ) : (
              <>You haven't started your reading yet. You can always come back to continue.</>
            )}
          </p>
          {participants.length > 1 && (
            <p className="text-sm text-muted-foreground">
              Other participants will remain in the session and can continue without you.
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Stay in Session
          </button>
          <Link
            to={user ? "/collection" : "/"}
            className="flex-1 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-center"
            onClick={() => {
              if (isInCall) {
                console.log('Ending video call before exiting reading room...');
                endCall();
              }
            }}
          >
            Exit Reading Room
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ExitModal; 