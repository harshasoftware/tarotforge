import { useState } from 'react';
import { XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface JoinVideoCallModalProps {
  onClose: () => void;
  onJoin: (sessionId: string) => void;
}

const JoinVideoCallModal = ({ onClose, onJoin }: JoinVideoCallModalProps) => {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId.trim()) {
      setError('Please enter a valid session ID');
      return;
    }
    
    onJoin(sessionId.trim());
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
            Enter the session ID provided by your tarot reader to join the video reading.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="sessionId" className="block text-sm font-medium">
                Session ID
              </label>
              <input
                id="sessionId"
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID"
                className={`w-full p-2 rounded-md border ${error ? 'border-destructive' : 'border-input'} 
                  bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost border border-input px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4 py-2 flex items-center"
              >
                Join Session
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinVideoCallModal;