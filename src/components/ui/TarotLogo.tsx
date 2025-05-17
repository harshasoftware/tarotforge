import React from 'react';

interface TarotLogoProps {
  className?: string;
}

const TarotLogo: React.FC<TarotLogoProps> = ({ className = "h-8 w-8" }) => {
  return (
    <img 
      src="/tarot-icon.svg" 
      alt="Tarot Forge Logo" 
      className={`transition-transform duration-700 hover:rotate-360 ${className}`} 
    />
  );
};

export default TarotLogo;