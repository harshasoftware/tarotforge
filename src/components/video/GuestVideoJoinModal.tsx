import React, { useState } from 'react';
import { Video, Mic, Users, X, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GuestVideoJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => Promise<void>;
  participantCount: number; // Should be videoCallParticipants.length (NOT +1, as this is only remote participants)
  hostName?: string;
  sessionInfo?: {
    layout?: string;
    question?: string;
    step?: string;
  };
}

const GuestVideoJoinModal: React.FC<GuestVideoJoinModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  participantCount,
  hostName,
  sessionInfo
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await onJoin();
      setPermissionsGranted(true);
    } catch (error) {
      console.error('Failed to join video call:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Video className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Join Video Call</h3>
                  <p className="text-sm text-muted-foreground">
                    Active video call in progress
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Session Info */}
            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Reading Session</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {sessionInfo?.layout && <div>Layout: {sessionInfo.layout}</div>}
                {sessionInfo?.question && <div>Question: "{sessionInfo.question}"</div>}
                {sessionInfo?.step && <div>Step: {sessionInfo.step}</div>}
                {hostName && <div>Host: {hostName}</div>}
              </div>
            </div>

            {/* Participants Info */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {/* participantCount is remote participants count, +1 for yourself when you join */}
                {participantCount + 1} {participantCount + 1 === 1 ? 'person' : 'people'} in video call
              </span>
            </div>

            {/* Permission Info */}
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">Camera & Microphone Access</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Mic className="h-3 w-3" />
                  <span>Microphone access for voice communication</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="h-3 w-3" />
                  <span>Camera access for video sharing</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Your browser will ask for permission when you join.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="flex-1 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Join Video Call
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuestVideoJoinModal; 