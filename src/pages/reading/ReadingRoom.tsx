import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle, Copy, Check } from 'lucide-react';

const ReadingRoom = () => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [roomId, setRoomId] = useState('');

  const generateShareableLink = (id: string) => {
    return `${window.location.origin}/reading-room/${id}`;
  };

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(generateShareableLink(roomId));
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="relative">
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShareModal(false)}
        >
          <motion.div
            className="relative bg-card max-w-md w-full rounded-xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Share Reading Room</h3>
                <button onClick={() => setShowShareModal(false)}>
                  <XCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={generateShareableLink(roomId)}
                    readOnly
                    className="bg-transparent border-none w-full focus:outline-none text-sm"
                  />
                  <button 
                    onClick={copyRoomLink}
                    className="ml-2 p-2 hover:bg-muted rounded-md"
                  >
                    {showCopied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Share this link with others to invite them to your reading room. They'll be able to join the video call and participate in the reading.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ReadingRoom;