import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, User, Zap, Eye, EyeOff, DollarSign } from 'lucide-react';
import TarotDeck from './TarotDeck';
import { Deck } from '../../types';

interface DeckPreviewProps {
  deck: Deck;
  showControls?: boolean; 
  onToggleListed?: (deckId: string) => void;
  onToggleSellable?: (deckId: string) => void;
}

const DeckPreview = ({ 
  deck,
  showControls = false,
  onToggleListed,
  onToggleSellable
}: DeckPreviewProps) => {
  const handleToggleListed = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleListed) {
      onToggleListed(deck.id);
    }
  };
  
  const handleToggleSellable = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleSellable) {
      onToggleSellable(deck.id);
    }
  };
  
  return (
    <Link to={`/marketplace/${deck.id}`}>
      <motion.div 
        className="group rounded-xl overflow-hidden bg-card border border-border hover:border-accent/50 transition-all duration-300"
        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden flex items-center justify-center">
          <TarotDeck 
            boxImage={deck.cover_image}
            cardImages={deck.sample_images && deck.sample_images.length > 0 ? deck.sample_images : [deck.cover_image]}
            deckName={deck.title}
            cardCount={deck.card_count}
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Price Tag */}
          {deck.is_free ? (
            <div className="absolute top-3 right-3 bg-success/90 text-success-foreground font-medium px-3 py-1 rounded-full text-sm flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              Free
            </div>
          ) : (
            <div className="absolute top-3 right-3 bg-accent/90 text-accent-foreground font-medium px-3 py-1 rounded-full text-sm">
              ${deck.price.toFixed(2)}
            </div>
          )}
          
          {/* NFT Badge */}
          {deck.is_nft && (
            <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground font-medium px-3 py-1 rounded-full text-xs">
              NFT
            </div>
          )}
          
          {/* Visibility & Sellable Controls (only when showControls=true) */}
          {showControls && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
              <button
                onClick={handleToggleListed}
                className={`p-2 rounded-full ${deck.is_listed ? 'bg-success/80' : 'bg-card/80'}`}
                title={deck.is_listed ? 'Listed in marketplace' : 'Not listed in marketplace'}
              >
                {deck.is_listed ? (
                  <Eye className="h-4 w-4 text-white" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              
              <button
                onClick={handleToggleSellable}
                className={`p-2 rounded-full ${deck.is_sellable ? 'bg-primary/80' : 'bg-success/80'}`}
                title={deck.is_sellable ? 'Paid deck' : 'Free deck'}
              >
                {deck.is_sellable ? (
                  <DollarSign className="h-4 w-4 text-white" />
                ) : (
                  <Zap className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-serif text-lg font-medium line-clamp-1">{deck.title}</h3>
            
            {deck.rating && (
              <div className="flex items-center text-accent">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm ml-1 font-medium">{deck.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
            {deck.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                <User className="h-3 w-3" />
              </div>
              <span className="text-xs ml-2 text-muted-foreground">
                By {deck.creator_name}
              </span>
            </div>
            
            <span className="text-xs text-muted-foreground">
              {deck.card_count} cards
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default DeckPreview;