import { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../../context/VideoCallContext';
import { useAuth } from '../../context/AuthContext';
import { User, Video, X, Copy, Check, AlertCircle, Share2, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import VideoControls from './VideoControls';
import DraggableVideo from './DraggableVideo';
import ChatPanel from './ChatPanel';

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
  const [isCreatingRoom, setIsCreatingRoom] = useState(!sessionId);
  
  // Video position states
  const [localVideoPosition, setLocalVideoPosition] = useState({ x: 20, y: 20 });
  const [remoteVideoPosition, setRemoteVideoPosition] = useState({ x: window.innerWidth - 320, y: 20 });
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: window.innerWidth / 2 - 150, y: window.innerHeight - 300 });
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isChatDragging, setIsChatDragging] = useState(false);
  const [actualSessionId, setActualSessionId] = useState<string | null>(null);
  
  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        setIsInitializing(true);
        
        if (sessionId) {
          // Join existing call as client
          const result = await startCall('client', sessionId);
          if (result) {
            setActualSessionId(result);
          } else {
            console.log('Failed to join call - no session ID returned');
          }
        } else {
          // Start new call as reader
          const newSessionId = await startCall('reader');
          if (newSessionId) {
            setGeneratedSessionId(newSessionId);
            setActualSessionId(newSessionId);
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
  
  // Update chat position
  const updateChatPosition = (data: { x: number; y: number }) => {
    setChatPosition({ x: data.x, y: data.y });
  };

  // Toggle chat minimized state
  const toggleChatMinimized = () => {
    setChatMinimized(!chatMinimized);
  };
  
  // Toggle chat visibility
  const toggleChatVisibility = () => {
    setIsChatVisible(!isChatVisible);
  };
  
  // Handle chat drag start
  const handleChatDragStart = () => {
    setIsChatDragging(true);
  };
  
  // Handle chat drag end
  const handleChatDragEnd = () => {
    setIsChatDragging(false);
  };

  return (
    <>
        {/* Main container for draggable elements */}
        {/* Permission error message - floating */}
        {(error || permissionDenied) && (
          <motion.div 
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-destructive/10 border border-destructive/30 rounded-lg p-4 max-w-md"
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
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-card border border-border rounded-lg p-4 max-w-md shadow-lg"
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
                className="flex-grow p-2 text-sm bg-background border border-input rounded-l-md focus:outline-none"
              />
              <button 
                onClick={copySessionId}
                className="p-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 transition-colors"
                title="Copy to clipboard"
              >
                {showCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* Local video bubble */}
        <DraggableVideo
          videoRef={localVideoRef}
          stream={localStream}
          isVideoOff={isVideoOff}
          label={`You${isVideoOff ? " (Camera Off)" : ""}`}
          initialPosition={localVideoPosition}
          onPositionChange={updateLocalVideoPosition}
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
        
        {/* Remote video bubble */}
        <DraggableVideo
          videoRef={remoteVideoRef}
          stream={remoteStream}
          isVideoOff={false}
          label={isCreatingRoom ? 'Client' : 'Reader'}
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
        
        {/* Floating chat bubble */}
        {isChatVisible && (
          <motion.div
            className="fixed bg-card/95 backdrop-blur-sm border border-border rounded-lg overflow-hidden shadow-lg z-40"
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={{ left: 0, right: window.innerWidth - 300, top: 0, bottom: window.innerHeight - 300 }}
            onDragStart={handleChatDragStart}
            onDragEnd={handleChatDragEnd}
            animate={{
              x: chatPosition.x,
              y: chatPosition.y,
              width: chatMinimized ? 200 : 300,
              height: chatMinimized ? 40 : 300,
              scale: isChatDragging ? 1.02 : 1
            }}
            transition={{ duration: 0.3 }}
            style={{ 
              position: 'fixed',
              left: 0,
              top: 0
            }}
            onDrag={(e, info) => updateChatPosition(info.point)}
          >
            <div className="p-2 border-b border-border flex items-center justify-between cursor-move"
                 onDoubleClick={toggleChatMinimized}>
              <h3 className="text-sm font-medium">Chat</h3>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={toggleChatMinimized}
                  className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                >
                  {chatMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </button>
                <button 
                  onClick={() => setIsChatVisible(false)}
                  className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            
            {!chatMinimized && (
              <div className="p-2 flex flex-col h-[calc(100%-40px)]">
                <div className="flex-grow overflow-y-auto mb-2 text-sm p-2 bg-background/50 rounded-lg scrollbar-hide">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
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
                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="w-full p-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={connectionStatus !== 'connected'}
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    disabled={connectionStatus !== 'connected' || !message.trim()}
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
        
        {/* Floating controls */}
        <motion.div
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg p-2"
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
        
        {/* Chat toggle button (only visible when chat is hidden) */}
        {!isChatVisible && (
          <motion.button
            className="fixed bottom-20 right-4 z-50 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-colors"
            onClick={() => setIsChatVisible(true)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <MessageSquare className="h-5 w-5" />
          </motion.button>
        )}
        
        {/* Realtime Chat Panel */}
        {actualSessionId && (
          <ChatPanel
            roomId={actualSessionId}
            isVisible={isChatVisible}
            isMinimized={chatMinimized}
            position={chatPosition}
            onClose={() => setIsChatVisible(false)}
            onMinimize={() => setChatMinimized(!chatMinimized)}
            onPositionChange={setChatPosition}
            onDragStart={() => setIsChatDragging(true)}
            onDragEnd={() => setIsChatDragging(false)}
          />
        )}
    </>
  );
};

export default VideoChat;