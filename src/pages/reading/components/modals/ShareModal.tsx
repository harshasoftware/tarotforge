import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Copy, Check } from 'lucide-react';
import Tooltip from '../../../../components/ui/Tooltip'; // Adjust path as needed

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null; // Can be null if session is not ready
  isMobile: boolean; // For Tooltip disabling
  // For copy functionality
  showCopied: boolean;
  setShowCopied: (copied: boolean) => void;
  generateShareableLink: (sessionId: string) => string;
  copyRoomLinkHelper: (sessionId: string | undefined, setShowCopied: (copied: boolean) => void, generator: (id: string) => string) => void;
  // For additional context text
  participantsCount: number;
  isVideoChatActive: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  isMobile,
  showCopied,
  setShowCopied,
  generateShareableLink,
  copyRoomLinkHelper,
  participantsCount,
  isVideoChatActive,
}) => {
  if (!isOpen || !sessionId) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            className="relative bg-card max-w-md w-full rounded-xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
              <h3 className="font-serif font-bold">Share Reading Room</h3>
              <Tooltip content="Close share modal" position="left" disabled={isMobile}>
                <button 
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
            
            <div className="p-6">
              <p className="mb-4 text-sm md:text-base">
                Share this link with others to invite them to your reading room{isVideoChatActive ? ' with video chat' : ''}. 
                {participantsCount > 0 && ` Currently ${participantsCount} participants are connected.`}
                {isVideoChatActive && <span className="block text-xs text-primary mt-1">Video chat is now active!</span>}
              </p>
              
              <div className="mb-6">
                <label htmlFor="roomLink" className="block text-sm font-medium mb-2">
                  Room Invitation Link
                </label>
                <div className="flex">
                  <input
                    id="roomLink"
                    type="text"
                    value={sessionId ? generateShareableLink(sessionId) : ''}
                    readOnly
                    className="flex-1 p-2 text-sm rounded-l-md border border-r-0 border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Tooltip content={showCopied ? "Link copied!" : "Copy link to clipboard"} position="top" disabled={isMobile}>
                    <button
                      onClick={() => copyRoomLinkHelper(sessionId, setShowCopied, generateShareableLink)}
                      className="p-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 transition-colors flex items-center"
                    >
                      {showCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </Tooltip>
                </div>
                {showCopied && (
                  <p className="text-xs text-success mt-2">Link copied to clipboard!</p>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="btn btn-primary px-4 py-2"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareModal; 