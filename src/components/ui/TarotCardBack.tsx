import React from 'react';

interface TarotCardBackProps {
  className?: string;
  children?: React.ReactNode;
}

const TarotCardBack: React.FC<TarotCardBackProps> = ({ className = "w-full h-full", children }) => {
  return (
    <div className={`${className} relative overflow-hidden rounded-md border border-border bg-card min-w-[80px] min-h-[120px]`}>
      {/* Bohemian mystical card back design - responsive to app theme */}
      <div
        className="absolute inset-0 bg-card min-w-[80px] min-h-[120px]"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted)), hsl(var(--card)))'
        }}
      >
        {/* Ornate border with corner decorations */}
        <div 
          className="absolute inset-1 rounded-sm"
          style={{
            border: '1px solid rgb(139 92 246 / 0.4)'
          }}
        >
          {/* Corner moon crescents */}
          <div 
            className="absolute top-1 left-1"
            style={{ color: 'rgb(139 92 246 / 0.5)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C13.11 2 14 2.9 14 4C14 5.11 13.11 6 12 6C7.03 6 3 10.03 3 15C3 16.11 2.11 17 1 17C2.11 17 3 16.11 3 15C3 8.92 7.92 4 14 4C14 2.9 13.11 2 12 2Z"/>
            </svg>
          </div>
          <div 
            className="absolute top-1 right-1 transform rotate-90"
            style={{ color: 'rgb(139 92 246 / 0.5)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C13.11 2 14 2.9 14 4C14 5.11 13.11 6 12 6C7.03 6 3 10.03 3 15C3 16.11 2.11 17 1 17C2.11 17 3 16.11 3 15C3 8.92 7.92 4 14 4C14 2.9 13.11 2 12 2Z"/>
            </svg>
          </div>
          <div 
            className="absolute bottom-1 left-1 transform -rotate-90"
            style={{ color: 'rgb(139 92 246 / 0.5)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C13.11 2 14 2.9 14 4C14 5.11 13.11 6 12 6C7.03 6 3 10.03 3 15C3 16.11 2.11 17 1 17C2.11 17 3 16.11 3 15C3 8.92 7.92 4 14 4C14 2.9 13.11 2 12 2Z"/>
            </svg>
          </div>
          <div 
            className="absolute bottom-1 right-1 transform rotate-180"
            style={{ color: 'rgb(139 92 246 / 0.5)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C13.11 2 14 2.9 14 4C14 5.11 13.11 6 12 6C7.03 6 3 10.03 3 15C3 16.11 2.11 17 1 17C2.11 17 3 16.11 3 15C3 8.92 7.92 4 14 4C14 2.9 13.11 2 12 2Z"/>
            </svg>
          </div>

          {/* Central vertical line with celestial elements */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Top arrow */}
            <div 
              className="mb-1"
              style={{ color: 'rgb(139 92 246 / 0.4)' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-3">
                <path d="M12 2L8 6H16L12 2Z"/>
              </svg>
            </div>
            
            {/* Vertical line with dots */}
            <div className="flex flex-col items-center space-y-1">
              <div 
                className="w-px h-3"
                style={{ backgroundColor: 'rgb(139 92 246 / 0.25)' }}
              ></div>
              <div 
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: 'rgb(139 92 246 / 0.4)' }}
              ></div>
              <div 
                className="w-px h-2"
                style={{ backgroundColor: 'rgb(139 92 246 / 0.25)' }}
              ></div>
              
              {/* Moon phases - central element */}
              <div className="flex flex-col items-center space-y-1">
                {/* Waxing crescent */}
                <div 
                  className="w-2 h-2 rounded-full relative"
                  style={{ border: '1px solid rgb(139 92 246 / 0.5)' }}
                >
                  <div 
                    className="absolute left-0 top-0 w-1 h-2 rounded-l-full"
                    style={{ backgroundColor: 'rgb(139 92 246 / 0.3)' }}
                  ></div>
                </div>
                
                {/* Full moon */}
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: 'rgb(139 92 246 / 0.4)',
                    border: '1px solid rgb(139 92 246 / 0.5)'
                  }}
                ></div>
                
                {/* Waning crescent */}
                <div 
                  className="w-2 h-2 rounded-full relative"
                  style={{ border: '1px solid rgb(139 92 246 / 0.5)' }}
                >
                  <div 
                    className="absolute right-0 top-0 w-1 h-2 rounded-r-full"
                    style={{ backgroundColor: 'rgb(139 92 246 / 0.3)' }}
                  ></div>
                </div>
              </div>
              
              <div 
                className="w-px h-2"
                style={{ backgroundColor: 'rgb(139 92 246 / 0.25)' }}
              ></div>
              <div 
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: 'rgb(139 92 246 / 0.4)' }}
              ></div>
              <div 
                className="w-px h-3"
                style={{ backgroundColor: 'rgb(139 92 246 / 0.25)' }}
              ></div>
            </div>
            
            {/* Bottom arrow */}
            <div 
              className="mt-1"
              style={{ color: 'rgb(139 92 246 / 0.4)' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-3">
                <path d="M12 22L16 18H8L12 22Z"/>
              </svg>
            </div>
          </div>

          {/* Side decorative elements */}
          <div 
            className="absolute left-2 top-1/2 transform -translate-y-1/2"
            style={{ color: 'rgb(139 92 246 / 0.35)' }}
          >
            <div className="flex flex-col items-center space-y-2">
              {/* Diamond shapes */}
              <div 
                className="w-2 h-2 rotate-45"
                style={{ border: '1px solid rgb(139 92 246 / 0.35)' }}
              ></div>
              <div 
                className="w-1 h-4"
                style={{ backgroundColor: 'rgb(139 92 246 / 0.2)' }}
              ></div>
              <div 
                className="w-2 h-2 rotate-45"
                style={{ border: '1px solid rgb(139 92 246 / 0.35)' }}
              ></div>
            </div>
          </div>
          
          <div 
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            style={{ color: 'rgb(139 92 246 / 0.35)' }}
          >
            <div className="flex flex-col items-center space-y-2">
              {/* Star shapes */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2">
                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
              </svg>
              <div 
                className="w-1 h-4"
                style={{ backgroundColor: 'rgb(139 92 246 / 0.2)' }}
              ></div>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2">
                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Scattered stars background */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute top-3 left-4 w-1 h-1 rounded-full"
            style={{ backgroundColor: 'rgb(139 92 246 / 0.25)' }}
          ></div>
          <div 
            className="absolute top-6 right-5 w-0.5 h-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(139 92 246 / 0.3)' }}
          ></div>
          <div 
            className="absolute bottom-4 left-3 w-0.5 h-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(139 92 246 / 0.25)' }}
          ></div>
          <div 
            className="absolute bottom-7 right-4 w-1 h-1 rounded-full"
            style={{ backgroundColor: 'rgb(139 92 246 / 0.3)' }}
          ></div>
          <div 
            className="absolute top-1/2 left-6 w-0.5 h-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(139 92 246 / 0.2)' }}
          ></div>
          <div 
            className="absolute top-1/3 right-6 w-0.5 h-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(139 92 246 / 0.25)' }}
          ></div>
        </div>
        
        {/* Subtle texture overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(to bottom right, rgb(139 92 246 / 0.1), transparent, hsl(var(--muted) / 0.2))'
          }}
        ></div>
      </div>
      
      {/* Render children on top of the card back */}
      {children}
    </div>
  );
};

export default TarotCardBack; 