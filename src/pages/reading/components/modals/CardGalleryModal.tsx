import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Card as TarotCardType, Deck } from '../../../../types';
import { ReadingSessionState } from '../../../../stores/readingSessionStore';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

interface CardGalleryModalProps {
  isOpen: boolean; // Derived from sharedModalState.isOpen
  // onClose: () => void; // closeCardGallery will handle this by updating sharedModalState
  closeCardGallery: () => void;
  navigateGallery: (direction: 'prev' | 'next') => void;
  fetchCardDescription: (card: TarotCardType) => Promise<void>; // For the description button
  selectedCards: ReadingSessionState['selectedCards'];
  galleryCardIndex: number | null;
  showCardDescription: boolean; // From sharedModalState
  cardDescription: string; // Local state in ReadingRoom, passed as prop
  loadingDescription: boolean; // Local state in ReadingRoom, passed as prop
  isMobile: boolean;
  deck: Deck | null; // For context in description footer
  participantId: string | null; // For updating sharedModalState trigger
  updateSharedModalState: (modalState: ReadingSessionState['sharedModalState']) => void; // To toggle description view
  sharedModalState: ReadingSessionState['sharedModalState']; // Corrected type
}

const CardGalleryModal: React.FC<CardGalleryModalProps> = ({
  isOpen,
  closeCardGallery,
  navigateGallery,
  fetchCardDescription,
  selectedCards,
  galleryCardIndex,
  showCardDescription,
  cardDescription,
  loadingDescription,
  isMobile,
  deck,
  participantId,
  updateSharedModalState,
  sharedModalState
}) => {
  const [gallerySwipeStart, setGallerySwipeStart] = useState<{ x: number; y: number } | null>(null);

  const handleGalleryTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isOpen) return;
    const touch = e.touches[0];
    setGallerySwipeStart({ x: touch.clientX, y: touch.clientY });
  }, [isMobile, isOpen]);
  
  const handleGalleryTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isOpen || !gallerySwipeStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - gallerySwipeStart.x;
    const deltaY = touch.clientY - gallerySwipeStart.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        navigateGallery('prev');
      } else {
        navigateGallery('next');
      }
    }
    setGallerySwipeStart(null);
  }, [isMobile, isOpen, gallerySwipeStart, navigateGallery]);

  if (!isOpen || galleryCardIndex === null) return null;

  const currentCard = selectedCards[galleryCardIndex];
  if (!currentCard) return null;

  const revealedCardsCount = selectedCards.filter((c: any) => c?.revealed).length;
  const currentRevealedVisualIndex = selectedCards
    .slice(0, galleryCardIndex + 1)
    .filter((c: any) => c?.revealed).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className={`fixed inset-0 z-[100] ${isMobile ? 'bg-black' : 'bg-black/80'} flex items-center justify-center`}
          onClick={!isMobile ? closeCardGallery : undefined} // Backdrop click closes on desktop
        >
          <motion.div 
            className={`relative ${isMobile ? 'w-full h-full' : 'max-w-4xl max-h-[90vh] w-full mx-4'} ${!isMobile ? 'bg-card rounded-xl overflow-hidden shadow-2xl' : ''}`}
            initial={{ opacity: 0, scale: isMobile ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: isMobile ? 1 : 0.9 }}
            transition={{ duration: 0.3 }}
            onTouchStart={handleGalleryTouchStart}
            onTouchEnd={handleGalleryTouchEnd}
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing if content is clicked
          >
            {/* Gallery Header */}
            <div className={`${isMobile ? 'absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm' : 'bg-primary/10 border-b border-border'} p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <h3 className={`font-medium ${isMobile ? 'text-white' : 'text-foreground'}`}>
                  {currentCard.name}
                  {(currentCard as any).isReversed && ' (Reversed)'}
                </h3>
                <span className={`text-sm px-2 py-1 rounded-full ${isMobile ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {currentCard.position}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fetchCardDescription(currentCard)}
                  disabled={loadingDescription}
                  className={`p-2 rounded-full transition-colors ${
                    isMobile
                      ? 'text-white hover:bg-white/20 disabled:opacity-50' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50'
                  }`}
                  title="View card description"
                >
                  {loadingDescription ? <LoadingSpinner size="sm" /> : <FileText className="h-5 w-5" />}
                </button>
                <button 
                  onClick={closeCardGallery}
                  className={`p-2 rounded-full transition-colors ${isMobile ? 'text-white hover:bg-white/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Gallery Content */}
            <div className={`${isMobile ? 'h-full pt-16 pb-20' : 'p-6'} flex flex-col items-center justify-center relative`}>
              {revealedCardsCount > 1 && (
                <>
                  <button
                    onClick={() => navigateGallery('prev')}
                    className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full transition-all duration-200 ${isMobile ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-black/40 text-white hover:bg-black/60 opacity-70 hover:opacity-100'} backdrop-blur-sm`}
                    title="Previous card"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => navigateGallery('next')}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full transition-all duration-200 ${isMobile ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-black/40 text-white hover:bg-black/60 opacity-70 hover:opacity-100'} backdrop-blur-sm`}
                    title="Next card"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              <div className={`relative ${isMobile ? 'w-full max-w-sm h-full max-h-96' : 'w-80 h-[480px]'} mb-4`}>
                <motion.img 
                  key={galleryCardIndex} // Ensures re-animation on card change
                  src={currentCard.image_url} 
                  alt={currentCard.name}
                  className={`w-full h-full object-contain rounded-lg shadow-lg ${(currentCard as any).isReversed ? 'rotate-180' : ''}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {!showCardDescription && (
                <div className={`${isMobile ? 'px-4' : 'max-w-2xl'} text-center`}>
                  <p className={`${isMobile ? 'text-white/90 text-sm' : 'text-muted-foreground'} leading-relaxed`}>
                    {currentCard.description}
                  </p>
                  <p className={`${isMobile ? 'text-white/60 text-xs' : 'text-muted-foreground/60 text-sm'} mt-2`}>
                    Tap the description button above for detailed card meaning
                  </p>
                </div>
              )}

              <AnimatePresence>
                {showCardDescription && (
                  <motion.div
                    className={`absolute inset-0 ${isMobile ? 'bg-black/90' : 'bg-card/95'} backdrop-blur-sm rounded-lg flex flex-col`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={`${isMobile ? 'p-4 border-b border-white/20' : 'p-4 border-b border-border'} flex items-center justify-between`}>
                      <h4 className={`font-medium ${isMobile ? 'text-white' : 'text-foreground'}`}>Card Meaning</h4>
                      <button
                        onClick={() => {
                          if (sharedModalState) {
                            updateSharedModalState({
                              ...sharedModalState,
                              showDescription: false,
                              triggeredBy: participantId
                            });
                          }
                        }}
                        className={`p-1 rounded-full transition-colors ${isMobile ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className={`${isMobile ? 'text-white/90 text-sm' : 'text-foreground text-sm'} leading-relaxed space-y-3`}>
                        {cardDescription.split('\n').map((paragraph, index) => (
                          <p key={index} className="text-left">{paragraph}</p>
                        ))}
                      </div>
                    </div>
                    <div className={`${isMobile ? 'p-4 border-t border-white/20' : 'p-4 border-t border-border'} text-center`}>
                      <p className={`text-xs ${isMobile ? 'text-white/60' : 'text-muted-foreground'}`}>
                        {deck?.id === 'rider-waite-classic' || deck?.id === 'rider-waite' 
                          ? 'Traditional Rider-Waite interpretation'
                          : `Custom description from ${deck?.title || 'this deck'}`
                        }
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Gallery Footer Navigation */}
            <div className={`${isMobile ? 'absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm' : 'border-t border-border bg-muted/30'} p-4 flex items-center justify-between`}>
              <button 
                onClick={() => navigateGallery('prev')}
                disabled={revealedCardsCount <= 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isMobile ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-background border border-border hover:bg-muted'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">Previous</span>
              </button>
              <div className={`text-sm ${isMobile ? 'text-white/80' : 'text-muted-foreground'}`}>
                {revealedCardsCount > 0 ? `${currentRevealedVisualIndex} of ${revealedCardsCount}` : '0 of 0'}
              </div>
              <button 
                onClick={() => navigateGallery('next')}
                disabled={revealedCardsCount <= 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isMobile ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-background border border-border hover:bg-muted'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-sm">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Only Swipe Hints & Touch Areas */}
            {isMobile && revealedCardsCount > 1 && (
              <>
                <div className="absolute left-0 top-16 bottom-20 w-1/3 z-20" onClick={() => navigateGallery('prev')} />
                <div className="absolute right-0 top-16 bottom-20 w-1/3 z-20" onClick={() => navigateGallery('next')} />
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 p-4 pointer-events-none">
                  <div className="w-8 h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <ChevronLeft className="h-6 w-6 text-white/60" />
                  </div>
                </div>
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 p-4 pointer-events-none">
                  <div className="w-8 h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <ChevronRight className="h-6 w-6 text-white/60" />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CardGalleryModal; 