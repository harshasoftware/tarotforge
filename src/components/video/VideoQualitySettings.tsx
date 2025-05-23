import React from 'react';
import { Settings, Zap, Gauge } from 'lucide-react';

export type VideoQuality = 'low' | 'medium' | 'high';

interface VideoQualitySettingsProps {
  quality: VideoQuality;
  onChange: (quality: VideoQuality) => void;
  className?: string;
}

/**
 * Component for selecting video quality settings
 */
const VideoQualitySettings: React.FC<VideoQualitySettingsProps> = ({
  quality,
  onChange,
  className = ''
}) => {
  return (
    <div className={`p-3 bg-card/80 backdrop-blur-sm border border-border rounded-lg ${className}`}>
      <div className="flex items-center mb-3">
        <Settings className="h-4 w-4 text-primary mr-2" />
        <h3 className="text-sm font-medium">Video Quality</h3>
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="videoQuality"
            checked={quality === 'low'}
            onChange={() => onChange('low')}
            className="mr-2"
          />
          <div className="flex items-center">
            <Zap className="h-4 w-4 text-success mr-1" />
            <span className="text-sm">Low (360p)</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">Saves bandwidth</span>
        </label>
        
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="videoQuality"
            checked={quality === 'medium'}
            onChange={() => onChange('medium')}
            className="mr-2"
          />
          <div className="flex items-center">
            <Gauge className="h-4 w-4 text-warning mr-1" />
            <span className="text-sm">Medium (720p)</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">Balanced</span>
        </label>
        
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="videoQuality"
            checked={quality === 'high'}
            onChange={() => onChange('high')}
            className="mr-2"
          />
          <div className="flex items-center">
            <Settings className="h-4 w-4 text-primary mr-1" />
            <span className="text-sm">High (1080p)</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">Best quality</span>
        </label>
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">
        Lower quality reduces bandwidth usage and may improve performance on slower connections.
      </p>
    </div>
  );
};

export default VideoQualitySettings;