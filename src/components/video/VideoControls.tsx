import React from 'react';
import { Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';

interface VideoControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  disabled?: boolean;
}

/**
 * Video call controls component with mute, video toggle, and end call buttons
 */
const VideoControls: React.FC<VideoControlsProps> = ({
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  disabled = false
}) => {
  return (
    <div className="flex justify-center space-x-4">
      <button
        onClick={onToggleMute}
        className={`p-3 rounded-full ${isMuted ? 'bg-destructive/20 text-destructive' : 'bg-muted/30 text-foreground hover:bg-muted/50'} transition-colors`}
        title={isMuted ? 'Unmute' : 'Mute'}
        disabled={disabled}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      
      <button
        onClick={onEndCall}
        className="p-3 rounded-full bg-destructive text-white hover:bg-destructive/90 transition-colors"
        title="End Call"
      >
        <Phone className="h-5 w-5 transform rotate-135" />
      </button>
      
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full ${isVideoOff ? 'bg-destructive/20 text-destructive' : 'bg-muted/30 text-foreground hover:bg-muted/50'} transition-colors`}
        title={isVideoOff ? 'Turn on Camera' : 'Turn off Camera'}
        disabled={disabled}
      >
        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </button>
    </div>
  );
};

export default VideoControls;