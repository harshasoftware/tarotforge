import { useEffect, useState } from 'react';
import { User } from '../../../stores/authStore';
import { SessionParticipant, ReadingSessionState } from '../../../stores/readingSessionStore';
import { showParticipantNotification } from '../../../utils/toast';
import { useReadingSessionStore } from '../../../stores/readingSessionStore'; // For currentAnonymousId

interface ParticipantNotificationHandlerProps {
  sessionState: ReadingSessionState | null;
  sessionLoading: boolean;
  participants: SessionParticipant[];
  currentUser: User | null;
  currentParticipantId: string | undefined | null;
  // currentAnonymousId is derived from the store within the hook
}

export const useParticipantNotificationHandler = ({
  sessionState,
  sessionLoading,
  participants,
  currentUser,
  currentParticipantId,
}: ParticipantNotificationHandlerProps) => {
  const [previousParticipants, setPreviousParticipants] = useState<SessionParticipant[]>([]);
  const currentAnonymousId = useReadingSessionStore.getState().anonymousId; // Get latest anonymousId

  useEffect(() => {
    if (!sessionState?.id || sessionLoading) return;

    if (previousParticipants.length === 0 && participants.length > 0) {
      setPreviousParticipants(participants);
      return;
    }

    const sessionAge = sessionState.createdAt ? Date.now() - new Date(sessionState.createdAt).getTime() : 0;
    const isRecentSession = sessionAge < 3000; 

    if (isRecentSession) {
      console.log('Suppressing notifications for recent session (transition period)');
      setPreviousParticipants(participants);
      return;
    }

    const timeoutId = setTimeout(() => {
      const currentUserId = currentUser?.id;
      
      console.log('Participant change detection:', {
        currentUserId,
        currentParticipantId,
        currentAnonymousId,
        previousCount: previousParticipants.length,
        currentCount: participants.length,
        previousParticipants: previousParticipants.map(p => ({ id: p.id, anonymousId: p.anonymousId, userId: p.userId, name: p.name })),
        currentParticipants: participants.map(p => ({ id: p.id, anonymousId: p.anonymousId, userId: p.userId, name: p.name }))
      });

      const isCurrentUser = (participant: SessionParticipant) => {
        if (participant.id === currentParticipantId) return true;
        if (currentUserId && participant.userId === currentUserId) return true;
        if (!currentUserId && !participant.userId && participant.anonymousId) {
          if (participant.anonymousId === currentAnonymousId) return true;
          const isOldUuidFormat = participant.anonymousId.length === 36 && participant.anonymousId.includes('-');
          const isNewBrowserFormat = currentAnonymousId?.startsWith('browser_');
          if (isOldUuidFormat && isNewBrowserFormat) {
            console.log('Detected UUID -> browser fingerprint transition for current user, suppressing.');
            return true;
          }
        }
        return false;
      };

      const newParticipants = participants.filter(current => 
        !previousParticipants.find(prev => prev.id === current.id)
      );

      const leftParticipants = previousParticipants.filter(prev => 
        !participants.find(current => current.id === prev.id)
      );

      const filteredLeftParticipants = leftParticipants.filter(leftParticipant => {
        if (isCurrentUser(leftParticipant)) {
          console.log('Suppressing notification for current user leaving (filteredLeft)');
          return false;
        }
        if (!leftParticipant.userId && leftParticipant.anonymousId) {
          const isOldUuidFormat = leftParticipant.anonymousId.length === 36 && leftParticipant.anonymousId.includes('-');
          if (isOldUuidFormat && currentAnonymousId?.startsWith('browser_')) {
            const isAlsoNewParticipantWithBrowserId = newParticipants.some(
              (np) => np.anonymousId === currentAnonymousId && np.anonymousId?.startsWith('browser_')
            );
            if (isAlsoNewParticipantWithBrowserId) {
                console.log('Suppressing UUID participant departure likely due to current user ID transition (filteredLeft)');
                return false;
            }
          }
        }
        return true;
      });

      newParticipants.forEach(participant => {
        if (isCurrentUser(participant)) return;

        if (!participant.userId && participant.anonymousId?.startsWith('browser_')) {
          const hasOldUuidParticipantLeaving = leftParticipants.some(leftP => 
            !leftP.userId && leftP.anonymousId?.length === 36 && leftP.anonymousId.includes('-')
          );
          if (hasOldUuidParticipantLeaving) {
            console.log('Suppressing join notification for browser fingerprint during UUID transition (new)');
            return;
          }
        }

        showParticipantNotification({
          type: 'join',
          participantName: participant.name || 'Anonymous User',
          isAnonymous: !participant.userId
        });
      });

      filteredLeftParticipants.forEach(participant => {
        showParticipantNotification({
          type: 'leave',
          participantName: participant.name || 'Anonymous User',
          isAnonymous: !participant.userId
        });
      });

      setPreviousParticipants(participants);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [participants, previousParticipants, currentParticipantId, currentAnonymousId, sessionState?.id, sessionLoading, currentUser?.id, sessionState?.createdAt]);
}; 