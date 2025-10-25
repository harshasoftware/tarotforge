import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoCall } from '../../hooks/useVideoCall';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, X, Maximize2, Minimize2, VolumeX, Volume2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoBubblesProps {
  onClose?: () => void;
  readingStep: 'setup' | 'ask-question' | 'drawing' | 'interpretation';
}

interface ParticipantState {
  isVideoMuted: boolean;
  isAudioMuted: boolean;
  volume: number;
}

interface BubblePosition {
  x: number;
  y: number;
}

const VideoBubbles: React.FC<VideoBubblesProps> = ({ onClose, readingStep }) => {
  const {
    isInCall,
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    participants,
    connectionStatus,
    error,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useVideoCall();

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile audio-only mode for 3+ participants
  const totalParticipants = participants.length + 1; // +1 for local user
  const shouldForceAudioOnlyOnMobile = isMobile && totalParticipants >= 3;
  const [hasShownAudioOnlyNotice, setHasShownAudioOnlyNotice] = useState(false);

  // Auto-disable video on mobile when 3+ participants join
  useEffect(() => {
    if (shouldForceAudioOnlyOnMobile && isVideoEnabled && !hasShownAudioOnlyNotice) {
      console.log(`Mobile: Switching to audio-only mode due to ${totalParticipants} participants`);
      toggleVideo(); // Disable video
      setHasShownAudioOnlyNotice(true);
      
      // Show a brief notification (you could also use a toast library here)
      console.log('📱 Audio-only mode activated for better performance on mobile with multiple participants');
    }
    
    // Reset notice when participants drop below 3
    if (!shouldForceAudioOnlyOnMobile && hasShownAudioOnlyNotice) {
      setHasShownAudioOnlyNotice(false);
      console.log('📱 Video mode available again (fewer than 3 participants)');
    }
  }, [shouldForceAudioOnlyOnMobile, isVideoEnabled, hasShownAudioOnlyNotice, toggleVideo, totalParticipants]);

  // Render during both drawing and interpretation steps
  if (readingStep !== 'drawing' && readingStep !== 'interpretation') {
    return null;
  }

  // Use single video elements that we'll move between containers
  const [localVideoElement, setLocalVideoElement] = useState<HTMLVideoElement | null>(null);
  const [remoteVideoElements, setRemoteVideoElements] = useState<Map<string, HTMLVideoElement>>(new Map());
  
  // Individual participant states for remote participants (local controls)
  const [participantStates, setParticipantStates] = useState<Map<string, ParticipantState>>(new Map());
  
  // Container refs for positioning
  const localVideoContainerExpanded = useRef<HTMLDivElement>(null);
  const localVideoContainerMinimized = useRef<HTMLDivElement>(null);
  const remoteVideoContainersExpanded = useRef<Map<string, HTMLDivElement>>(new Map());
  const remoteVideoContainersMinimized = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Individual bubble positions and drag states
  const getInitialPosition = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 10; // Safe margin from edges
    
    if (isMobile) {
      // On mobile, position in top-right corner with safe margins
      // Account for bubble size (64px) and margin
      const bubbleSize = 64;
      return {
        x: Math.max(margin, screenWidth - bubbleSize - margin),
        y: Math.max(margin, 60) // Account for mobile browser UI and top bar
      };
    } else {
      // On desktop, center horizontally with safe positioning
      const bubbleSize = 96;
      return {
        x: Math.max(margin, Math.min(screenWidth - bubbleSize - margin, (screenWidth - 320) / 2)),
        y: Math.max(margin, 20)
      };
    }
  }, [isMobile]);

  const [localBubblePosition, setLocalBubblePosition] = useState<BubblePosition>(getInitialPosition());
  const [remoteBubblePositions, setRemoteBubblePositions] = useState<Map<string, BubblePosition>>(new Map());
  const [expandedPosition, setExpandedPosition] = useState<BubblePosition>(getInitialPosition());

  // Update positions when mobile state changes
  useEffect(() => {
    const newPosition = getInitialPosition();
    setLocalBubblePosition(newPosition);
    setExpandedPosition(newPosition);
  }, [isMobile, getInitialPosition]);

  // Dynamic viewport constraints
  const [viewportConstraints, setViewportConstraints] = useState({
    expanded: { left: 0, right: 0, top: 0, bottom: 0 },
    localBubble: { left: 0, right: 0, top: 0, bottom: 0 },
    remoteBubble: { left: 0, right: 0, top: 0, bottom: 0 }
  });

  // Calculate viewport constraints
  const calculateConstraints = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10; // Safe margin from edges
    
    // Account for mobile browser UI elements
    const topOffset = isMobile ? 60 : 20; // Extra space for mobile browser UI and top bar
    const bottomOffset = isMobile ? 20 : 10; // Extra space for mobile browser UI

    // Expanded view constraints
    const expandedWidth = isMobile ? 288 : 320; // w-72 = 288px, w-80 = 320px
    const expandedHeight = isMobile ? 320 : 384; // max-h-80 = 320px, max-h-96 = 384px
    
    // Local bubble constraints (minimized)
    const localBubbleSize = isMobile ? 64 : 96; // w-16 = 64px, w-24 = 96px
    
    // Remote bubble constraints (minimized)
    const remoteBubbleSize = isMobile ? 56 : 80; // w-14 = 56px, w-20 = 80px

    setViewportConstraints({
      expanded: {
        left: margin,
        right: Math.max(margin, viewportWidth - expandedWidth - margin),
        top: Math.max(margin, topOffset),
        bottom: Math.max(margin + topOffset, viewportHeight - expandedHeight - bottomOffset)
      },
      localBubble: {
        left: margin,
        right: Math.max(margin, viewportWidth - localBubbleSize - margin),
        top: Math.max(margin, topOffset),
        bottom: Math.max(margin + topOffset, viewportHeight - localBubbleSize - bottomOffset)
      },
      remoteBubble: {
        left: margin,
        right: Math.max(margin, viewportWidth - remoteBubbleSize - margin),
        top: Math.max(margin, topOffset),
        bottom: Math.max(margin + topOffset, viewportHeight - remoteBubbleSize - bottomOffset)
      }
    });
  }, [isMobile]);

  // Update constraints on mount and window resize
  useEffect(() => {
    calculateConstraints();
    
    const handleResize = () => {
      calculateConstraints();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateConstraints]);

  // Clamp positions to viewport when constraints change
  useEffect(() => {
    // Clamp local bubble position
    const clampedLocal = {
      x: Math.max(viewportConstraints.localBubble.left, 
          Math.min(viewportConstraints.localBubble.right, localBubblePosition.x)),
      y: Math.max(viewportConstraints.localBubble.top, 
          Math.min(viewportConstraints.localBubble.bottom, localBubblePosition.y))
    };
    
    if (clampedLocal.x !== localBubblePosition.x || clampedLocal.y !== localBubblePosition.y) {
      setLocalBubblePosition(clampedLocal);
    }

    // Clamp expanded position
    const clampedExpanded = {
      x: Math.max(viewportConstraints.expanded.left, 
          Math.min(viewportConstraints.expanded.right, expandedPosition.x)),
      y: Math.max(viewportConstraints.expanded.top, 
          Math.min(viewportConstraints.expanded.bottom, expandedPosition.y))
    };
    
    if (clampedExpanded.x !== expandedPosition.x || clampedExpanded.y !== expandedPosition.y) {
      setExpandedPosition(clampedExpanded);
    }

    // Clamp remote bubble positions
    const newRemotePositions = new Map(remoteBubblePositions);
    let hasRemoteChanges = false;
    
    remoteBubblePositions.forEach((position, participantId) => {
      const clampedRemote = {
        x: Math.max(viewportConstraints.remoteBubble.left, 
            Math.min(viewportConstraints.remoteBubble.right, position.x)),
        y: Math.max(viewportConstraints.remoteBubble.top, 
            Math.min(viewportConstraints.remoteBubble.bottom, position.y))
      };
      
      if (clampedRemote.x !== position.x || clampedRemote.y !== position.y) {
        newRemotePositions.set(participantId, clampedRemote);
        hasRemoteChanges = true;
      }
    });
    
    if (hasRemoteChanges) {
      setRemoteBubblePositions(newRemotePositions);
    }
  }, [viewportConstraints, localBubblePosition, expandedPosition, remoteBubblePositions]);

  // Individual bubble control states
  const [showLocalControls, setShowLocalControls] = useState(false);
  const [showRemoteControls, setShowRemoteControls] = useState<Map<string, boolean>>(new Map());

  // Exit confirmation modal state
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Initialize participant states and positions for new participants
  useEffect(() => {
    const newStates = new Map(participantStates);
    const newPositions = new Map(remoteBubblePositions);
    let hasChanges = false;

    participants.forEach((participantId, index) => {
      if (!newStates.has(participantId)) {
        newStates.set(participantId, {
          isVideoMuted: false,
          isAudioMuted: false,
          volume: 1.0
        });
        hasChanges = true;
      }
      
      if (!newPositions.has(participantId)) {
        // Position remote bubbles based on device type with viewport constraints
        const margin = 10;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        if (isMobile) {
          // On mobile, stack vertically below local bubble with smaller spacing
          const remoteBubbleSize = 56;
          const proposedY = localBubblePosition.y + 80 + (index * 70);
          
          newPositions.set(participantId, {
            x: Math.max(margin, Math.min(screenWidth - remoteBubbleSize - margin, localBubblePosition.x)),
            y: Math.max(margin, Math.min(screenHeight - remoteBubbleSize - margin, proposedY))
          });
        } else {
          // On desktop, stack vertically below local bubble
          const remoteBubbleSize = 80;
          const proposedY = localBubblePosition.y + 120 + (index * 90);
          
          newPositions.set(participantId, {
            x: Math.max(margin, Math.min(screenWidth - remoteBubbleSize - margin, localBubblePosition.x)),
            y: Math.max(margin, Math.min(screenHeight - remoteBubbleSize - margin, proposedY))
          });
        }
        hasChanges = true;
      }
    });

    // Clean up states for participants who left
    newStates.forEach((_, participantId) => {
      if (!participants.includes(participantId)) {
        newStates.delete(participantId);
        newPositions.delete(participantId);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setParticipantStates(newStates);
      setRemoteBubblePositions(newPositions);
    }
  }, [participants, participantStates, remoteBubblePositions, localBubblePosition.x, localBubblePosition.y]);

  // Create video elements once and reuse them
  useEffect(() => {
    // Create local video element if it doesn't exist
    if (!localVideoElement) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.className = 'w-full h-full object-cover';
      video.style.transform = 'scaleX(-1)'; // Mirror local video
      setLocalVideoElement(video);
    }

    // Create remote video elements for new participants
    const newRemoteElements = new Map(remoteVideoElements);
    let hasChanges = false;

    participants.forEach(participantId => {
      if (!newRemoteElements.has(participantId)) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.className = 'w-full h-full object-cover';
        newRemoteElements.set(participantId, video);
        hasChanges = true;
      }
    });

    // Clean up video elements for participants who left
    newRemoteElements.forEach((video, participantId) => {
      if (!participants.includes(participantId)) {
        video.srcObject = null;
        video.remove();
        newRemoteElements.delete(participantId);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setRemoteVideoElements(newRemoteElements);
    }
  }, [participants, localVideoElement, remoteVideoElements]);

  // Set up local video stream
  useEffect(() => {
    console.log('Local stream changed:', localStream);
    
    if (localVideoElement && localStream) {
      console.log('Setting local stream to video element');
      localVideoElement.srcObject = localStream;
      localVideoElement.play().catch((e: any) => console.error('Error playing local video:', e));
    } else if (localVideoElement && !localStream) {
      console.log('Clearing local video stream');
      localVideoElement.srcObject = null;
    }
  }, [localStream, localVideoElement]);

  // Set up remote video streams with individual controls
  useEffect(() => {
    console.log('Remote streams changed:', remoteStreams.size);
    
    remoteStreams.forEach((stream, userId) => {
      console.log(`Setting up remote stream for user ${userId}`);
      const videoElement = remoteVideoElements.get(userId);
      const participantState = participantStates.get(userId);
      
      if (videoElement) {
        videoElement.srcObject = stream;
        
        // Apply individual participant controls
        if (participantState) {
          videoElement.muted = participantState.isAudioMuted;
          videoElement.volume = participantState.volume;
          
          // Hide/show video based on local mute state
          if (participantState.isVideoMuted) {
            videoElement.style.display = 'none';
          } else {
            videoElement.style.display = 'block';
          }
        }
        
        videoElement.play().catch((e: any) => console.error(`Error playing remote video for ${userId}:`, e));
      }
    });
  }, [remoteStreams, remoteVideoElements, participantStates]);

  // Move video elements to appropriate containers based on expanded state
  useEffect(() => {
    console.log('Moving video elements, isExpanded:', isExpanded);
    
    // Move local video
    if (localVideoElement) {
      const targetContainer = isExpanded 
        ? localVideoContainerExpanded.current 
        : localVideoContainerMinimized.current;
      
      if (targetContainer && !targetContainer.contains(localVideoElement)) {
        // Remove from current parent if any
        if (localVideoElement.parentNode) {
          localVideoElement.parentNode.removeChild(localVideoElement);
        }
        targetContainer.appendChild(localVideoElement);
        console.log('Moved local video to', isExpanded ? 'expanded' : 'minimized', 'container');
      }
    }

    // Move remote videos
    participants.forEach(participantId => {
      const videoElement = remoteVideoElements.get(participantId);
      if (videoElement) {
        const targetContainer = isExpanded
          ? remoteVideoContainersExpanded.current.get(participantId)
          : remoteVideoContainersMinimized.current.get(participantId);
        
        if (targetContainer && !targetContainer.contains(videoElement)) {
          // Remove from current parent if any
          if (videoElement.parentNode) {
            videoElement.parentNode.removeChild(videoElement);
          }
          targetContainer.appendChild(videoElement);
          console.log('Moved remote video for', participantId, 'to', isExpanded ? 'expanded' : 'minimized', 'container');
        }
      }
    });
  }, [isExpanded, participants, localVideoElement, remoteVideoElements]);

  const handleExitCall = () => {
    setShowExitConfirmation(true);
  };

  const confirmExitCall = () => {
    endCall();
    onClose?.();
    setShowExitConfirmation(false);
  };

  const cancelExitCall = () => {
    setShowExitConfirmation(false);
  };

  // Individual participant control functions
  const toggleParticipantVideo = useCallback((participantId: string) => {
    setParticipantStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(participantId) || { isVideoMuted: false, isAudioMuted: false, volume: 1.0 };
      newStates.set(participantId, {
        ...currentState,
        isVideoMuted: !currentState.isVideoMuted
      });
      return newStates;
    });
  }, []);

  const toggleParticipantAudio = useCallback((participantId: string) => {
    setParticipantStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(participantId) || { isVideoMuted: false, isAudioMuted: false, volume: 1.0 };
      newStates.set(participantId, {
        ...currentState,
        isAudioMuted: !currentState.isAudioMuted
      });
      return newStates;
    });
  }, []);

  const setParticipantVolume = useCallback((participantId: string, volume: number) => {
    setParticipantStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(participantId) || { isVideoMuted: false, isAudioMuted: false, volume: 1.0 };
      newStates.set(participantId, {
        ...currentState,
        volume: Math.max(0, Math.min(1, volume))
      });
      return newStates;
    });
  }, []);

  // Update remote bubble position
  const updateRemoteBubblePosition = useCallback((participantId: string, newPosition: BubblePosition) => {
    setRemoteBubblePositions(prev => {
      const newPositions = new Map(prev);
      newPositions.set(participantId, newPosition);
      return newPositions;
    });
  }, []);

  // Auto-start video call when participants are detected (for guests joining active calls)
  // REMOVED: No auto-start functionality - video calls should only start when explicitly requested

  const handleStartCall = async () => {
    try {
      console.log('Starting call from VideoBubbles...');
      await startCall();
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  // If not in call and no participants, show start call bubble
  if (!isInCall && participants.length === 0) {
    return (
      <motion.div
        className="fixed z-50 bg-gray-900 rounded-xl shadow-2xl border border-gray-700"
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={viewportConstraints.expanded}
        onDrag={(_, info) => {
          // Apply constraints in real-time during drag
          const constrainedPosition = {
            x: Math.max(viewportConstraints.expanded.left, 
                Math.min(viewportConstraints.expanded.right, info.point.x)),
            y: Math.max(viewportConstraints.expanded.top, 
                Math.min(viewportConstraints.expanded.bottom, info.point.y))
          };
          setLocalBubblePosition(constrainedPosition);
        }}
        onDragEnd={(_, info) => {
          // Final safety check to ensure position is within bounds
          const constrainedPosition = {
            x: Math.max(viewportConstraints.expanded.left, 
                Math.min(viewportConstraints.expanded.right, info.point.x)),
            y: Math.max(viewportConstraints.expanded.top, 
                Math.min(viewportConstraints.expanded.bottom, info.point.y))
          };
          setLocalBubblePosition(constrainedPosition);
        }}
        style={{ left: localBubblePosition.x, top: localBubblePosition.y }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
      >
        <div className="p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} />
              <span className="text-white text-sm font-medium">Video Call</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {error && (
            <div className="mb-3 p-2 bg-red-600/20 border border-red-600/30 rounded text-red-400 text-xs">
              {error}
            </div>
          )}
          
          <div className="text-center">
            {shouldForceAudioOnlyOnMobile ? (
              <>
                <Mic className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p className="text-gray-300 text-sm mb-2">Start audio call with participants</p>
                <p className="text-blue-400 text-xs mb-3">Audio-only mode (3+ participants on mobile)</p>
              </>
            ) : (
              <>
                <Video className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-300 text-sm mb-3">Start video call with participants</p>
              </>
            )}
            <button
              onClick={handleStartCall}
              disabled={connectionStatus === 'connecting'}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {connectionStatus === 'connecting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  {shouldForceAudioOnlyOnMobile ? <Mic className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  {shouldForceAudioOnlyOnMobile ? 'Start Audio Call' : 'Start Call'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Mobile Twitter Spaces-style audio interface for 3+ participants
  if (shouldForceAudioOnlyOnMobile && isInCall) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed right-2 top-1/2 -translate-y-1/2 z-50 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 p-3 w-20"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-3">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-400 text-xs">({totalParticipants})</span>
            </div>
            <button
              onClick={handleExitCall}
              className="text-gray-400 hover:text-red-400 transition-colors p-1"
              title="Leave audio room"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>

          {/* Participants Stack */}
          <div className="flex flex-col gap-2 mb-4">
            {/* Local User */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                {!isAudioEnabled && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
                    <MicOff className="w-2 h-2 text-white" />
                  </div>
                )}
                {isAudioEnabled && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-600 rounded-full flex items-center justify-center">
                    <Mic className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <span className="text-white text-xs mt-0.5 text-center">You</span>
            </div>

            {/* Remote Participants */}
            {participants.slice(0, 3).map((participantId, index) => {
              const participantState = participantStates.get(participantId) || { isVideoMuted: false, isAudioMuted: false, volume: 1.0 };
              const colors = [
                'from-green-500 to-teal-600',
                'from-orange-500 to-red-600', 
                'from-purple-500 to-pink-600'
              ];
              
              return (
                <div key={participantId} className="flex flex-col items-center">
                  <div className="relative">
                    <div className={`w-10 h-10 bg-gradient-to-br ${colors[index]} rounded-full flex items-center justify-center`}>
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    {participantState.isAudioMuted && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
                        <VolumeX className="w-2 h-2 text-white" />
                      </div>
                    )}
                    {!participantState.isAudioMuted && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-600 rounded-full flex items-center justify-center animate-pulse">
                        <Volume2 className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-white text-xs mt-0.5 text-center">{index + 1}</span>
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleAudio}
              className={`p-2 rounded-full ${
                isAudioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-red-600 hover:bg-red-700'
              } text-white transition-colors`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={handleExitCall}
              className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Leave audio room"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Exit Confirmation Modal */}
        <AnimatePresence>
          {showExitConfirmation && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={cancelExitCall}
            >
              <motion.div
                className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-destructive/10 rounded-full">
                    <LogOut className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Leave Audio Room</h3>
                    <p className="text-sm text-muted-foreground">Are you sure you want to exit?</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <p className="text-sm text-muted-foreground">
                    You will leave the audio room but remain in the reading room. Other participants will continue their audio call.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={cancelExitCall}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Stay in Room
                  </button>
                  <button
                    onClick={confirmExitCall}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                  >
                    Leave Room
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    );
  }

  // Video call bubbles when in call
  return (
    <AnimatePresence>
      {isInCall && (
        <>
          {isExpanded ? (
            // Expanded view - single draggable container
            <motion.div
              className={`fixed z-50 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 ${isMobile ? 'w-72 max-h-80' : 'w-80 max-h-96'} overflow-hidden`}
              drag
              dragMomentum={false}
              dragElastic={0}
              dragConstraints={viewportConstraints.expanded}
              onDrag={(_, info) => {
                // Apply constraints in real-time during drag
                const constrainedPosition = {
                  x: Math.max(viewportConstraints.expanded.left, 
                      Math.min(viewportConstraints.expanded.right, info.point.x)),
                  y: Math.max(viewportConstraints.expanded.top, 
                      Math.min(viewportConstraints.expanded.bottom, info.point.y))
                };
                setExpandedPosition(constrainedPosition);
              }}
              onDragEnd={(_, info) => {
                // Final safety check to ensure position is within bounds
                const constrainedPosition = {
                  x: Math.max(viewportConstraints.expanded.left, 
                      Math.min(viewportConstraints.expanded.right, info.point.x)),
                  y: Math.max(viewportConstraints.expanded.top, 
                      Math.min(viewportConstraints.expanded.bottom, info.point.y))
                };
                setExpandedPosition(constrainedPosition);
              }}
              style={{ left: expandedPosition.x, top: expandedPosition.y }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 bg-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-white text-sm font-medium">Video Call</span>
                  <span className="text-gray-400 text-xs">({participants.length + 1})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExitCall}
                    className="text-gray-400 hover:text-red-400 transition-colors p-1"
                    title="Leave video call"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Audio-only mode notification */}
              {shouldForceAudioOnlyOnMobile && (
                <div className="mx-3 mt-3 p-2 bg-blue-600/20 border border-blue-600/30 rounded text-blue-400 text-xs flex items-center gap-2">
                  <Mic className="w-3 h-3" />
                  <span>Audio-only mode active (3+ participants on mobile)</span>
                </div>
              )}

              {/* Video Grid */}
              <div className="p-3 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {/* Local Video Container - Expanded */}
                  <div 
                    className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video group"
                    onMouseEnter={() => !isMobile && setShowLocalControls(true)}
                    onMouseLeave={() => !isMobile && setShowLocalControls(false)}
                    onTouchStart={() => {
                      if (isMobile) {
                        setShowLocalControls(true);
                        setTimeout(() => setShowLocalControls(false), 3000);
                      }
                    }}
                  >
                    <div 
                      ref={localVideoContainerExpanded}
                      className="w-full h-full"
                    />
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                      You
                    </div>
                    {(!isVideoEnabled || shouldForceAudioOnlyOnMobile) && (
                      <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                        {shouldForceAudioOnlyOnMobile ? (
                          <div className="text-center">
                            <Mic className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                            <span className="text-xs text-blue-400">Audio Only</span>
                          </div>
                        ) : (
                          <VideoOff className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    )}
                    {!isAudioEnabled && (
                      <div className="absolute top-1 right-1 bg-red-600 p-0.5 rounded">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                    
                    {/* Local Video Controls */}
                    <AnimatePresence>
                      {showLocalControls && (
                        <motion.div
                          className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1 z-10"
                          style={{ pointerEvents: 'auto' }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleAudio();
                            }}
                            className={`p-1 rounded-full ${
                              isAudioEnabled
                                ? 'bg-gray-700 hover:bg-gray-600'
                                : 'bg-red-600 hover:bg-red-700'
                            } text-white transition-colors`}
                            style={{ pointerEvents: 'auto' }}
                            title={isAudioEnabled ? 'Mute' : 'Unmute'}
                          >
                            {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                          </button>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleVideo();
                            }}
                            disabled={shouldForceAudioOnlyOnMobile}
                            className={`p-1 rounded-full ${
                              shouldForceAudioOnlyOnMobile
                                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                : isVideoEnabled
                                  ? 'bg-gray-700 hover:bg-gray-600'
                                  : 'bg-red-600 hover:bg-red-700'
                            } text-white transition-colors`}
                            style={{ pointerEvents: 'auto' }}
                            title={
                              shouldForceAudioOnlyOnMobile
                                ? 'Video disabled (audio-only mode on mobile)'
                                : isVideoEnabled ? 'Turn off camera' : 'Turn on camera'
                            }
                          >
                            {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                          </button>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleExitCall();
                            }}
                            className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                            style={{ pointerEvents: 'auto' }}
                            title="Leave video call"
                          >
                            <LogOut className="w-3 h-3" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Debug info */}
                    {!localStream && (
                      <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
                        <span className="text-white text-xs">No Stream</span>
                      </div>
                    )}
                  </div>

                  {/* Remote Video Containers - Expanded */}
                  {participants.map((participantId, index) => {
                    const participantState = participantStates.get(participantId) || { isVideoMuted: false, isAudioMuted: false, volume: 1.0 };
                    const showControls = showRemoteControls.get(participantId) || false;
                    
                    return (
                      <div 
                        key={participantId} 
                        className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video group"
                        onMouseEnter={() => !isMobile && setShowRemoteControls(prev => new Map(prev).set(participantId, true))}
                        onMouseLeave={() => !isMobile && setShowRemoteControls(prev => new Map(prev).set(participantId, false))}
                        onTouchStart={() => {
                          if (isMobile) {
                            setShowRemoteControls(prev => new Map(prev).set(participantId, true));
                            setTimeout(() => {
                              setShowRemoteControls(prev => {
                                const newMap = new Map(prev);
                                newMap.set(participantId, false);
                                return newMap;
                              });
                            }, 3000);
                          }
                        }}
                      >
                        <div 
                          ref={(el) => {
                            if (el) {
                              remoteVideoContainersExpanded.current.set(participantId, el);
                            } else {
                              remoteVideoContainersExpanded.current.delete(participantId);
                            }
                          }}
                          className="w-full h-full"
                        />
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                          User {index + 1}
                        </div>
                        
                        {/* Show video muted overlay */}
                        {participantState.isVideoMuted && (
                          <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                            <VideoOff className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Show audio muted indicator */}
                        {participantState.isAudioMuted && (
                          <div className="absolute top-1 right-1 bg-red-600 p-0.5 rounded">
                            <VolumeX className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        {/* Remote Participant Controls */}
                        <AnimatePresence>
                          {showControls && (
                            <motion.div
                              className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1 z-10"
                              style={{ pointerEvents: 'auto' }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleParticipantAudio(participantId);
                                }}
                                className={`p-1 rounded-full ${
                                  participantState.isAudioMuted
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-gray-700 hover:bg-gray-600'
                                } text-white transition-colors`}
                                style={{ pointerEvents: 'auto' }}
                                title={participantState.isAudioMuted ? 'Unmute participant' : 'Mute participant'}
                              >
                                {participantState.isAudioMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleParticipantVideo(participantId);
                                }}
                                className={`p-1 rounded-full ${
                                  participantState.isVideoMuted
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-gray-700 hover:bg-gray-600'
                                } text-white transition-colors`}
                                style={{ pointerEvents: 'auto' }}
                                title={participantState.isVideoMuted ? 'Show participant video' : 'Hide participant video'}
                              >
                                {participantState.isVideoMuted ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {!remoteStreams.has(participantId) && (
                          <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            // Minimized bubbles - each individually draggable
            <>
              {/* Local video bubble - Minimized */}
              <motion.div
                className={`fixed z-50 ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} bg-gray-900 rounded-full overflow-hidden border-2 border-gray-700 shadow-lg cursor-pointer group`}
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={viewportConstraints.localBubble}
                onDrag={(_, info) => {
                  // Apply constraints in real-time during drag
                  const constrainedPosition = {
                    x: Math.max(viewportConstraints.localBubble.left, 
                        Math.min(viewportConstraints.localBubble.right, info.point.x)),
                    y: Math.max(viewportConstraints.localBubble.top, 
                        Math.min(viewportConstraints.localBubble.bottom, info.point.y))
                  };
                  setLocalBubblePosition(constrainedPosition);
                }}
                onDragEnd={(_, info) => {
                  // Final safety check to ensure position is within bounds
                  const constrainedPosition = {
                    x: Math.max(viewportConstraints.localBubble.left, 
                        Math.min(viewportConstraints.localBubble.right, info.point.x)),
                    y: Math.max(viewportConstraints.localBubble.top, 
                        Math.min(viewportConstraints.localBubble.bottom, info.point.y))
                  };
                  setLocalBubblePosition(constrainedPosition);
                }}
                onClick={(e) => {
                  // Only expand if not dragging
                  if (e.detail === 1) { // Single click
                    setTimeout(() => {
                      if (!e.defaultPrevented) {
                        setIsExpanded(true);
                      }
                    }, 200);
                  }
                }}
                onTouchStart={() => {
                  if (isMobile) {
                    setShowLocalControls(true);
                    // Auto-hide controls after 3 seconds on mobile
                    setTimeout(() => setShowLocalControls(false), 3000);
                  }
                }}
                whileHover={{ scale: isMobile ? 1 : 1.05 }}
                onMouseEnter={() => !isMobile && setShowLocalControls(true)}
                onMouseLeave={() => !isMobile && setShowLocalControls(false)}
                style={{ left: localBubblePosition.x, top: localBubblePosition.y }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <div 
                  ref={localVideoContainerMinimized}
                  className="w-full h-full"
                />
                {(!isVideoEnabled || shouldForceAudioOnlyOnMobile) && (
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    {shouldForceAudioOnlyOnMobile ? (
                      <Mic className="w-6 h-6 text-blue-400" />
                    ) : (
                      <VideoOff className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                )}
                {!isAudioEnabled && (
                  <div className="absolute top-1 right-1 bg-red-600 p-1 rounded-full">
                    <MicOff className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                  You
                </div>
                
                {/* Local Controls Overlay for Minimized */}
                <AnimatePresence>
                  {showLocalControls && (
                    <motion.div
                      className="absolute inset-0 bg-black/70 flex items-center justify-center gap-1 z-10"
                      style={{ pointerEvents: 'auto' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleAudio();
                        }}
                        className={`p-1 rounded-full ${
                          isAudioEnabled
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-red-600 hover:bg-red-700'
                        } text-white transition-colors`}
                        style={{ pointerEvents: 'auto' }}
                        title={isAudioEnabled ? 'Mute' : 'Unmute'}
                      >
                        {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleVideo();
                        }}
                        disabled={shouldForceAudioOnlyOnMobile}
                        className={`p-1 rounded-full ${
                          shouldForceAudioOnlyOnMobile
                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                            : isVideoEnabled
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-red-600 hover:bg-red-700'
                        } text-white transition-colors`}
                        style={{ pointerEvents: 'auto' }}
                        title={
                          shouldForceAudioOnlyOnMobile
                            ? 'Video disabled (audio-only mode on mobile)'
                            : isVideoEnabled ? 'Turn off camera' : 'Turn on camera'
                        }
                      >
                        {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleExitCall();
                        }}
                        className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                        style={{ pointerEvents: 'auto' }}
                        title="Leave video call"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Debug indicator */}
                {!localStream && (
                  <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full" title="No stream" />
                )}
              </motion.div>

              {/* Remote video bubbles - Minimized */}
              {participants.map((participantId, index) => {
                const participantState = participantStates.get(participantId) || { isVideoMuted: false, isAudioMuted: false, volume: 1.0 };
                const showControls = showRemoteControls.get(participantId) || false;
                const bubblePosition = remoteBubblePositions.get(participantId) || { x: 0, y: 0 };
                
                return (
                  <motion.div
                    key={participantId}
                    className={`fixed z-50 ${isMobile ? 'w-14 h-14' : 'w-20 h-20'} bg-gray-900 rounded-full overflow-hidden border-2 border-gray-700 shadow-lg cursor-pointer group`}
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    dragConstraints={viewportConstraints.remoteBubble}
                    onDrag={(_, info) => {
                      // Apply constraints in real-time during drag
                      const constrainedPosition = {
                        x: Math.max(viewportConstraints.remoteBubble.left, 
                            Math.min(viewportConstraints.remoteBubble.right, info.point.x)),
                        y: Math.max(viewportConstraints.remoteBubble.top, 
                            Math.min(viewportConstraints.remoteBubble.bottom, info.point.y))
                      };
                      updateRemoteBubblePosition(participantId, constrainedPosition);
                    }}
                    onDragEnd={(_, info) => {
                      // Final safety check to ensure position is within bounds
                      const constrainedPosition = {
                        x: Math.max(viewportConstraints.remoteBubble.left, 
                            Math.min(viewportConstraints.remoteBubble.right, info.point.x)),
                        y: Math.max(viewportConstraints.remoteBubble.top, 
                            Math.min(viewportConstraints.remoteBubble.bottom, info.point.y))
                      };
                      updateRemoteBubblePosition(participantId, constrainedPosition);
                    }}
                    onClick={(e) => {
                      // Only expand if not dragging
                      if (e.detail === 1) { // Single click
                        setTimeout(() => {
                          if (!e.defaultPrevented) {
                            setIsExpanded(true);
                          }
                        }, 200);
                      }
                    }}
                    onTouchStart={() => {
                      if (isMobile) {
                        setShowRemoteControls(prev => new Map(prev).set(participantId, true));
                        // Auto-hide controls after 3 seconds on mobile
                        setTimeout(() => {
                          setShowRemoteControls(prev => {
                            const newMap = new Map(prev);
                            newMap.set(participantId, false);
                            return newMap;
                          });
                        }, 3000);
                      }
                    }}
                    whileHover={{ scale: isMobile ? 1 : 1.05 }}
                    onMouseEnter={() => !isMobile && setShowRemoteControls(prev => new Map(prev).set(participantId, true))}
                    onMouseLeave={() => !isMobile && setShowRemoteControls(prev => new Map(prev).set(participantId, false))}
                    style={{ left: bubblePosition.x, top: bubblePosition.y }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <div 
                      ref={(el) => {
                        if (el) {
                          remoteVideoContainersMinimized.current.set(participantId, el);
                        } else {
                          remoteVideoContainersMinimized.current.delete(participantId);
                        }
                      }}
                      className="w-full h-full"
                    />
                    
                    {/* Show video muted overlay */}
                    {(participantState.isVideoMuted || !remoteStreams.has(participantId)) && (
                      <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Show audio muted indicator */}
                    {participantState.isAudioMuted && (
                      <div className="absolute top-1 right-1 bg-red-600 p-1 rounded-full">
                        <VolumeX className="w-2 h-2 text-white" />
                      </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                      {index + 1}
                    </div>
                    
                    {/* Remote Controls Overlay for Minimized */}
                    <AnimatePresence>
                      {showControls && (
                        <motion.div
                          className="absolute inset-0 bg-black/70 flex items-center justify-center gap-1 z-10"
                          style={{ pointerEvents: 'auto' }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleParticipantAudio(participantId);
                            }}
                            className={`p-1 rounded-full ${
                              participantState.isAudioMuted
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-gray-700 hover:bg-gray-600'
                            } text-white transition-colors`}
                            style={{ pointerEvents: 'auto' }}
                            title={participantState.isAudioMuted ? 'Unmute participant' : 'Mute participant'}
                          >
                            {participantState.isAudioMuted ? <VolumeX className="w-2 h-2" /> : <Volume2 className="w-2 h-2" />}
                          </button>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleParticipantVideo(participantId);
                            }}
                            className={`p-1 rounded-full ${
                              participantState.isVideoMuted
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-gray-700 hover:bg-gray-600'
                            } text-white transition-colors`}
                            style={{ pointerEvents: 'auto' }}
                            title={participantState.isVideoMuted ? 'Show participant video' : 'Hide participant video'}
                          >
                            {participantState.isVideoMuted ? <VideoOff className="w-2 h-2" /> : <Video className="w-2 h-2" />}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Floating action buttons */}
              <motion.div
                className="fixed z-50 flex flex-col gap-2"
                style={{ 
                  left: localBubblePosition.x + 100, 
                  top: localBubblePosition.y 
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                {/* Expand button */}
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors shadow-lg"
                  title="Expand video call"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </motion.div>
            </>
          )}
        </>
      )}

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirmation && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={cancelExitCall}
          >
            <motion.div
              className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Leave Video Call</h3>
                  <p className="text-sm text-muted-foreground">Are you sure you want to exit?</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <p className="text-sm text-muted-foreground">
                  You will leave the video call but remain in the reading room. Other participants will continue their video call.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can rejoin the video call anytime by clicking the video button.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelExitCall}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Stay in Call
                </button>
                <button
                  onClick={confirmExitCall}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Leave Call
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default VideoBubbles; 