import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Video, Share2 } from 'lucide-react';
import { ReadingLayout } from '../../../../types';
import { SessionParticipant } from '../../../../stores/readingSessionStore';

interface InviteDropdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  // Contextual info for the modal display
  selectedLayoutName: string | undefined;
  currentQuestion: string;
  participantsCount: number;
  isVideoChatActive: boolean; 
  readingStep: 'setup' | 'ask-question' | 'drawing' | 'interpretation';
  // Video call actions
  isVideoConnecting: boolean;
  startVideoCallAction: () => Promise<void>; // Renamed for clarity
  // Share action
  openShareModalAction: () => void; // Renamed for clarity
}

const InviteDropdownModal: React.FC<InviteDropdownModalProps> = ({
  isOpen,
  onClose,
  isMobile,
  selectedLayoutName,
  currentQuestion,
  participantsCount,
  isVideoChatActive,
  readingStep,
  isVideoConnecting,
  startVideoCallAction,
  openShareModalAction,
}) => {
  if (!isOpen) return null;

  const canStartVideo = readingStep === 'drawing' || readingStep === 'interpretation';

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
          <div className="p-2 bg-primary/10 rounded-full">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Invite Others</h3>
            <p className="text-sm text-muted-foreground">
              Choose how to invite people to your reading
            </p>
          </div>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isVideoChatActive ? 'bg-green-500' : 'bg-slate-400'}`} />
            <span className="text-sm font-medium">Active Session</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Layout: {selectedLayoutName || 'Custom'}</div>
            {currentQuestion && <div>Question: "{currentQuestion}"</div>}
            <div>Step: {readingStep}</div>
            {participantsCount > 0 && (
              <div>Participants: {participantsCount + 1} people</div>
            )}
            {isVideoChatActive && (
              <div className="text-green-600">✓ Video chat active</div>
            )}
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          {canStartVideo && (
            <button
              onClick={async () => {
                await startVideoCallAction();
                // Assuming startVideoCallAction updates isVideoChatActive, then open share
                onClose(); // Close this dropdown
                openShareModalAction(); // Open the main share modal
              }}
              disabled={isVideoConnecting}
              className="w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Video className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {isVideoChatActive ? 'Share with Video Chat' : 'Start Video Chat & Share'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isVideoChatActive 
                      ? 'Video chat is active. Share link with video enabled.'
                      : 'Start video call and share invitation link'
                    }
                  </div>
                </div>
                {isVideoConnecting && (
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </button>
          )}
          
          <button
            onClick={() => {
              onClose(); // Close this dropdown
              openShareModalAction(); // Open the main share modal
            }}
            className="w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Share2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Share Reading Room Link Only</div>
                <div className="text-sm text-muted-foreground">
                  Share invitation link (video chat will not auto-start for new invitees)
                </div>
              </div>
            </div>
          </button>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InviteDropdownModal; 