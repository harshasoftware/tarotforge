import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { validateInviteLink } from '../utils/enhancedInviteLinks';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { AlertCircle, CheckCircle, Clock, UserPlus, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';

type InviteType = 'join' | 'reader';

const InviteHandler = () => {
  const { type, inviteId } = useParams<{ type: InviteType; inviteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'validating' | 'success' | 'error' | 'expired'>('validating');
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    if (!inviteId) {
      setStatus('error');
      setError('Invalid invite link');
      return;
    }

    const processInvite = async () => {
      try {
        const result = await validateInviteLink(inviteId);
        
        if (!result.valid) {
          setStatus('expired');
          setError(result.error || 'This invite link is no longer valid');
          return;
        }

        setInviteData(result);
        setStatus('success');

        // Redirect to reading room with appropriate parameters
        setTimeout(() => {
          // Get enableVideo parameter from URL if present
          const urlParams = new URLSearchParams(location.search);
          const enableVideo = urlParams.get('enableVideo') === 'true';

          // Use the correct route path for reading room
          const joinUrl = `/reading/rider-waite-classic?join=${result.sessionId}&invite=true${enableVideo ? '&enableVideo=true' : ''}`;

          // Add role parameter for reader invites
          if (result.role === 'reader' && result.shouldTransferHost) {
            navigate(joinUrl + '&role=reader');
          } else {
            navigate(joinUrl);
          }
        }, 2000);

      } catch (error) {
        console.error('Error processing invite:', error);
        setStatus('error');
        setError('Failed to process invite link');
      }
    };

    processInvite();
  }, [inviteId, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'validating':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Validating Invite Link</h2>
            <p className="text-muted-foreground">Please wait while we verify your invitation...</p>
          </motion.div>
        );

      case 'success':
        const isReaderInvite = type === 'reader' || inviteData?.role === 'reader';
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              isReaderInvite ? 'bg-primary/20' : 'bg-green-500/20'
            }`}>
              {isReaderInvite ? (
                <Wand2 className="h-8 w-8 text-primary" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-500" />
              )}
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              {isReaderInvite ? 'Reader Invitation Accepted' : 'Invitation Accepted'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isReaderInvite 
                ? "You're being connected to the reading room as the designated reader..."
                : "You're being connected to the reading room..."
              }
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span>Redirecting to session</span>
            </div>
          </motion.div>
        );

      case 'expired':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-warning/20 mx-auto mb-4 flex items-center justify-center">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Invite Link Expired</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {error || 'This invitation has expired or reached its usage limit.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="btn btn-primary px-6 py-2"
              >
                Go to Home
              </button>
              <p className="text-sm text-muted-foreground">
                Request a new invitation from the session host
              </p>
            </div>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-destructive/20 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Invalid Invite Link</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {error || 'The invitation link appears to be invalid or corrupted.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary px-6 py-2"
            >
              Go to Home
            </button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          {renderContent()}
        </div>
        
        {/* Additional info for different invite types */}
        {status === 'success' && type === 'reader' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <UserPlus className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary mb-1">Professional Reader Access</p>
                <p className="text-muted-foreground">
                  You'll have host controls to manage the reading session and guide participants.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InviteHandler; 