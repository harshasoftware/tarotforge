import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { processInviteLink } from '../utils/inviteLinks';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { AlertCircle, Users, Clock, ExternalLink } from 'lucide-react';

const InvitePage: React.FC = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleInvite = async () => {
      if (!inviteId) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const result = await processInviteLink(inviteId);
        
        if (result.success && result.sessionId) {
          // Redirect to reading room with invite flag and enable video
          navigate(`/reading/rider-waite-classic?join=${result.sessionId}&invite=true&enableVideo=true`, {
            replace: true
          });
        } else {
          setError(result.error || 'Failed to process invite link');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error processing invite:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    handleInvite();
  }, [inviteId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-white/80 mt-4 text-lg">Processing your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 max-w-md w-full text-center border border-white/20">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">
            Invite Link Issue
          </h1>
          
          <p className="text-white/80 mb-6">
            {error}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/reading/rider-waite-classic')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4" />
              Start New Reading
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-lg transition-colors border border-white/20"
            >
              Go Home
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-white/60 text-sm">
              Common issues:
            </p>
            <ul className="text-white/60 text-sm mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Link may have expired
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                Session may no longer be active
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return null; // Should not reach here due to redirect
};

export default InvitePage; 