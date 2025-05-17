import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card as CardType } from '../../types';

interface CardProps {
  card: CardType;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showInfo?: boolean;
  onClick?: () => void;
}

const Card = ({ card, size = 'md', interactive = true, showInfo = true, onClick }: CardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  const sizeClasses = {
    sm: 'w-24 md:w-32',
    md: 'w-48 md:w-56',
    lg: 'w-64 md:w-72',
  };
  
  const handleClick = () => {
    if (interactive) {
      setIsFlipped(!isFlipped);
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className={`${sizeClasses[size]} mx-auto`}>
      <div 
        className={`card-container ${isFlipped ? 'flipped' : ''}`}
        onClick={handleClick}
      >
        <motion.div 
          className="card-front"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <img 
            src={card.image_url} 
            alt={card.name} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {showInfo && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <h3 className="text-white font-serif text-sm md:text-base line-clamp-1">{card.name}</h3>
            </div>
          )}
        </motion.div>
        
        <div className="card-back bg-card p-4">
          <h3 className="font-serif text-base md:text-lg mb-2">{card.name}</h3>
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-[8]">
            {card.description}
          </p>
          <div className="mt-4">
            <div className="flex flex-wrap gap-1">
              {card.keywords.slice(0, 3).map((keyword, index) => (
                <span 
                  key={index} 
                  className="text-xs px-2 py-0.5 bg-primary/20 rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;