import { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../../context/VideoCallContext';
import { useAuth } from '../../context/AuthContext';
import { User, Video, X, Send, Copy, Check, AlertCircle, Share2, Minimize2, Maximize2, Users, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import VideoControls from './VideoControls';
import DraggableVideo from './DraggableVideo';
import ChatBubble from './ChatBubble';
import VideoQualitySettings from './VideoQualitySettings';
import { VideoQuality } from './VideoQualitySettings';

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
    messages, 
    participants,
    videoQuality,
    setVideoQuality,
    maxParticipants,
    startCall, 
    endCall, 
    sendMessage, 
    error,
    generateShareableLink,
    requestPermissions,
    permissionDenied
  } = useVideoCall();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [generatedSessionId, setGeneratedSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(!sessionId);
  
  // Video position states
  const [localVideoPosition, setLocalVideoPosition] = useState({ x: 0, y: 0 });
  const [remoteVideoPosition, setRemoteVideoPosition] = useState({ x: 200, y: 0 });
  const [chatMinimized, setChatMinimized] = useState(false);
  const [showQualitySettings, setShowQualitySettings] = useState(false);
  
  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        setIsInitializing(true);
        
        if (sessionId) {
          // Join existing call as client
          const result = await startCall('client', sessionId);
          if (!result) {
            console.log('Failed to join call - no session ID returned');
          }
        } else {
          // Start new call as reader
          const newSessionId = await startCall('reader');
          if (newSessionId) {
            setGeneratedSessionId(newSessionId);
          } else {
            console.log('Failed to start call - no session ID generated');
          }
        }
      } catch (err) {
        console.error('Failed to initialize call:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeCall();
    
    return () => {
      endCall();
    };
  }, []);
  
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

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
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
  
  // Send chat message
  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
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
    return generateShareableLink(generatedSessionId);
  };
  
  // Update local video position
  const updateLocalVideoPosition = (data: { x: number; y: number }) => {
    setLocalVideoPosition({ x: data.x, y: data.y });
  };
  
  // Update remote video position
  const updateRemoteVideoPosition = (data: { x: number; y: number }) => {
    setRemoteVideoPosition({ x: data.x, y: data.y });
  };

  // Toggle chat minimized state
  const toggleChatMinimized = () => {
    setChatMinimized(!chatMinimized);
  };
  
  // Toggle quality settings
  const toggleQualitySettings = () => {
    setShowQualitySettings(!showQualitySettings);
  };
  
  // Handle quality change
  const handleQualityChange = (quality: VideoQuality) => {
    setVideoQuality(quality);
  };

  return (
    <motion.div 
      className="bg-card border border-border rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-primary/10 p-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center">
          <Video className="h-5 w-5 text-primary mr-2" />
          <h3 className="font-medium">
            {connectionStatus === 'connected' 
              ? 'Live Reading Session' 
              : connectionStatus === 'connecting' 
                ? 'Connecting...' 
                : 'Start Reading Session'}
          </h3>
          
          {connectionStatus === 'connecting' && (
            <span className="ml-2 h-3 w-3 bg-warning rounded-full animate-pulse"></span>
          )}
          
          {connectionStatus === 'connected' && (
            <span className="ml-2 h-3 w-3 bg-success rounded-full"></span>
          )}
          
          {/* Participant count */}
          {participants.length > 0 && (
            <div className="ml-3 flex items-center text-xs bg-muted/30 px-2 py-0.5 rounded-full">
              <Users className="h-3 w-3 mr-1" />
              <span>{participants.length}/{maxParticipants}</span>
            </div>
          )}
        </div>
        <button 
          onClick={handleEndCall}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-4">
        {/* Main container for draggable elements */}
        <div className="relative min-h-[300px] sm:min-h-[400px] md:min-h-[500px] mb-4">
        {/* Show invitation link for sharing (only for reader) */}
        {isCreatingRoom && generatedSessionId && !chatMinimized && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg z-30 relative">
            <p className="text-sm mb-2 font-medium">Share this invitation link with your client:</p>
            <div className="flex items-center">
              <input
                type="text"
                value={getShareableLink()}
                readOnly
                className="flex-grow p-2 text-sm bg-card border border-input rounded-md focus:outline-none"
              />
              <button 
                onClick={copySessionId}
                className="ml-2 p-2 rounded-md hover:bg-primary/20 transition-colors flex items-center"
                title="Copy to clipboard"
              >
                {showCopied ? (
                  <>
                    <Check className="h-4 w-4 text-success mr-1" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-1" />
                    <span className="text-xs">Share</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              Up to {maxParticipants} participants can join this reading session.
            </p>
          </div>
        )}
        
        {/* Video quality settings */}
        {showQualitySettings && (
          <div className="absolute top-0 right-0 z-40 w-full sm:w-64 mt-2 mr-2">
            <VideoQualitySettings
              quality={videoQuality}
              onChange={handleQualityChange}
              className="shadow-lg"
            />
          </div>
        )}
        
        {/* Permission error message */}
        {(error || permissionDenied) && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-destructive font-medium">Camera or Microphone Access Denied</p>
                <p className="text-sm text-destructive/80 mt-1">
                  We need permission to access your camera and microphone for the video call.
                  Please check your browser settings and allow access.
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
            </div>
          </div>
        )}
        
        {/* Video area */}
        
          {/* Local video - using DraggableVideo component */}
          <DraggableVideo
            videoRef={localVideoRef}
            stream={localStream}
            isVideoOff={isVideoOff}
            label={`You${isVideoOff ? " (Camera Off)" : ""}`}
            initialPosition={{ x: 0, y: 0 }}
            onPositionChange={updateLocalVideoPosition}
            className="sm:w-1/3 md:w-1/4"
            fallbackContent={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-white">Your Camera</p>
                  {isInitializing ? (
                    <p className="text-xs text-muted-foreground mt-1">Initializing camera...</p>
                  ) : permissionDenied ? (
                    <p className="text-xs text-destructive mt-1">Camera access denied</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Camera not available</p>
                  )}
                </div>
              </div>
            }
          />
          
          {/* Remote video - using DraggableVideo component */}
          <DraggableVideo
            videoRef={remoteVideoRef}
            stream={remoteStream}
            isVideoOff={false}
            label={isCreatingRoom ? 'Client' : 'Reader'}
            initialPosition={{ x: 200, y: 0 }}
            onPositionChange={updateRemoteVideoPosition}
            className="sm:w-1/3 md:w-1/4"
            fallbackContent={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-white">
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Waiting for other person'}
                  </p>
                  {connectionStatus !== 'connecting' && isCreatingRoom && (
                    <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
                      Share the invitation link above to invite someone to join your reading session
                    </p>
                  )}
                </div>
              </div>
            }
          />
        </div>
        
        {/* Controls */}
        <div className="mb-4">
          <VideoControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onEndCall={handleEndCall}
            disabled={!localStream}
          />
        </div>
        
        {/* Chat */}
        <motion.div 
          className="rounded-lg bg-muted/30 border border-border overflow-hidden"
          animate={{ height: chatMinimized ? '40px' : 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-3 border-b border-border flex items-center justify-between cursor-pointer"
               onClick={toggleChatMinimized}>
            <h3 className="font-medium">Chat</h3>
            <button className="p-1 rounded-full hover:bg-muted/50 transition-colors">
              {chatMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          </div>
          
          {!chatMinimized && <div className="p-4">
          <div className="h-40 overflow-y-auto mb-3 text-sm p-2 bg-card/50 rounded-lg scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    sender={msg.sender}
                    content={msg.content}
                    isCurrentUser={msg.sender === (user?.username || user?.email)}
                    isSystem={msg.sender === 'System'}
                    timestamp={msg.timestamp}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              disabled={connectionStatus !== 'connected'}
            />
            <button 
              onClick={handleSendMessage}
              className="btn btn-primary p-2 flex-shrink-0"
              disabled={connectionStatus !== 'connected' || !message.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          </div>}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default VideoChat;