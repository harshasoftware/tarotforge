import { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../../context/VideoCallContext';
import { useAuth } from '../../context/AuthContext';
import { User, Video, X, Phone, Mic, MicOff, VideoOff, Copy, Check, AlertCircle, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
  
  // Video position states
  const [localVideoPosition, setLocalVideoPosition] = useState({ x: 20, y: 20 });
  const [remoteVideoPosition, setRemoteVideoPosition] = useState({ x: window.innerWidth - 320, y: 20 });
  const [actualSessionId, setActualSessionId] = useState<string | null>(null);

  // Position update handlers
  const updateLocalVideoPosition = (position: { x: number; y: number }) => {
    setLocalVideoPosition(position);
  };

  const updateRemoteVideoPosition = (position: { x: number; y: number }) => {
    setRemoteVideoPosition(position);
  };

  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        setIsInitializing(true);
        
        if (sessionId) {
          // Join existing call as client
          setIsCreatingRoom(false);
          try {
            const result = await startCall('client', sessionId);
            if (result) {
              setActualSessionId(result);
            } else {
              console.log('Failed to join call - no session ID returned');
            }
          } catch (err) {
            console.error('Error joining call:', err);
            setError('Failed to join the call. Please try again.');
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
              console.log('Failed to start call - no session ID generated');
            }
          } catch (err) {
            console.error('Error starting call:', err);
            setError('Failed to start the call. Please try again.');
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
  }, []);
  
  // Effect to update the session ID if it changes
  useEffect(() => {
    if (sessionId && sessionId !== actualSessionId) {
      const updateSession = async () => {
        try {
          // Clean up existing call if any
          endCall();
          if (actualSessionId) {
            leaveRoom();
          }
          
          setIsInitializing(true);
          setIsCreatingRoom(false);
          
          // Join with the new session ID
          const result = await startCall('client', sessionId);
          if (result) {
            setActualSessionId(result);
          } else {
            console.log('Failed to join call - no session ID returned');
          }
        } catch (err) {
          console.error('Error updating session:', err);
          setError('Failed to join the call. Please try again.');
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
  
  // Request permission for camera/microphone
  const handleRequestPermissions = async () => {
    setIsRequestingPermissions(true);
    
    try {
      const granted = await requestPermissions();
      
      if (granted) {
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
                joinRoom(newSessionId);
              }
            };
            initCall();
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error requesting permissions:', err);
    } finally {
      setIsRequestingPermissions(false);
    }
  };
  
  // Get shareable link for the session
  const getShareableLink = () => {
    if (!generatedSessionId) return '';
    
    const baseUrl = window.location.origin;
    return `${baseUrl}/reading-room?join=${generatedSessionId}`;
  };
  
  return (
    <>
        {/* Main container for draggable elements */}
        {/* Permission error message - floating */}
        {(error || permissionDenied) && (
          <motion.div 
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[1001] bg-destructive/10 border border-destructive/30 rounded-lg p-4 max-w-md"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-destructive font-medium">Camera or Microphone Access Denied</p>
                <p className="text-sm text-destructive/80 mt-1">
                  We need permission to access your camera and microphone for the video call.
                </p>
                <button 
                  onClick={handleRequestPermissions}
                  disabled={isRequestingPermissions}
                  className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
                >
                  {isRequestingPermissions ? (
                    <span className="flex items-center">
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                      Requesting Access...
                    </span>
                  ) : (
                    "Allow Camera & Microphone"
                  )}
                </button>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-2 text-destructive/80 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Invitation link - floating */}
        {isCreatingRoom && generatedSessionId && (
          <motion.div 
            className="fixed top-20 left-1/2 transform -translate-x-1/2  z-[1001] bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 max-w-md shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Share Invitation Link</h3>
              <button 
                onClick={() => setGeneratedSessionId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center">
              <input
                type="text"
                value={getShareableLink()}
                readOnly
                className="flex-grow p-2 text-sm bg-background/80 border border-input rounded-l-md focus:outline-none"
              />
              <button 
                onClick={copySessionId}
                className="p-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 transition-colors flex items-center"
                title="Copy to clipboard"
              >
                {showCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this link with others to invite them to your reading session.
            </p>
          </motion.div>
        )}

        {/* Local video bubble - higher z-index */}
        <DraggableVideo
          videoRef={localVideoRef}
          stream={localStream}
          isVideoOff={isVideoOff}
          label={`You${isVideoOff ? " (Camera Off)" : ""}`}
          initialPosition={localVideoPosition}
          onPositionChange={updateLocalVideoPosition}
          className="z-[1000]"
          fallbackContent={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User className="h-6 w-6 text-muted-foreground" />
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
        
        {/* Remote video bubble - higher z-index */}
        <DraggableVideo
          videoRef={remoteVideoRef}
          stream={remoteStream}
          isVideoOff={false}
          label={isCreatingRoom ? 'Client' : 'Reader'}
          className="z-[1000]"
          initialPosition={remoteVideoPosition}
          onPositionChange={updateRemoteVideoPosition}
          fallbackContent={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-white text-xs">
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Waiting...'}
                </p>
              </div>
            </div>
          }
        />
        
        {/* Floating controls - higher z-index */}
        <motion.div 
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[1002] bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg p-2"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <VideoControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onEndCall={handleEndCall}
            disabled={!localStream}
          />
        </motion.div>
    </>
  );
};

export default VideoChat;