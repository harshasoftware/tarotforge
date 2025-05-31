import React, { RefObject } from 'react';
import { motion, PanInfo } from 'framer-motion';
import {
  ZoomIn, ZoomOut, RotateCcw, ArrowUp, ChevronLeft, ChevronRight, ArrowDown, Shuffle, HelpCircle, XCircle
} from 'lucide-react';
import { Card, ReadingLayout } from '../../../types';
import { ReadingSessionState } from '../../../stores/readingSessionStore';
import TarotLogo from '../../../components/ui/TarotLogo';
import TarotCardBack from '../../../components/ui/TarotCardBack';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import Tooltip from '../../../components/ui/Tooltip';
import { getTransform } from '../utils/cardHelpers';
import { getPlatformShortcut } from '../constants/shortcuts';

interface DrawingScreenProps {
  isMobile: boolean;
  isLandscape: boolean;
  readingAreaRef: RefObject<HTMLDivElement>;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  zoomFocus: { x: number; y: number } | null;
  isSpacePressed: boolean;
  selectedLayout: ReadingLayout | null;
  selectedCards: ReadingSessionState['selectedCards'];
  shuffledDeck: Card[]; 
  sessionShuffledDeck: Card[];
  shouldUseSessionDeck: boolean;
  deckRefreshKey: number;
  draggedCard: Card | null;
  draggedCardIndex: number | null;
  isDragging: boolean;
  dragPosition: { x: number; y: number };
  hoveredPosition: number | null;
  draggedPlacedCardIndex: number | null;
  activeCardIndex: number | null;
  participantId: string | null;
  isGeneratingInterpretation: boolean;
  sessionIsGeneratingInterpretation: boolean;
  isShuffling: boolean;
  sessionIsShuffling: boolean;
  sessionLoadingStates: ReadingSessionState['loadingStates'];
  cardAnimationConfig: any; // Define more specifically if possible

  // Callbacks & Handlers
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  panDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  resetPan: () => void;
  shuffleDeck: () => void;
  toggleHelpModal: () => void;
  resetCards: () => void;
  handlePanStart: (clientX: number, clientY: number) => void;
  // handlePanMove is managed by useDocumentMouseListeners, not directly passed if that hook is used inside DrawingScreen or ReadingRoom
  // handlePanEnd is managed by useDocumentMouseListeners
  setZoomLevelWrapped: (level: number) => void; // For wheel zoom
  handleDragStart: (card: Card, index: number, e: any) => void;
  handleDragMove: (e: any) => void; // Only if not fully handled by useDocumentMouseListeners
  handleDragEnd: () => void;
  handleCardDrop: (positionIndex?: number, freePosition?: { x: number; y: number }) => void;
  handleFreeLayoutDrop: (e: any) => void;
  handlePlacedCardDragStart: (cardIndex: number) => void;
  handlePlacedCardDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, cardIndex: number) => void;
  handleCardFlip: (cardIndex: number) => void;
  handleCardDoubleClick: (cardIndex: number, event: React.MouseEvent) => void;
  handleCardDoubleTap: (cardIndex: number, event: React.TouchEvent) => void;
  updateSharedModalState: (modalState: ReadingSessionState['sharedModalState']) => void;
  setHoveredPosition: (index: number | null) => void; // Added this prop
}

const DrawingScreen: React.FC<DrawingScreenProps> = ({
  isMobile,
  isLandscape,
  readingAreaRef,
  zoomLevel,
  panOffset,
  zoomFocus,
  isSpacePressed,
  selectedLayout,
  selectedCards,
  shuffledDeck,
  sessionShuffledDeck,
  shouldUseSessionDeck,
  deckRefreshKey,
  draggedCard,
  draggedCardIndex,
  isDragging,
  dragPosition, // Needed if drawing dragged card representation here
  hoveredPosition,
  draggedPlacedCardIndex,
  activeCardIndex,
  participantId,
  isGeneratingInterpretation,
  sessionIsGeneratingInterpretation,
  isShuffling,
  sessionIsShuffling,
  sessionLoadingStates,
  cardAnimationConfig,
  zoomIn,
  zoomOut,
  resetZoom,
  panDirection,
  resetPan,
  shuffleDeck,
  toggleHelpModal,
  resetCards,
  handlePanStart, 
  setZoomLevelWrapped,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  handleCardDrop,
  handleFreeLayoutDrop,
  handlePlacedCardDragStart,
  handlePlacedCardDragEnd,
  handleCardFlip,
  handleCardDoubleClick,
  handleCardDoubleTap,
  updateSharedModalState,
  setHoveredPosition,
}) => {
  const currentDeckToDisplay = shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck;

  // Note: The main pan move/end logic is handled by useDocumentMouseListeners in ReadingRoom.
  //       If those listeners were to be moved into DrawingScreen, then handlePanMove/End would be needed here.
  //       Same for touch interactions for panning/zooming.

  return (
    <div className={`absolute inset-0 flex flex-col ${isMobile ? (isLandscape ? 'pt-8' : 'pt-12') : 'pt-20'}`}>
      <div 
        className="flex-1 relative" 
        ref={readingAreaRef}
        onDrop={selectedLayout?.id === 'free-layout' ? handleFreeLayoutDrop : undefined}
        onDragOver={(e) => {
          if (selectedLayout?.id === 'free-layout') {
            e.preventDefault();
          }
        }}
        onClick={(e) => {
          // This specific onClick might be tricky if it conflicts with card clicks
          // Original had: if (isDragging && draggedCard && selectedLayout?.id === 'free-layout') { handleFreeLayoutDrop(e); }
          // Consider if this is better handled by onDrop on the readingAreaRef itself.
        }}
        onMouseDown={(e) => {
          if (!isMobile && !isDragging && !draggedPlacedCardIndex && isSpacePressed) { // Check !draggedPlacedCardIndex too
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
          cursor: !isMobile && !isDragging && !draggedPlacedCardIndex ? (isSpacePressed ? 'grab' : 'default') : 'default' // Simplified cursor logic slightly
        }}
      >
        {/* Zoom controls */}
        <div className={`zoom-controls absolute ${
          isMobile 
            ? 'left-2 top-1/2 transform -translate-y-1/2 flex-col' 
            : 'top-4 left-4 flex-col'
        } flex gap-1 md:gap-2 bg-card/90 backdrop-blur-sm p-2 rounded-md z-40 items-center`}>
          <Tooltip content="Zoom in (+ / =)" position="right" disabled={isMobile}>
            <button onClick={zoomIn} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
              <ZoomIn className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Reset zoom (Z)" position="right" disabled={isMobile}>
            <button onClick={resetZoom} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Zoom out (- / _)" position="right" disabled={isMobile}>
            <button onClick={zoomOut} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
              <ZoomOut className="h-4 w-4" />
            </button>
          </Tooltip>
          
          {!isMobile && (
            <>
              <div className="w-full h-px bg-border my-2"></div>
              <div className="relative w-16 h-16 flex-shrink-0 mx-auto">
                <Tooltip content="Pan up (↑)" position="right" wrapperClassName="absolute top-0 left-1/2 transform -translate-x-1/2">
                  <button onClick={() => panDirection('up')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                </Tooltip>
                <Tooltip content="Pan left (←)" position="right" wrapperClassName="absolute left-0 top-1/2 transform -translate-y-1/2">
                  <button onClick={() => panDirection('left')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center">
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                </Tooltip>
                <Tooltip content="Reset pan to center (C / Enter)" position="right" wrapperClassName="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <button onClick={resetPan} className="w-5 h-5 bg-muted hover:bg-muted-foreground/20 rounded-full flex items-center justify-center transition-colors">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
                  </button>
                </Tooltip>
                <Tooltip content="Pan right (→)" position="right" wrapperClassName="absolute right-0 top-1/2 transform -translate-y-1/2">
                  <button onClick={() => panDirection('right')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </Tooltip>
                <Tooltip content="Pan down (↓)" position="right" wrapperClassName="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                  <button onClick={() => panDirection('down')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </Tooltip>
              </div>
              <div className="w-full h-px bg-border my-2"></div>
            </>
          )}
          
          <Tooltip content="Shuffle deck (Left Shift)" position="right" disabled={isMobile}>
            <button onClick={shuffleDeck} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
              <Shuffle className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content={`Show help (${getPlatformShortcut('help')})`} position="right" disabled={isMobile}>
            <button onClick={toggleHelpModal} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
              <HelpCircle className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content={`Reset cards (${getPlatformShortcut('reset', true)})`} position="right" disabled={isMobile}>
            <button onClick={resetCards} className="p-1.5 hover:bg-muted rounded-sm text-red-500 hover:text-red-600 flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        {/* Layout visualization */}
        <div 
          className="reading-content absolute inset-0 transition-transform duration-300 ease-in-out"
          style={{
            ...getTransform(zoomLevel, zoomFocus, panOffset),
            contain: 'layout style paint',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="flex items-center gap-3 opacity-15 transform scale-150">
              <TarotLogo className="w-12 h-12 text-foreground" />
              <span className="font-serif text-4xl font-bold tracking-wider text-foreground">TarotForge</span>
            </div>
          </div>
          {/* Free layout cards */}
          {selectedLayout?.id === 'free-layout' && selectedCards.map((selectedCard: any, index: number) => (
            <motion.div
              key={`free-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move"
              data-card-element="true"
              style={draggedPlacedCardIndex === index ? {
                zIndex: 50, 
                position: 'absolute',
              } : {
                left: `${selectedCard.x}%`,
                top: `${selectedCard.y}%`,
                zIndex: activeCardIndex === index ? 20 : 10 + index,
                position: 'absolute',
              }}
              drag
              dragMomentum={false}
              dragElastic={0}
              onDragStart={() => handlePlacedCardDragStart(index)} 
              onDragEnd={(event, info) => handlePlacedCardDragEnd(event, info, index)}
              whileHover={{ scale: 1.05 }}
              onDoubleClick={(e) => {
                if (!isMobile && (selectedCard as any).revealed) {
                  handleCardDoubleClick(index, e);
                }
              }}
              onTouchEnd={(e) => {
                if (isMobile) {
                  e.preventDefault();
                  handleCardDoubleTap(index, e);
                }
              }}
            >
              <motion.div 
                className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} shadow-lg cursor-pointer transition-shadow p-0.5 ${
                  activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''
                }`}
                animate={{ rotateY: (selectedCard as any).revealed ? 0 : 180 }}
                transition={cardAnimationConfig}
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
              >
                {(selectedCard as any).revealed ? (
                  <img 
                    src={selectedCard.image_url} 
                    alt={selectedCard.name} 
                    className={`w-full h-full object-cover rounded-md ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                  />
                ) : (
                  <TarotCardBack />
                )}
              </motion.div>
              <div 
                className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs cursor-move"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedCard.position} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
              </div>
            </motion.div>
          ))}

          {/* Predefined layout cards */}
          {selectedLayout?.id !== 'free-layout' && selectedLayout?.positions && selectedLayout.positions.map((position: any, index: number) => {
            const selectedCard = selectedCards[index];
            const isHovered = hoveredPosition === index && isDragging;
            const isCelticCross = selectedLayout?.id === 'celtic-cross';
            const isPresentPosition = isCelticCross && index === 0;
            const isChallengePosition = isCelticCross && index === 1;
            const presentCard = isCelticCross ? selectedCards[0] : null;
            const challengeCard = isCelticCross ? selectedCards[1] : null;
            let adjustedPosition = { ...position };
            if (isCelticCross && (isPresentPosition || isChallengePosition)) {
              if (isChallengePosition && !challengeCard) {
                adjustedPosition = { ...position, x: position.x + 5, y: position.y + 5 };
              } else if (presentCard && challengeCard) {
                if (isPresentPosition) adjustedPosition = { ...position };
                else if (isChallengePosition) adjustedPosition = { ...position };
              } else if (selectedCard) {
                adjustedPosition = { ...position };
              }
            }
            
            return (
              <div 
                key={position.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  left: `${adjustedPosition.x}%`, 
                  top: `${adjustedPosition.y}%`,
                  zIndex: selectedCard ? (10 + index) : (index === 1 ? 2 : 1) 
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoveredPosition(index);
                }}
                onDragLeave={() => setHoveredPosition(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedCard && !selectedCard) {
                    handleCardDrop(index);
                  }
                }}
                onClick={() => {
                  if (isDragging && draggedCard && !selectedCard) {
                    handleCardDrop(index);
                  }
                }}
                onTouchEnd={(e) => {
                  if (isMobile && isDragging && draggedCard && !selectedCard) {
                    e.preventDefault();
                    handleCardDrop(index);
                  }
                }}
              >
                {!selectedCard && (
                  <div 
                    className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} border-2 border-dashed ${
                      isHovered ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                    } rounded-md flex flex-col items-center justify-center transition-colors`}
                    style={{ 
                      transform: position.rotation ? `rotate(${position.rotation}deg)` : 'none',
                      transformOrigin: 'center center'
                    }}
                  >
                    <span className={`text-xs text-center px-1 ${isHovered ? 'text-primary' : 'text-muted-foreground'}`}>
                      {position.name}
                    </span>
                    {isHovered && (
                      <span className="text-xs text-primary mt-1">Drop here</span>
                    )}
                  </div>
                )}
                
                {selectedCard && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: activeCardIndex === index ? 1.1 : 1 }}
                    transition={cardAnimationConfig}
                    className={`relative ${
                      position.rotation === 90 
                        ? (isMobile ? 'w-24 h-16' : 'w-30 h-20 md:h-24 md:w-36')
                        : (isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36')
                    }`}
                    data-card-element="true"
                    onTouchEnd={(e) => {
                      if (isMobile) {
                        e.preventDefault();
                        handleCardDoubleTap(index, e);
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <motion.div 
                      className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} shadow-lg cursor-pointer p-0.5`}
                      style={{ transformOrigin: 'center center' }}
                      animate={{ rotateY: (selectedCard as any).revealed ? 0 : 180, rotateZ: position.rotation || 0 }}
                      transition={cardAnimationConfig}
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
                    >
                      {(selectedCard as any).revealed ? (
                        <img 
                          src={selectedCard.image_url} 
                          alt={selectedCard.name} 
                          className={`w-full h-full object-cover rounded-md ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                        />
                      ) : (
                        <TarotCardBack />
                      )}
                    </motion.div>
                    <div 
                      className={`absolute whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs cursor-move ${
                        position.rotation === 90 
                          ? '-right-16 top-1/2 transform -translate-y-1/2'
                          : '-bottom-6 left-1/2 transform -translate-x-1/2'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isMobile ? position.name.slice(0, 8) + (position.name.length > 8 ? '...' : '') : position.name} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}

          {selectedLayout?.id === 'free-layout' && isDragging && (
            <div className="absolute inset-0 border-2 border-dashed border-primary/30 bg-primary/5 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-primary mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-sm text-primary font-medium">Drop anywhere to place card</p>
              </div>
            </div>
          )}
        </div>
        
        {currentDeckToDisplay.length > 0 && (
          <motion.div 
            key={`deck-pile-${deckRefreshKey}`} 
            className={`deck-pile absolute ${isMobile ? 'bottom-4 left-0 right-0' : 'bottom-8 left-1/2 transform -translate-x-1/2'} z-20`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {isMobile ? (
              <div className="relative w-full h-28 overflow-x-auto flex justify-center">
                <div 
                  className="relative h-28 flex items-end justify-center"
                  style={{ width: `${currentDeckToDisplay.length * 8}px`, minWidth: '100%' }}
                >
                  {currentDeckToDisplay.map((card: Card, index: number) => {
                    const totalCards = currentDeckToDisplay.length;
                    const angle = (index - (totalCards - 1) / 2) * 1.2;
                    const radius = 200;
                    const x = Math.sin((angle * Math.PI) / 180) * radius;
                    const y = -Math.cos((angle * Math.PI) / 180) * radius * 0.12;
                    return (
                      <motion.div
                        key={`deck-mobile-${index}`}
                        className="absolute w-10 h-16 cursor-grab active:cursor-grabbing"
                        style={{ left: '50%', bottom: '0', transformOrigin: 'bottom center' }}
                        initial={{ transform: `translateX(-50%) translateX(${x}px) translateY(${y}px) rotate(${angle}deg)`, zIndex: totalCards - index }}
                        whileHover={{ transform: `translateX(-50%) translateX(${x}px) translateY(${y - 12}px) rotate(${angle}deg) scale(1.15)`, zIndex: 100, transition: { duration: 0.2 } }}
                        whileTap={{ scale: 0.9, transition: { duration: 0.1 } }}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(card, index, e)}
                        onMouseDown={(e) => handleDragStart(card, index, e)}
                        onTouchStart={(e) => handleDragStart(card, index, e)}
                        onMouseMove={handleDragMove} // Only needed if not fully handled by global listeners
                        onTouchMove={handleDragMove} // Only needed if not fully handled by global listeners
                        onTouchEnd={(e) => {
                          if (isMobile && isDragging) {
                            e.preventDefault();
                            handleFreeLayoutDrop(e);
                          }
                        }}
                      >
                        <TarotCardBack className="w-full h-full rounded-md shadow-lg hover:shadow-xl transition-shadow">
                          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-10">
                            <span className="text-xs font-serif tracking-wider" style={{ color: 'rgb(139 92 246 / 0.7)' }}>
                              {index < 5 ? 'Drag' : ''}
                            </span>
                          </div>
                        </TarotCardBack>
                        {index === Math.floor(totalCards / 2) && (
                          <div className="absolute -top-2 -right-1 bg-accent text-accent-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center shadow-md z-[300]">
                            {currentDeckToDisplay.length}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-muted-foreground">
                  ← Swipe to browse all {currentDeckToDisplay.length} cards →
                </div>
              </div>
            ) : (
              <div className="relative w-full h-36">
                {currentDeckToDisplay.map((card: Card, index: number) => {
                  const totalCards = currentDeckToDisplay.length;
                  const angle = (index - (totalCards - 1) / 2) * 2.2;
                  const radius = 600;
                  const x = Math.sin((angle * Math.PI) / 180) * radius;
                  const y = -Math.cos((angle * Math.PI) / 180) * radius * 0.08;
                  return (
                    <motion.div
                      key={`deck-desktop-${index}`}
                      className="absolute w-16 h-24 cursor-grab active:cursor-grabbing"
                      style={{ left: '50%', bottom: '0', transformOrigin: 'bottom center' }}
                      initial={{ transform: `translateX(-50%) translateX(${x}px) translateY(${y}px) rotate(${angle}deg)`, zIndex: totalCards - index }}
                      whileHover={{ transform: `translateX(-50%) translateX(${x}px) translateY(${y - 25}px) rotate(${angle}deg) scale(1.15)`, zIndex: 200, transition: { duration: 0.2, ease: "easeOut" } }}
                      whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(card, index, e)}
                      onMouseDown={(e) => handleDragStart(card, index, e)}
                      onTouchStart={(e) => handleDragStart(card, index, e)}
                      onMouseMove={handleDragMove} // Only needed if not fully handled by global listeners
                      onTouchMove={handleDragMove} // Only needed if not fully handled by global listeners
                      onTouchEnd={(e) => {
                        if (isDragging) {
                          e.preventDefault();
                          handleFreeLayoutDrop(e);
                        }
                      }}
                    >
                      <TarotCardBack className="w-full h-full rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-10">
                          <span className="text-xs font-serif tracking-wider" style={{ color: 'rgb(139 92 246 / 0.7)' }}>
                            {index < 20 ? 'Drag' : ''}
                          </span>
                        </div>
                      </TarotCardBack>
                    </motion.div>
                  );
                })}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground rounded-full w-8 h-8 text-sm flex items-center justify-center shadow-lg z-[300]">
                  {currentDeckToDisplay.length}
                </div>
              </div>
            )}
          </motion.div>
        )}
        
        {(isGeneratingInterpretation || sessionIsGeneratingInterpretation) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg text-center mx-4">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-muted-foreground text-sm md:text-base">
                {sessionLoadingStates?.triggeredBy && sessionLoadingStates.triggeredBy !== participantId
                  ? 'Another participant is generating interpretation...'
                  : 'Generating interpretation...'
                }
              </p>
            </div>
          </div>
        )}
        
        {(isShuffling || sessionIsShuffling) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg text-center mx-4">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-muted-foreground text-sm md:text-base">
                {sessionLoadingStates?.triggeredBy && sessionLoadingStates.triggeredBy !== participantId
                  ? 'Another participant is shuffling cards...'
                  : 'Shuffling cards...'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingScreen; 