import React, { useState } from 'react';

interface TarotLogoProps {
  className?: string;
}

const TarotLogo: React.FC<TarotLogoProps> = ({ className = "h-8 w-8" }) => {
  const [isHovering, setIsHovering] = useState(false);
  
  return (
    <div 
      className="inline-block perspective-[600px]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <img 
        src="/tarot-icon.svg" 
        alt="Tarot Forge Logo" 
        className={`transition-transform duration-700 ${className}`}
        style={{ 
          transform: isHovering ? 'rotateY(360deg)' : 'rotateY(0deg)'
        }}
      />
    </div>
  );
};

export default TarotLogo;