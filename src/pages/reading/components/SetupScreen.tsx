import React from 'react';
import { Deck, ReadingLayout } from '../../../types';
import TarotLogo from '../../../components/ui/TarotLogo'; // Assuming path is correct

interface SetupScreenProps {
  isMobile: boolean;
  mobileLayoutClasses: { mainPadding: string }; // Or a more specific type if needed
  deck: Deck; // Deck must be present for this screen
  readingLayouts: ReadingLayout[];
  highlightedSetupLayoutIndex: number;
  setHighlightedSetupLayoutIndex: (index: number) => void;
  handleLayoutSelect: (layout: ReadingLayout) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({
  isMobile,
  mobileLayoutClasses,
  deck,
  readingLayouts,
  highlightedSetupLayoutIndex,
  setHighlightedSetupLayoutIndex,
  handleLayoutSelect,
}) => {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${mobileLayoutClasses.mainPadding}`}>
      <div className={`w-full ${isMobile ? 'max-w-2xl max-h-full overflow-y-auto' : 'max-w-md'} ${isMobile ? 'p-3' : 'p-4 md:p-6'} bg-card border border-border rounded-xl shadow-lg`}>
        {/* Deck info */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="w-10 h-14 rounded-md overflow-hidden bg-primary/10 shrink-0">
            {deck.cover_image ? (
              <img 
                src={deck.cover_image} 
                alt={deck.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TarotLogo className="h-4 w-4 text-primary/50" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{deck.title}</h3>
            <p className="text-xs text-muted-foreground">by {deck.creator_name || 'Unknown Creator'}</p>
          </div>
        </div>
        
        <h2 className={`${isMobile ? 'text-lg' : 'text-lg md:text-xl'} font-serif font-bold ${isMobile ? 'mb-3' : 'mb-4'}`}>Select a Layout</h2>
        
        <div className={`space-y-2 ${isMobile ? 'mb-3' : 'mb-4'}`}>
          {readingLayouts.map((layout, index) => (
            <div 
              key={layout.id}
              className={`border rounded-lg ${isMobile ? 'p-2' : 'p-3'} cursor-pointer transition-colors hover:border-accent/50 active:bg-accent/5 ${
                index === highlightedSetupLayoutIndex ? 'bg-accent/20 ring-2 ring-accent border-accent' : ''
              }`}
              onClick={() => handleLayoutSelect(layout)}
              onMouseEnter={() => setHighlightedSetupLayoutIndex(index)}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-sm md:text-base'}`}>{layout.name}</h4>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {layout.card_count === 999 ? 'Free' : `${layout.card_count} ${layout.card_count === 1 ? 'card' : 'cards'}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{layout.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SetupScreen; 