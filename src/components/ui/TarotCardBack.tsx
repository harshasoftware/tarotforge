import React from 'react';

interface TarotCardBackProps {
  className?: string;
  children?: React.ReactNode;
}

const TarotCardBack: React.FC<TarotCardBackProps> = ({ className = "w-full h-full", children }) => {
  return (
    <div className={`${className} relative overflow-hidden`}>
      {/* Bohemian mystical card back design - whitish with violet */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-gray-100 to-slate-200">
        {/* Ornate border with corner decorations */}
        <div className="absolute inset-1 border border-violet-400/60 rounded-sm">
          {/* Corner moon crescents */}
          <div className="absolute top-1 left-1 text-violet-500/70">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C13.11 2 14 2.9 14 4C14 5.11 13.11 6 12 6C7.03 6 3 10.03 3 15C3 16.11 2.11 17 1 17C2.11 17 3 16.11 3 15C3 8.92 7.92 4 14 4C14 2.9 13.11 2 12 2Z"/>
            </svg>
          </div>
          <div className="absolute top-1 right-1 text-violet-500/70 transform rotate-90">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C13.11 2 14 2.9 14 4C14 5.11 13.11 6 12 6C7.03 6 3 10.03 3 15C3 16.11 2.11 17 1 17C2.11 17 3 16.11 3 15C3 8.92 7.92 4 14 4C14 2.9 13.11 2 12 2Z"/>
            </svg>
          </div>
          <div className="absolute bottom-1 left-1 text-violet-500/70 transform -rotate-90">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C13.11 2 14 2.9 14 4C14 5.11 13.11 6 12 6C7.03 6 3 10.03 3 15C3 16.11 2.11 17 1 17C2.11 17 3 16.11 3 15C3 8.92 7.92 4 14 4C14 2.9 13.11 2 12 2Z"/>
            </svg>
          </div>
          <div className="absolute bottom-1 right-1 text-violet-500/70 transform rotate-180">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C13.11 2 14 2.9 14 4C14 5.11 13.11 6 12 6C7.03 6 3 10.03 3 15C3 16.11 2.11 17 1 17C2.11 17 3 16.11 3 15C3 8.92 7.92 4 14 4C14 2.9 13.11 2 12 2Z"/>
            </svg>
          </div>

          {/* Central vertical line with celestial elements */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Top arrow */}
            <div className="text-violet-600/60 mb-1">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-3">
                <path d="M12 2L8 6H16L12 2Z"/>
              </svg>
            </div>
            
            {/* Vertical line with dots */}
            <div className="flex flex-col items-center space-y-1">
              <div className="w-px h-3 bg-violet-500/40"></div>
              <div className="w-1 h-1 bg-violet-600/60 rounded-full"></div>
              <div className="w-px h-2 bg-violet-500/40"></div>
              
              {/* Moon phases - central element */}
              <div className="flex flex-col items-center space-y-1">
                {/* Waxing crescent */}
                <div className="w-2 h-2 border border-violet-600/70 rounded-full relative">
                  <div className="absolute left-0 top-0 w-1 h-2 bg-violet-500/50 rounded-l-full"></div>
                </div>
                
                {/* Full moon */}
                <div className="w-3 h-3 bg-violet-500/60 rounded-full border border-violet-600/70"></div>
                
                {/* Waning crescent */}
                <div className="w-2 h-2 border border-violet-600/70 rounded-full relative">
                  <div className="absolute right-0 top-0 w-1 h-2 bg-violet-500/50 rounded-r-full"></div>
                </div>
              </div>
              
              <div className="w-px h-2 bg-violet-500/40"></div>
              <div className="w-1 h-1 bg-violet-600/60 rounded-full"></div>
              <div className="w-px h-3 bg-violet-500/40"></div>
            </div>
            
            {/* Bottom arrow */}
            <div className="text-violet-600/60 mt-1">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-3">
                <path d="M12 22L16 18H8L12 22Z"/>
              </svg>
            </div>
          </div>

          {/* Side decorative elements */}
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-violet-500/50">
            <div className="flex flex-col items-center space-y-2">
              {/* Diamond shapes */}
              <div className="w-2 h-2 border border-violet-500/50 rotate-45"></div>
              <div className="w-1 h-4 bg-violet-400/30"></div>
              <div className="w-2 h-2 border border-violet-500/50 rotate-45"></div>
            </div>
          </div>
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-violet-500/50">
            <div className="flex flex-col items-center space-y-2">
              {/* Star shapes */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2">
                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
              </svg>
              <div className="w-1 h-4 bg-violet-400/30"></div>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2">
                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Scattered stars background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-3 left-4 w-1 h-1 bg-violet-400/40 rounded-full"></div>
          <div className="absolute top-6 right-5 w-0.5 h-0.5 bg-violet-500/50 rounded-full"></div>
          <div className="absolute bottom-4 left-3 w-0.5 h-0.5 bg-violet-400/40 rounded-full"></div>
          <div className="absolute bottom-7 right-4 w-1 h-1 bg-violet-500/45 rounded-full"></div>
          <div className="absolute top-1/2 left-6 w-0.5 h-0.5 bg-violet-400/35 rounded-full"></div>
          <div className="absolute top-1/3 right-6 w-0.5 h-0.5 bg-violet-500/40 rounded-full"></div>
        </div>
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-15 bg-gradient-to-br from-violet-200/20 via-transparent to-gray-300/20"></div>
      </div>
      
      {/* Render children on top of the card back */}
      {children}
    </div>
  );
};

export default TarotCardBack; 