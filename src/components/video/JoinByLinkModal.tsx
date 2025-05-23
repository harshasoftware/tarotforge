import { useState } from 'react';
import { XCircle, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVideoCall } from '../../context/VideoCallContext';

interface JoinByLinkModalProps {
  onClose: () => void;
  onJoinSuccess: () => void;
}

const JoinByLinkModal = ({ onClose, onJoinSuccess }: JoinByLinkModalProps) => {
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { joinWithLink, setError: setVideoCallError } = useVideoCall();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteLink.trim()) {
      setError('Please enter a valid invitation link');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setVideoCallError(null);
      
      const success = await joinWithLink(inviteLink.trim());
      if (success) {
        onJoinSuccess();
      } else {
        setError('Failed to join session. Please check the invitation link and try again.');
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
          <p className="mb-4">
            Enter the invitation link provided by your tarot reader to join the video reading session.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="inviteLink" className="block text-sm font-medium">
                Invitation Link
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  <LinkIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <input
                    id="inviteLink"
                    type="text"
                    value={inviteLink}
                    onChange={(e) => setInviteLink(e.target.value)}
                    placeholder="https://example.com/reading-room?join=..."
                    className={`w-full pl-9 pr-4 py-2 rounded-md border ${error ? 'border-destructive' : 'border-input'} 
                      bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste the full invitation link shared by the reading room host
                  </p>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost border border-input px-4 py-2"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
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
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinByLinkModal;