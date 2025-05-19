import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface QuizTimerProps {
  timeRemaining: number; // Time in seconds
  onTimeUp: () => void;
  isPaused?: boolean;
}

const QuizTimer: React.FC<QuizTimerProps> = ({ timeRemaining, onTimeUp, isPaused = false }) => {
  const [secondsLeft, setSecondsLeft] = useState(timeRemaining);
  const [isWarning, setIsWarning] = useState(false);
  
  // Format time to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage
  const progressPercentage = (secondsLeft / timeRemaining) * 100;
  
  useEffect(() => {
    // Check for warning state (less than 20% time remaining)
    setIsWarning(secondsLeft < timeRemaining * 0.2);
    
    // Timer countdown
    if (!isPaused && secondsLeft > 0) {
      const timer = setTimeout(() => {
        setSecondsLeft(secondsLeft - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (secondsLeft === 0) {
      // Call onTimeUp when timer reaches zero
      onTimeUp();
    }
  }, [secondsLeft, timeRemaining, isPaused, onTimeUp]);
  
  // Update secondsLeft if timeRemaining changes
  useEffect(() => {
    setSecondsLeft(timeRemaining);
  }, [timeRemaining]);
  
  return (
    <div className={`p-3 border rounded-lg ${
      isWarning ? 'border-warning bg-warning/10' : 'border-border bg-card/60'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center text-sm">
          <Clock className={`h-4 w-4 mr-1 ${isWarning ? 'text-warning' : 'text-muted-foreground'}`} />
          <span className={`font-medium ${isWarning ? 'text-warning' : ''}`}>Time Remaining</span>
        </div>
        
        <div className={`text-lg font-mono font-bold ${isWarning ? 'text-warning' : ''}`}>
          {formatTime(secondsLeft)}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
        <div 
          className={`h-2 rounded-full ${
            isWarning ? 'bg-warning animate-pulse' : 'bg-primary'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {/* Warning message */}
      {isWarning && (
        <div className="mt-2 flex items-center text-xs text-warning">
          <AlertCircle className="h-3 w-3 mr-1" />
          <span>Time is running out! Please finish soon.</span>
        </div>
      )}
    </div>
  );
};

export default QuizTimer;