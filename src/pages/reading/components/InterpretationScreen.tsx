import React, { RefObject } from 'react';
import { motion } from 'framer-motion';
import {
  ZoomIn, ZoomOut, RotateCcw, ArrowUp, ChevronLeft, ChevronRight, ArrowDown, Shuffle, HelpCircle, XCircle, Info
} from 'lucide-react';
import { Card, ReadingLayout, Deck } from '../../../types';
import { ReadingSessionState as StoreReadingSessionState } from '../../../stores/readingSessionStore'; // Use alias if names clash, or ensure types are compatible
import TarotLogo from '../../../components/ui/TarotLogo';
import TarotCardBack from '../../../components/ui/TarotCardBack';
import Tooltip from '../../../components/ui/Tooltip';
import { getTransform, CleanedMarkdownLine } from '../utils/cardHelpers';
import { getPlatformShortcut } from '../constants/shortcuts';
import { ModalStateControls } from '../hooks/useModalState';

interface InterpretationScreenProps {
  isMobile: boolean;
  isLandscape: boolean;
  mobileInterpretationModal: ModalStateControls;
  readingAreaRef: RefObject<HTMLDivElement>; // Optional if card display is simple or different
  zoomLevel: number;
  panOffset: { x: number; y: number };
  zoomFocus: { x: number; y: number } | null;
  isSpacePressed: boolean;
  selectedLayout: ReadingLayout | null;
  selectedCards: StoreReadingSessionState['selectedCards'];
  activeCardIndex: number | null;
  interpretation: string;
  cardAnimationConfig: any; 
  participantId: string | null;
  deck?: Deck | null; // For card details if shown

  // Callbacks & Handlers
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  panDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  resetPan: () => void;
  shuffleDeck: () => void;
  toggleHelpModal: () => void;
  resetCards: () => void;
  resetReading: () => void;
  handlePanStart: (clientX: number, clientY: number) => void;
  setZoomLevelWrapped: (level: number) => void;
  setActiveCardIndexWrapped: (index: number | null) => void;
  setReadingStepWrapped: (step: 'setup' | 'drawing' | 'interpretation') => void;
  updateSharedModalState: (modalState: StoreReadingSessionState['sharedModalState']) => void;
  cleanMarkdownText: (text: string) => CleanedMarkdownLine[];
  handleCardFlip: (cardIndex: number) => void; // If cards can still be flipped
  handleCardDoubleClick: (cardIndex: number, event: React.MouseEvent) => void;
  handleCardDoubleTap: (cardIndex: number, event: React.TouchEvent) => void;
}

const InterpretationScreen: React.FC<InterpretationScreenProps> = ({
  isMobile,
  isLandscape,
  mobileInterpretationModal,
  readingAreaRef,
  zoomLevel,
  panOffset,
  zoomFocus,
  isSpacePressed,
  selectedLayout,
  selectedCards,
  activeCardIndex,
  interpretation,
  cardAnimationConfig,
  participantId,
  deck,
  zoomIn,
  zoomOut,
  resetZoom,
  panDirection,
  resetPan,
  shuffleDeck,
  toggleHelpModal,
  resetCards,
  resetReading,
  handlePanStart,
  setZoomLevelWrapped,
  setActiveCardIndexWrapped,
  setReadingStepWrapped,
  updateSharedModalState,
  cleanMarkdownText,
  handleCardFlip,
  handleCardDoubleClick,
  handleCardDoubleTap,
}) => {

  // Determine if the main card display area should be visible
  const showCardArea = isMobile ? (isLandscape && !mobileInterpretationModal.isOpen) : true;
  // Determine if the interpretation panel should be visible/take full width
  const showInterpretationPanel = isMobile ? mobileInterpretationModal.isOpen : true;
  const interpretationPanelWidthClass = isMobile ? 
    (isLandscape && !mobileInterpretationModal.isOpen ? 'w-2/5' : (mobileInterpretationModal.isOpen ? 'flex-1' : 'hidden')) 
    : 'w-2/5';

  return (
    <div className={`absolute inset-0 ${isMobile ? (isLandscape && !mobileInterpretationModal.isOpen ? 'flex pt-8' : 'flex-col pt-12') : 'flex pt-20'}`}>
      {/* Reading display area (cards) */}
      {showCardArea && (
        <div 
          className={`${isMobile ? (isLandscape && !mobileInterpretationModal.isOpen ? 'w-3/5' : (mobileInterpretationModal.isOpen ? 'hidden' : 'flex-1')) : 'w-3/5'} relative`}
          ref={readingAreaRef} // Pass ref if needed by interactions
          onMouseDown={(e) => {
            if (!isMobile && isSpacePressed) { // Simplified condition, assuming no card dragging here
              e.preventDefault();
              e.stopPropagation();
              handlePanStart(e.clientX, e.clientY);
            }
          }}
          onWheel={(e) => {
            if (!isMobile && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              const delta = e.deltaY;
              const zoomFactor = delta > 0 ? 0.9 : 1.1;
              const newZoom = Math.max(0.5, Math.min(2, zoomLevel * zoomFactor));
              setZoomLevelWrapped(newZoom);
            }
          }}
          style={{
            cursor: !isMobile && isSpacePressed ? 'grab' : 'default',
            // getTransform might be needed if zoom/pan applies here
            ...getTransform(zoomLevel, zoomFocus, panOffset),
            contain: 'layout style paint',
          }}
        >
          {/* Zoom controls (similar to DrawingScreen) */}
          <div className={`zoom-controls absolute ${
            isMobile 
              ? 'left-2 top-1/2 transform -translate-y-1/2 flex-col' 
              : 'top-4 left-4 flex-col'
          } flex gap-1 md:gap-2 bg-card/90 backdrop-blur-sm p-2 rounded-md z-40 items-center`}>
            <Tooltip content="Zoom out (- / _)" position="right" disabled={isMobile}>
              <button onClick={zoomOut} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><ZoomOut className="h-4 w-4" /></button>
            </Tooltip>
            <Tooltip content="Reset zoom (Z)" position="right" disabled={isMobile}>
              <button onClick={resetZoom} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><RotateCcw className="h-4 w-4" /></button>
            </Tooltip>
            <Tooltip content="Zoom in (+ / =)" position="right" disabled={isMobile}>
              <button onClick={zoomIn} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><ZoomIn className="h-4 w-4" /></button>
            </Tooltip>
            {!isMobile && (
              <>
                <div className="w-full h-px bg-border my-2"></div>
                <div className="relative w-16 h-16 flex-shrink-0 mx-auto">
                  <Tooltip content="Pan up (↑)" position="right" wrapperClassName="absolute top-0 left-1/2 transform -translate-x-1/2"><button onClick={() => panDirection('up')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"><ArrowUp className="h-3 w-3" /></button></Tooltip>
                  <Tooltip content="Pan left (←)" position="right" wrapperClassName="absolute left-0 top-1/2 transform -translate-y-1/2"><button onClick={() => panDirection('left')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"><ChevronLeft className="h-3 w-3" /></button></Tooltip>
                  <Tooltip content="Reset pan to center (C / Enter)" position="right" wrapperClassName="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"><button onClick={resetPan} className="w-5 h-5 bg-muted hover:bg-muted-foreground/20 rounded-full flex items-center justify-center transition-colors"><div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div></button></Tooltip>
                  <Tooltip content="Pan right (→)" position="right" wrapperClassName="absolute right-0 top-1/2 transform -translate-y-1/2"><button onClick={() => panDirection('right')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"><ChevronRight className="h-3 w-3" /></button></Tooltip>
                  <Tooltip content="Pan down (↓)" position="right" wrapperClassName="absolute bottom-0 left-1/2 transform -translate-x-1/2"><button onClick={() => panDirection('down')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"><ArrowDown className="h-3 w-3" /></button></Tooltip>
                </div>
                <div className="w-full h-px bg-border my-2"></div>
              </>
            )}
            <Tooltip content="Shuffle deck (Left Shift)" position="right" disabled={isMobile}><button onClick={shuffleDeck} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><Shuffle className="h-4 w-4" /></button></Tooltip>
            <Tooltip content={`Show help (${getPlatformShortcut('help')})`} position="right" disabled={isMobile}><button onClick={toggleHelpModal} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><HelpCircle className="h-4 w-4" /></button></Tooltip>
            <Tooltip content={`Reset cards (${getPlatformShortcut('reset', true)})`} position="right" disabled={isMobile}><button onClick={resetCards} className="p-1.5 hover:bg-muted rounded-sm text-red-500 hover:text-red-600 flex items-center justify-center"><XCircle className="h-4 w-4" /></button></Tooltip>
          </div>

          {/* Card layout with zoom applied */}
          <div 
            className="absolute inset-0 transition-transform duration-300 ease-in-out"
            style={{
              ...getTransform(zoomLevel, zoomFocus, panOffset),
              contain: 'layout style paint',
            }}
          >
            {selectedLayout?.id === 'free-layout' && selectedCards.map((selectedCard: any, index: number) => (
              <motion.div
                key={`free-interp-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: activeCardIndex === index ? 1.1 : 1 }}
                transition={cardAnimationConfig}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" // cursor-move removed as dragging not primary here
                data-card-element="true"
                style={{
                  left: `${selectedCard.x}%`,
                  top: `${selectedCard.y}%`,
                  zIndex: activeCardIndex === index ? 20 : 10 + index,
                }}
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  if ((selectedCard as any).revealed) {
                    updateSharedModalState({
                      isOpen: true,
                      cardIndex: index,
                      showDescription: false,
                      triggeredBy: participantId || null
                    });
                  } else {
                    handleCardFlip(index);
                  }
                }}
                onDoubleClick={(e) => !isMobile && (selectedCard as any).revealed && handleCardDoubleClick(index, e)}
                onTouchEnd={(e) => isMobile && handleCardDoubleTap(index, e)}
              >
                <motion.div 
                  className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg transition-shadow ${
                    activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''
                  }`}
                  animate={{ rotateY: (selectedCard as any).revealed ? 0 : 180 }}
                  transition={cardAnimationConfig}
                >
                  {(selectedCard as any).revealed ? (
                    <img 
                      src={selectedCard.image_url} 
                      alt={selectedCard.name} 
                      className={`w-full h-full object-cover ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                    />
                  ) : (
                    <TarotCardBack />
                  )}
                </motion.div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs">
                  {selectedCard.position} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
                </div>
              </motion.div>
            ))}

            {selectedLayout?.id !== 'free-layout' && selectedLayout && selectedLayout.positions.map((position: any, index: number) => {
              const selectedCard = selectedCards[index];
              if (!selectedCard) return null;
              const isCelticCross = selectedLayout?.id === 'celtic-cross';
              const isChallengePosition = isCelticCross && index === 1;
              const adjustedPosition = { ...position };
              
              return (
                <div 
                  key={position.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ 
                    left: `${adjustedPosition.x}%`, 
                    top: `${adjustedPosition.y}%`,
                    zIndex: activeCardIndex === index ? 20 : (isChallengePosition ? 12 : 10 + index)
                  }}
                >
                  <motion.div
                    className="relative cursor-pointer" // Added cursor-pointer
                    data-card-element="true"
                    onTouchEnd={(e) => isMobile && handleCardDoubleTap(index, e)}
                    whileHover={{ scale: 1.05 }}
                    animate={activeCardIndex === index ? { scale: 1.1 } : { scale: 1 }}
                    onClick={() => {
                        if ((selectedCard as any).revealed) {
                            updateSharedModalState({
                                isOpen: true,
                                cardIndex: index,
                                showDescription: false,
                                triggeredBy: participantId || null
                            });
                        } else {
                            handleCardFlip(index);
                        }
                    }}
                    onDoubleClick={(e) => !isMobile && (selectedCard as any).revealed && handleCardDoubleClick(index, e)}
                  >
                    <motion.div 
                      className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg`}
                      style={{ transform: position.rotation ? `rotate(${position.rotation}deg)` : 'none' }}
                      animate={{ rotateY: (selectedCard as any).revealed ? 0 : 180 }}
                      transition={cardAnimationConfig}
                    >
                      {(selectedCard as any).revealed ? (
                        <img 
                          src={selectedCard.image_url} 
                          alt={selectedCard.name} 
                          className={`w-full h-full object-contain p-0.5 ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                        />
                      ) : (
                        <TarotCardBack />
                      )}
                    </motion.div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs">
                      {isMobile ? position.name.slice(0, 8) + (position.name.length > 8 ? '...' : '') : position.name} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Reading controls overlay on card area */}
          <div className={`absolute ${isMobile ? 'top-2 right-2' : 'bottom-6 right-6'} flex gap-1 md:gap-3 z-30`}>
            <Tooltip content="View interpretation" position="left" disabled={isMobile}>
              <button 
                onClick={() => mobileInterpretationModal.toggleModal()} 
                className={`btn btn-primary px-2 py-1 text-xs ${!(isMobile && !isLandscape && !mobileInterpretationModal.isOpen) ? 'hidden' : ''}`}>
                <Info className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Return to card table" position="left" disabled={isMobile}>
              <button onClick={() => setReadingStepWrapped('drawing')} className={`btn btn-secondary ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 md:px-4 py-1.5 md:py-2 text-sm'}`}>
                {isMobile ? 'Back' : 'Back to Table'}
              </button>
            </Tooltip>
            <Tooltip content="Start a new reading" position="left" disabled={isMobile}>
              <button onClick={resetReading} className={`btn btn-ghost border border-input ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 md:px-4 py-1.5 md:py-2 text-sm'}`}>
                {isMobile ? 'New' : 'New Reading'}
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Interpretation panel */}
      {showInterpretationPanel && (
        <div className={`${interpretationPanelWidthClass} bg-card ${isMobile ? (isLandscape && !mobileInterpretationModal.isOpen ? 'border-l' : '') : 'border-l'} border-border flex flex-col h-full`}>
          <div className={`${isMobile ? 'p-2' : 'p-3 md:p-4'} border-b border-border bg-primary/5 flex justify-between items-center`}>
            <div className="flex items-center">
              <TarotLogo className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 md:h-5 md:w-5'} text-primary mr-2`} />
              <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm md:text-base'}`}>Reading Interpretation</h3>
            </div>
            <Tooltip content="Back to table" position="left" disabled={isMobile}>
              <button onClick={() => setReadingStepWrapped('drawing')} className={`text-muted-foreground hover:text-foreground ${isMobile ? 'hidden' : ''}`}>
                <XCircle className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
          
          <div className={`flex-1 ${isMobile ? 'p-2' : 'p-3 md:p-4'} overflow-y-auto`}>
            {activeCardIndex !== null && activeCardIndex !== undefined && selectedCards[activeCardIndex] && deck && (
              <div className={`${isMobile ? 'mb-3 p-2' : 'mb-4 md:mb-6 p-2 md:p-3'} bg-muted/30 border border-border rounded-lg`}>
                <div className={`flex ${isMobile ? 'gap-1' : 'gap-2 md:gap-3'}`}>
                  <div className={`shrink-0 ${isMobile ? 'w-8 h-12' : 'w-10 h-15 md:w-12 md:h-18'} p-0.5`}>
                    <img 
                      src={selectedCards[activeCardIndex].image_url} 
                      alt={selectedCards[activeCardIndex].name} 
                      className={`w-full h-full object-cover rounded-md ${selectedCards[activeCardIndex].isReversed ? 'rotate-180' : ''}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm md:text-base'}`}>{selectedCards[activeCardIndex].name} {selectedCards[activeCardIndex].isReversed && '(Reversed)'}</h4>
                    <p className="text-xs text-accent mb-1">{selectedCards[activeCardIndex].position}</p>
                    <p className="text-xs text-muted-foreground">{selectedCards[activeCardIndex].description}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {cleanMarkdownText(interpretation).map((line, i: number) => (
                <div key={i}>
                  {line.isHeader ? (
                    <h4 className={`font-semibold text-primary ${isMobile ? 'text-sm' : 'text-base'} mb-2`}>{line.content}</h4>
                  ) : line.isBullet ? (
                    <div className={`flex items-start gap-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ml-2`}>
                      <span className="text-primary mt-1">•</span>
                      <span>{line.content}</span>
                    </div>
                  ) : (
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground leading-relaxed`}>{line.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {selectedCards.length > 1 && (
            <div className={`${isMobile ? 'p-1' : 'p-2 md:p-3'} border-t border-border flex justify-between items-center`}>
              <Tooltip content="Previous card" position="top" disabled={isMobile}>
                <button 
                  onClick={() => {
                    const currentIndex = activeCardIndex ?? 0;
                    const newIndex = currentIndex > 0 ? currentIndex - 1 : selectedCards.length - 1;
                    setActiveCardIndexWrapped(newIndex);
                  }}
                  className={`btn btn-ghost ${isMobile ? 'p-0.5' : 'p-1'}`}>
                  <ChevronLeft className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </button>
              </Tooltip>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                {(activeCardIndex ?? 0) + 1} of {selectedCards.length} cards
              </div>
              <Tooltip content="Next card" position="top" disabled={isMobile}>
                <button 
                  onClick={() => {
                    const currentIndex = activeCardIndex ?? 0;
                    const newIndex = currentIndex < selectedCards.length - 1 ? currentIndex + 1 : 0;
                    setActiveCardIndexWrapped(newIndex);
                  }}
                  className={`btn btn-ghost ${isMobile ? 'p-0.5' : 'p-1'}`}>
                  <ChevronRight className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InterpretationScreen; 