import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Maximize, Info, X, Loader } from 'lucide-react';
import { Card } from '../../types';

interface CardGalleryProps {
  cards: Card[];
  onRegenerateCard?: (cardId: string) => void;
  isRegenerating?: boolean;
  activeCardId?: string | null;
}

const CardGallery: React.FC<CardGalleryProps> = ({ 
  cards, 
  onRegenerateCard,
  isRegenerating = false,
  activeCardId = null
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const openCardDetails = (card: Card) => {
    setSelectedCard(card);
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedCard(null), 300);
  };
  
  return (
    <div>
      <AnimatePresence>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {cards.map((card) => (
            <motion.div 
              key={card.id}
              className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group"
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              onClick={() => openCardDetails(card)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              layout
            >
              <img 
                src={card.image_url} 
                alt={card.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-2">
                <h4 className="text-white text-sm font-medium mb-2 text-center">{card.name}</h4>
                
                {onRegenerateCard && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegenerateCard(card.id);
                    }}
                    className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center transition-colors hover:bg-primary/90 mb-1"
                    disabled={isRegenerating && activeCardId === card.id}
                  >
                    {isRegenerating && activeCardId === card.id ? (
                      <>
                        <span className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1"></span>
                        Regenerating
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </>
                    )}
                  </button>
                )}
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    openCardDetails(card);
                  }}
                  className="text-xs bg-secondary/80 text-secondary-foreground px-2 py-1 rounded-full flex items-center transition-colors hover:bg-secondary"
                >
                  <Maximize className="h-3 w-3 mr-1" />
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
      
      {/* Card Detail Modal */}
      {showModal && selectedCard && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <motion.div 
            className="bg-card rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
              <h3 className="font-serif font-bold">{selectedCard.name}</h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Card Image */}
              <div className="aspect-[2/3] md:max-h-[80vh] relative overflow-hidden">
                <img 
                  src={selectedCard.image_url}
                  alt={selectedCard.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Card Details */}
              <div className="p-6 overflow-y-auto max-h-[80vh] flex flex-col">
                <div className="flex-grow">
                  <h2 className="text-2xl font-serif font-bold mb-2">{selectedCard.name}</h2>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedCard.keywords?.map((keyword, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 bg-primary/20 rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  
                  <div className="prose prose-invert max-w-none">
                    <h3 className="text-lg font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground mb-4">{selectedCard.description}</p>
                    
                    <div className="bg-muted/20 rounded-lg p-4 mb-4 flex items-start gap-3">
                      <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">Card Interpretation</h4>
                        <p className="text-sm text-muted-foreground">
                          When this card appears in readings, it often represents 
                          {selectedCard.name === 'The Fool' && ' new beginnings, innocence, and spontaneity. Consider where in your life you might need to take a leap of faith.'}
                          {selectedCard.name === 'The Magician' && ' manifestation, resourcefulness, and power. Consider what resources you have available to manifest your desires.'}
                          {selectedCard.name === 'The High Priestess' && ' intuition, mystery, and the subconscious. Consider what hidden knowledge or insights might be available to you.'}
                          {selectedCard.name !== 'The Fool' && selectedCard.name !== 'The Magician' && selectedCard.name !== 'The High Priestess' && ' significant aspects of your journey and personal growth. Reflect on how its energy may be influencing your current situation.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border mt-4">
                  {onRegenerateCard && (
                    <button 
                      onClick={() => {
                        onRegenerateCard(selectedCard.id);
                        closeModal();
                      }}
                      className="btn btn-secondary w-full py-2 flex items-center justify-center"
                      disabled={isRegenerating && activeCardId === selectedCard.id}
                    >
                      {isRegenerating && activeCardId === selectedCard.id ? (
                        <>
                          <span className="h-4 w-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Regenerate This Card
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CardGallery;