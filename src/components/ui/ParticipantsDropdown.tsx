import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';

interface Participant {
  id?: string;
  name?: string;
  isHost?: boolean;
  userId?: string | null;
  anonymousId?: string | null;
}

interface ParticipantsDropdownProps {
  participants: Participant[];
  disabled?: boolean;
  currentUserId?: string | null;
  currentAnonymousId?: string | null;
  isMobile?: boolean;
}

const ParticipantsDropdown: React.FC<ParticipantsDropdownProps> = ({
  participants,
  disabled = false,
  currentUserId,
  currentAnonymousId,
  isMobile = false
}) => {
  console.log('🎯 ParticipantsDropdown render:', {
    participantsCount: participants.length,
    participants: participants.map(p => ({
      id: p.id,
      name: p.name,
      userId: p.userId,
      anonymousId: p.anonymousId,
      isHost: p.isHost
    })),
    currentUserId,
    currentAnonymousId,
    disabled
  });

  // Log each participant individually for better debugging
  participants.forEach((p, index) => {
    console.log(`👤 Participant ${index}:`, {
      id: p.id,
      name: p.name,
      userId: p.userId,
      anonymousId: p.anonymousId,
      isHost: p.isHost,
      'userId type': typeof p.userId,
      'userId === currentUserId': p.userId === currentUserId
    });
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  // Show dropdown when hovering or clicked
  const shouldShowDropdown = (isHovered || isClicked) && !disabled;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!shouldShowDropdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.participants-dropdown-container')) {
        setIsClicked(false);
        setIsHovered(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shouldShowDropdown]);

  const handleMouseEnter = () => {
    if (!disabled) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = () => {
    if (!disabled) {
      setIsClicked(!isClicked);
    }
  };

  // Helper function to determine if participant is current user
  const isCurrentUser = (participant: Participant) => {
    console.log('🔍 Checking if participant is current user:', {
      participant: {
        id: participant.id,
        name: participant.name,
        userId: participant.userId,
        anonymousId: participant.anonymousId,
      },
      current: {
        currentUserId,
        currentAnonymousId,
      }
    });

    if (currentUserId && participant.userId) {
      const isMatch = participant.userId === currentUserId;
      console.log('👤 Authenticated user check:', { isMatch });
      return isMatch;
    }
    if (currentAnonymousId && participant.anonymousId) {
      const isMatch = participant.anonymousId === currentAnonymousId;
      console.log('👻 Anonymous user check:', { isMatch });
      return isMatch;
    }
    console.log('❌ No match found');
    return false;
  };

  // Helper function to get participant display name
  const getParticipantName = (participant: Participant) => {
    if (isCurrentUser(participant)) {
      return 'You';
    }
    return participant.name || 'Anonymous';
  };

  if (participants.length === 0) {
    return null;
  }

  return (
    <div 
      className="relative participants-dropdown-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className={`flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full transition-colors ${
          disabled ? 'cursor-default' : 'cursor-pointer hover:bg-muted/80'
        }`}
        disabled={disabled}
      >
        <Users className="h-3 w-3" />
        <span className="text-xs">{participants.length}</span>
      </button>
      
      {/* Participants dropdown */}
      <AnimatePresence>
        {shouldShowDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-48 ${
              isMobile ? 'right-0' : 'left-0'
            }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                {participants.length === 1 ? 'Participant' : 'Participants'} ({participants.length})
              </div>
              <div className="space-y-1">
                {participants.map((participant, index) => (
                  <div 
                    key={participant.id || index} 
                    className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50"
                  >
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1">{getParticipantName(participant)}</span>
                    {participant.isHost && (
                      <span className="text-primary text-[10px] font-medium">HOST</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParticipantsDropdown; 