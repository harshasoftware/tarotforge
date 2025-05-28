import { useState } from 'react';
import { XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface JoinByLinkModalProps {
  onClose: () => void;
  onJoinSuccess: () => void;
}

const JoinByLinkModal = ({ onClose, onJoinSuccess }: JoinByLinkModalProps) => {
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteLink.trim()) {
      setError('Please enter a valid invitation link');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Parse the invitation link to extract session ID
      const url = new URL(inviteLink.trim());
      const sessionId = url.searchParams.get('join');
      
      if (!sessionId) {
        setError('Invalid invitation link. Please check the link and try again.');
        return;
      }
      
      // Navigate to reading room with the session ID
      const deckId = url.pathname.split('/reading-room/')[1]?.split('?')[0];
      const targetPath = deckId 
        ? `/reading-room/${deckId}?join=${sessionId}`
        : `/reading-room?join=${sessionId}`;
      
      navigate(targetPath);
      onJoinSuccess();
      
    } catch (err: any) {
      console.error('Error parsing invitation link:', err);
      setError('Invalid invitation link format. Please check the link and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
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
            Enter the invitation link provided by your tarot reader to join their reading session with video chat.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="inviteLink" className="block text-sm font-medium">
                Invitation Link
              </label>
              <input
                id="inviteLink"
                type="text"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://tarotforge.com/reading-room?join=..."
                className={`w-full p-2 rounded-md border ${error ? 'border-destructive' : 'border-input'} 
                  bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                The link should look like: https://tarotforge.com/reading-room?join=session-id
              </p>
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