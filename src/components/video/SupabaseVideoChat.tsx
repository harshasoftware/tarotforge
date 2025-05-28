import React, { useRef, useEffect } from 'react';
import { useVideoCall } from '../../hooks/useVideoCall';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SupabaseVideoChatProps {
  onCallEnd?: () => void;
  className?: string;
}

const SupabaseVideoChat: React.FC<SupabaseVideoChatProps> = ({ 
  onCallEnd,
  className = ''
}) => {
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Set up local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set up remote videos
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const handleStartCall = async () => {
    try {
      await startCall();
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const handleEndCall = () => {
    endCall();
    onCallEnd?.();
  };

  const getVideoGridClass = () => {
    const totalVideos = 1 + participants.length; // local + remote
    if (totalVideos === 1) return 'grid-cols-1';
    if (totalVideos === 2) return 'grid-cols-2';
    if (totalVideos <= 4) return 'grid-cols-2 grid-rows-2';
    return 'grid-cols-3 grid-rows-2';
  };

  const getParticipantName = (participantId: string, index: number) => {
    // You can enhance this to show actual user names from your user system
    return `Participant ${index + 1}`;
  };

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 right-4 z-20 bg-red-600 text-white p-3 rounded-lg flex items-center"
          >
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status */}
      <AnimatePresence>
        {connectionStatus === 'connecting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10"
          >
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <div>Connecting to video call...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Not Started State */}
      {!isInCall && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-white">
            <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Start Video Call</h3>
            <p className="text-gray-400 mb-6">Connect with other participants via video</p>
            <button
              onClick={handleStartCall}
              disabled={connectionStatus === 'connecting'}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center mx-auto transition-colors"
            >
              <Phone className="w-5 h-5 mr-2" />
              Start Call
            </button>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {isInCall && (
        <div className={`grid ${getVideoGridClass()} gap-2 p-4 min-h-[400px]`}>
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              You
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-gray-400" />
              </div>
            )}
            {!isAudioEnabled && (
              <div className="absolute top-2 right-2 bg-red-600 p-1 rounded">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {participants.map((participantId, index) => (
            <div key={participantId} className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={(el) => {
                  if (el) {
                    remoteVideoRefs.current.set(participantId, el);
                  } else {
                    remoteVideoRefs.current.delete(participantId);
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {getParticipantName(participantId, index)}
              </div>
              {!remoteStreams.has(participantId) && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-sm">Connecting...</div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Empty slots for potential participants */}
          {participants.length === 0 && (
            <div className="bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm">Waiting for participants...</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {isInCall && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              isAudioEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="End call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Participant Count */}
      {isInCall && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded-full flex items-center">
          <Users className="w-4 h-4 mr-1" />
          {participants.length + 1}
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4">
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' :
          connectionStatus === 'connecting' ? 'bg-yellow-500' :
          connectionStatus === 'failed' ? 'bg-red-500' :
          'bg-gray-500'
        }`} title={`Connection: ${connectionStatus}`} />
      </div>
    </div>
  );
};

export default SupabaseVideoChat; 