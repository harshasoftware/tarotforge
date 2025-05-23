import { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../../context/VideoCallContext';
import { useAuth } from '../../context/AuthContext';
import { User, Video, X, Phone, Mic, MicOff, VideoOff, Copy, Check, AlertCircle, Share2, Settings, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoControls from './VideoControls';
import DraggableVideo from './DraggableVideo';

interface VideoChatProps {
  onClose: () => void;
  sessionId?: string | null;
}

const VideoChat = ({ onClose, sessionId }: VideoChatProps) => {
  const { user } = useAuth();
  const { 
    localStream, 
    remoteStream, 
    connectionStatus, 
    startCall, 
    endCall, 
    error,
    setError,
    generateShareableLink,
    requestPermissions,
    permissionDenied
  } = useVideoCall();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [generatedSessionId, setGeneratedSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // New states for improved mobile controls
  const [showControls, setShowControls] = useState(true);
  const [controlsMinimized, setControlsMinimized] = useState(false);
  const [controlsPosition, setControlsPosition] = useState<'bubble' | 'bottom' | 'hidden'>('bottom');
  
  // Video position states - optimized for mobile
  const [localVideoPosition, setLocalVideoPosition] = useState({ x: 20, y: 20 });
  const [remoteVideoPosition, setRemoteVideoPosition] = useState({ x: window.innerWidth - 320, y: 20 });
  const [actualSessionId, setActualSessionId] = useState<string | null>(null);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      
      // Auto-adjust controls for mobile
      if (isMobileDevice) {
        setControlsPosition('bubble'); // Use bubble controls for mobile
        setControlsMinimized(true); // Start minimized on mobile
        setLocalVideoPosition({ x: 16, y: 120 }); // Lower position to avoid top bar
        setRemoteVideoPosition({ x: window.innerWidth - 136, y: 120 });
      } else {
        setControlsPosition('bottom'); // Use bottom controls for desktop
        setControlsMinimized(false);
        setLocalVideoPosition({ x: 20, y: 20 });
        setRemoteVideoPosition({ x: window.innerWidth - 320, y: 20 });
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Position update handlers
  const updateLocalVideoPosition = (position: { x: number; y: number }) => {
    setLocalVideoPosition(position);
  };

  const updateRemoteVideoPosition = (position: { x: number; y: number }) => {
    setRemoteVideoPosition(position);
  };

  // Initialize call with better error handling
  useEffect(() => {
    if (!user) {
      setError('You must be logged in to start or join a call');
      return;
    }

    const initializeCall = async () => {
      try {
        setIsInitializing(true);
        
        // End any existing call first
        endCall();
        
        if (sessionId) {
          // Join existing call as client
          setIsCreatingRoom(false);
          try {
            const result = await startCall('client', sessionId);
            if (result) {
              setActualSessionId(result);
            } else {
              console.error('Failed to join call - no session ID returned');
              setError('Failed to join the call. Please try again.');
            }
          } catch (err) {
            console.error('Error joining call:', err);
            if (err instanceof Error && err.message.includes('Permission')) {
              setShowPermissionModal(true);
            } else {
              setError('Failed to join the call. Please try again.');
            }
          }
        } else {
          // Start new call as reader
          setIsCreatingRoom(true);
          try {
            const newSessionId = await startCall('reader');
            if (newSessionId) {
              setGeneratedSessionId(newSessionId);
              setActualSessionId(newSessionId);
            } else {
              console.error('Failed to start call - no session ID generated');
              setError('Failed to start the call. Please try again.');
            }
          } catch (err) {
            console.error('Error starting call:', err);
            if (err instanceof Error && err.message.includes('Permission')) {
              setShowPermissionModal(true);
            } else {
              setError('Failed to start the call. Please try again.');
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize call:', err);
        setError('Failed to initialize the call. Please check your connection and try again.');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeCall();
    
    return () => {
      endCall();
    };
  }, [user]);
  
  // Effect to update the session ID if it changes
  useEffect(() => {
    if (sessionId && sessionId !== actualSessionId) {
      const updateSession = async () => {
        try {
          // Clean up existing call if any
          endCall();
          
          setIsInitializing(true);
          setIsCreatingRoom(false);
          
          // Join with the new session ID
          const result = await startCall('client', sessionId);
          if (result) {
            setActualSessionId(result);
          } else {
            console.error('Failed to join call - no session ID returned');
            setError('Failed to join the call. Please try again.');
          }
        } catch (err) {
          console.error('Error updating session:', err);
          if (err instanceof Error && err.message.includes('Permission')) {
            setShowPermissionModal(true);
          } else {
            setError('Failed to join the call. Please try again.');
          }
        } finally {
          setIsInitializing(false);
        }
      };
      
      updateSession();
    }
  }, [sessionId]);
  
  // Handle local video stream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("Setting local stream to video element");
      localVideoRef.current.srcObject = localStream;
      
      // Debug local stream tracks
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();
      
      console.log("Local stream tracks:", {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoEnabled: videoTracks.length > 0 ? videoTracks[0].enabled : false,
        audioEnabled: audioTracks.length > 0 ? audioTracks[0].enabled : false,
        videoSettings: videoTracks.length > 0 ? videoTracks[0].getSettings() : null
      });
    }
  }, [localStream]);
  
  // Handle remote video stream
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  // Toggle audio mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`Video track ${track.label} enabled: ${track.enabled}`);
      });
      setIsVideoOff(!isVideoOff);
    }
  };
  
  // Copy session ID to clipboard
  const copySessionId = () => {
    if (generatedSessionId) {
      const shareableLink = generateShareableLink(generatedSessionId);
      navigator.clipboard.writeText(shareableLink);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };
  
  // Handle call end
  const handleEndCall = () => {
    endCall();
    onClose();
  };
  
  // Request permission for camera/microphone with improved mobile UX
  const handleRequestPermissions = async () => {
    setIsRequestingPermissions(true);
    
    try {
      const granted = await requestPermissions();
      
      if (granted) {
        setShowPermissionModal(false);
        setError(null);
        
        // Restart the call process
        endCall();
        
        setTimeout(() => {
          if (sessionId) {
            startCall('client', sessionId);
          } else {
            const initCall = async () => {
              const newSessionId = await startCall('reader');
              if (newSessionId) {
                setGeneratedSessionId(newSessionId);
                setActualSessionId(newSessionId);
              }
            };
            initCall();
          }
        }, 1000);
      } else {
        setError('Camera and microphone permissions are required for video calls');
      }
    } catch (err) {
      console.error('Error requesting permissions:', err);
      setError('Failed to request permissions. Please check your browser settings.');
    } finally {
      setIsRequestingPermissions(false);
    }
  };
  
  // Get shareable link for the session
  const getShareableLink = () => {
    if (!generatedSessionId) return '';
    return generateShareableLink(generatedSessionId);
  };

  // Auto-show permission modal when permissions are denied
  useEffect(() => {
    if (permissionDenied || (error && error.includes('Permission'))) {
      setShowPermissionModal(true);
    }
  }, [permissionDenied, error]);

  return (
    <>
      {/* Permission Modal - Mobile Optimized */}
      <AnimatePresence>
        {showPermissionModal && (
          <motion.div 
            className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={`bg-card border border-border rounded-xl overflow-hidden shadow-xl ${isMobile ? 'w-full max-w-sm' : 'max-w-md'}`}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Camera & Microphone Access</h3>
                  </div>
                  <button 
                    onClick={() => setShowPermissionModal(false)}
                    className="text-muted-foreground hover:text-foreground p-1 -m-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <AlertCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium mb-2">Video calling requires access to your camera and microphone</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      This allows you to participate in the video call with other participants in the reading room.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Your video and audio stay within this session</p>
                      <p>• You can turn off camera/microphone anytime</p>
                      <p>• Permissions can be revoked in browser settings</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleRequestPermissions}
                    disabled={isRequestingPermissions}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center min-h-[44px]"
                  >
                    {isRequestingPermissions ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                        Requesting Access...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Allow Camera & Microphone
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => setShowPermissionModal(false)}
                    className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Continue without video
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invitation link - Mobile Optimized */}
      <AnimatePresence>
        {isCreatingRoom && generatedSessionId && (
          <motion.div 
            className={`fixed ${isMobile ? 'bottom-20 left-4 right-4' : 'top-20 left-1/2 transform -translate-x-1/2'} z-[1001] bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${isMobile ? 'p-3' : 'p-4 max-w-md'}`}
            initial={{ opacity: 0, y: isMobile ? 20 : -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 20 : -20 }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-sm">Share Video Call</h3>
              <button 
                onClick={() => setGeneratedSessionId(null)}
                className="text-muted-foreground hover:text-foreground p-1 -m-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center">
              <input
                type="text"
                value={getShareableLink()}
                readOnly
                className="flex-grow p-2 text-xs bg-background/80 border border-input rounded-l-md focus:outline-none"
              />
              <button 
                onClick={copySessionId}
                className="p-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 transition-colors flex items-center min-h-[36px]"
                title="Copy to clipboard"
              >
                {showCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this link to invite others to the video call.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Local video bubble - Mobile Optimized */}
      <DraggableVideo
        videoRef={localVideoRef}
        stream={localStream}
        isVideoOff={isVideoOff}
        label={`You${isVideoOff ? " (Camera Off)" : ""}`}
        initialPosition={localVideoPosition}
        onPositionChange={updateLocalVideoPosition}
        className="z-[1000]"
        isMobile={isMobile}
        fallbackContent={
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
              </div>
              <p className="text-white text-xs">Your Camera</p>
              {isInitializing ? (
                <p className="text-xs text-muted-foreground">Initializing...</p>
              ) : permissionDenied ? (
                <p className="text-xs text-destructive">Access denied</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not available</p>
              )}
            </div>
          </div>
        }
      />
      
      {/* Remote video bubble - Mobile Optimized */}
      <DraggableVideo
        videoRef={remoteVideoRef}
        stream={remoteStream}
        isVideoOff={false}
        label={isCreatingRoom ? 'Client' : 'Reader'}
        className="z-[1000]"
        initialPosition={remoteVideoPosition}
        onPositionChange={updateRemoteVideoPosition}
        isMobile={isMobile}
        fallbackContent={
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="h-4 w-4 md:h-6 md:w-6 text-muted-foreground" />
              </div>
              <p className="text-white text-xs">
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Waiting...'}
              </p>
            </div>
          </div>
        }
      />
      
      {/* Improved Mobile Controls */}
      {controlsPosition === 'bubble' && isMobile && (
        <>
          {/* Control buttons around the local video bubble */}
          <motion.div 
            className="fixed z-[1003]"
            style={{
              left: localVideoPosition.x - 24,
              top: localVideoPosition.y + 72, // Below the video bubble
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-1">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`p-2 rounded-full backdrop-blur-sm border transition-colors ${
                  isMuted 
                    ? 'bg-destructive/90 text-destructive-foreground border-destructive' 
                    : 'bg-card/90 text-foreground border-border hover:bg-muted/50'
                }`}
                title={isMuted ? "Unmute" : "Mute"}
                disabled={!localStream}
              >
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </button>
              
              {/* Video Button */}
              <button
                onClick={toggleVideo}
                className={`p-2 rounded-full backdrop-blur-sm border transition-colors ${
                  isVideoOff 
                    ? 'bg-destructive/90 text-destructive-foreground border-destructive' 
                    : 'bg-card/90 text-foreground border-border hover:bg-muted/50'
                }`}
                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                disabled={!localStream}
              >
                {isVideoOff ? <VideoOff className="h-3 w-3" /> : <Video className="h-3 w-3" />}
              </button>
              
              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="p-2 rounded-full bg-destructive/90 text-destructive-foreground border border-destructive hover:bg-destructive transition-colors backdrop-blur-sm"
                title="End call"
              >
                <PhoneOff className="h-3 w-3" />
              </button>
              
              {/* Minimize/Expand Toggle */}
              <button
                onClick={() => setControlsPosition(controlsMinimized ? 'bottom' : 'hidden')}
                className="p-2 rounded-full bg-card/90 text-foreground border border-border hover:bg-muted/50 backdrop-blur-sm"
                title="Move controls"
              >
                <Settings className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Bottom Controls (Desktop + Mobile fallback) */}
      {(controlsPosition === 'bottom' || (!isMobile && showControls)) && (
        <motion.div 
          className={`fixed ${isMobile ? 'top-4 right-4' : 'bottom-6 left-1/2 transform -translate-x-1/2'} z-[1002]`}
          initial={{ y: isMobile ? -100 : 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className={`bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg p-2 ${isMobile ? 'flex flex-col items-center' : 'flex justify-center'}`}>
            {controlsMinimized && isMobile ? (
              /* Minimized mobile controls - just essential buttons */
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setControlsMinimized(false)}
                  className="p-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                  title="Expand controls"
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  onClick={handleEndCall}
                  className="p-2 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                  title="End call"
                >
                  <PhoneOff className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Full controls */
              <div className={`flex items-center ${isMobile ? 'flex-col gap-1' : 'space-x-2'}`}>
                {isMobile && (
                  <button
                    onClick={() => setControlsMinimized(true)}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    title="Minimize"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                
                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full transition-colors ${
                    isMuted 
                      ? 'bg-destructive text-destructive-foreground' 
                      : 'bg-muted/30 text-foreground hover:bg-muted/50'
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                  disabled={!localStream}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                
                {/* Video Button */}
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-colors ${
                    isVideoOff 
                      ? 'bg-destructive text-destructive-foreground' 
                      : 'bg-muted/30 text-foreground hover:bg-muted/50'
                  }`}
                  title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                  disabled={!localStream}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </button>
                
                {/* End Call Button */}
                <button
                  onClick={handleEndCall}
                  className="p-3 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  title="End call"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
                
                {/* Settings Button for Permission Access */}
                {(permissionDenied || error) && (
                  <button
                    onClick={() => setShowPermissionModal(true)}
                    className="p-3 rounded-full bg-warning text-warning-foreground hover:bg-warning/90 transition-colors"
                    title="Camera & Microphone Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                )}

                {isMobile && (
                  <button
                    onClick={() => setControlsPosition('bubble')}
                    className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    title="Move to bubble controls"
                  >
                    <Share2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Hidden state - just a small indicator */}
      {controlsPosition === 'hidden' && (
        <motion.div 
          className="fixed top-4 right-4 z-[1002]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => setControlsPosition('bubble')}
            className="p-3 rounded-full bg-primary/90 text-primary-foreground backdrop-blur-sm shadow-lg hover:bg-primary transition-colors"
            title="Show video controls"
          >
            <Video className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </>
  );
};

export default VideoChat;