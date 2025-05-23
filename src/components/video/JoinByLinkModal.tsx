import { useState } from 'react';
import { XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVideoCall } from '../../context/VideoCallContext';

interface JoinByLinkModalProps {
  onClose: () => void;
  sessionId: string | null;
}

const JoinByLinkModal = ({ onClose, sessionId }: JoinByLinkModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { startCall, setError: setVideoCallError } = useVideoCall();
  
  const handleJoin = async () => {
    if (!sessionId) {
      setError('Invalid session ID');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setVideoCallError(null);
      
      // Join the session directly
      const result = await startCall('client', sessionId);
      if (result) {
        onClose();
      } else {
        setError('Failed to join session. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1003] p-4">
      <motion.div 
        className="relative bg-card max-w-md w-full rounded-xl overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
          <h3 className="font-serif font-bold">Join Reading Session</h3>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="mb-6 text-center">
            You're about to join a reading session.
          </p>
          
          {error && (
            <p className="text-sm text-destructive mb-4 text-center">{error}</p>
          )}
          
          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="btn btn-ghost border border-input px-4 py-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              className="btn btn-primary px-4 py-2 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                  Joining...
                </>
              ) : (
                <>
                  Join Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinByLinkModal;