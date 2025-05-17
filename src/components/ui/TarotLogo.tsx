import React, { useState } from 'react';

interface TarotLogoProps {
  className?: string;
}

const TarotLogo: React.FC<TarotLogoProps> = ({ className = "h-8 w-8" }) => {
  const [isHovering, setIsHovering] = useState(false);
  
  return (
    <div 
      className="inline-block"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <img 
        src="/tarot-icon.svg" 
        alt="Tarot Forge Logo" 
        className={`transform transition-all duration-700 ${isHovering ? 'rotate-[360deg]' : 'rotate-0'} ${className}`}
      />
    </div>
  );
};

export default TarotLogo;