import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, ShoppingBag, Users, Check, ArrowLeft, Sparkles, XCircle } from 'lucide-react';
import { Deck, ReadingLayout } from '../../../types';
import TarotLogo from '../../../components/ui/TarotLogo';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { ModalStateControls } from '../hooks/useModalState'; // Assuming useModalState is in ../hooks

interface DeckSelectionScreenProps {
  isMobile: boolean;
  mobileLayoutClasses: { mainPadding: string }; // Be more specific if other parts are needed
  deckChangeMode: ModalStateControls;
  fetchAndSetDeck: (deckId: string) => Promise<void>;
  deckIdFromParams: string | undefined;
  selectedLayout: ReadingLayout | null;
  question: string;
  deckSelectionTab: 'collection' | 'marketplace';
  setDeckSelectionTab: (tab: 'collection' | 'marketplace') => void;
  collectionTabLabel: string;
  collectionContributors: string[];
  userOwnedDecks: Deck[];
  handleDeckChange: (deck: Deck) => Promise<void>;
  handleDeckSelect: (deck: Deck) => Promise<void>;
  loadingMarketplace: boolean;
  marketplaceDecks: Deck[];
  selectedMarketplaceDeck: Deck | null;
  selectMarketplaceDeck: (deckId: string | null) => void; // Function to set the ID for details view
  showSubscriptionRequired: boolean;
  addingToCollection: boolean;
  handleAddToCollection: (deck: Deck) => Promise<void>;
  handleMarketplaceDeckSelect: (deck: Deck) => void; // Function to trigger details view
}

const DeckSelectionScreen: React.FC<DeckSelectionScreenProps> = ({
  isMobile,
  mobileLayoutClasses,
  deckChangeMode,
  fetchAndSetDeck,
  deckIdFromParams,
  selectedLayout,
  question,
  deckSelectionTab,
  setDeckSelectionTab,
  collectionTabLabel,
  collectionContributors,
  userOwnedDecks,
  handleDeckChange,
  handleDeckSelect,
  loadingMarketplace,
  marketplaceDecks,
  selectedMarketplaceDeck,
  selectMarketplaceDeck,
  showSubscriptionRequired,
  addingToCollection,
  handleAddToCollection,
  handleMarketplaceDeckSelect,
}) => {
  return (
    <div 
      className={`absolute inset-0 z-[100] bg-black/50 flex items-center justify-center ${mobileLayoutClasses.mainPadding}`}
      onClick={deckChangeMode.isOpen ? () => {
        deckChangeMode.closeModal();
        fetchAndSetDeck(deckIdFromParams || 'rider-waite-classic');
      } : undefined}
    >
      <div 
        className={`w-full ${isMobile ? 'max-w-4xl max-h-full overflow-y-auto' : 'max-w-5xl'} ${isMobile ? 'p-3' : 'p-4 md:p-6'} bg-card border border-border rounded-xl shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with title and Create Deck button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl md:text-2xl'} font-serif font-bold`}>
              {deckChangeMode.isOpen ? 'Change Your Deck' : 'Choose Your Deck'}
            </h2>
            {deckChangeMode.isOpen && (
              <button
                onClick={() => {
                  deckChangeMode.closeModal();
                  fetchAndSetDeck(deckIdFromParams || 'rider-waite-classic');
                }}
                className="btn btn-ghost p-2 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            )}
          </div>
          <Link 
            to="/" // TODO: This should ideally go to a deck creation page, not home
            className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus className="h-4 w-4" />
            <span className={isMobile ? 'hidden sm:inline' : ''}>Create Deck</span>
          </Link>
        </div>

        {/* Subtitle */}
        <div className="text-center mb-6">
          <p className="text-muted-foreground text-sm md:text-base">
            {deckChangeMode.isOpen 
              ? `Select a different deck to continue your ${selectedLayout?.name || 'reading'}`
              : 'Select a tarot deck to begin your reading'}
          </p>
          {deckChangeMode.isOpen && selectedLayout && (
            <div className="mt-2 p-2 bg-muted/30 rounded-lg text-sm">
              <span className="text-accent">Current layout:</span> {selectedLayout.name}
              {question && <div className="text-xs text-muted-foreground mt-1">"{question}"</div>}
            </div>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-1 mb-6 bg-muted/30 p-1 rounded-lg">
          <button
            onClick={() => setDeckSelectionTab('collection')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              deckSelectionTab === 'collection'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <Package className="h-4 w-4" />
            {collectionTabLabel}
            {userOwnedDecks.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {userOwnedDecks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setDeckSelectionTab('marketplace')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              deckSelectionTab === 'marketplace'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Marketplace
            {loadingMarketplace && (
              <LoadingSpinner size="sm" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* My Collection Tab */}
          {deckSelectionTab === 'collection' && (
            <div>
              {collectionTabLabel === 'Our Collection' && collectionContributors.length > 1 && (
                <div className="mb-4 p-3 bg-muted/30 rounded-lg text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      Combined collection from: {collectionContributors.join(', ')}
                    </span>
                  </div>
                </div>
              )}
              {userOwnedDecks.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Decks in Collection</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {collectionTabLabel === 'Our Collection' 
                      ? "Your group doesn't have any decks in the collection yet. Browse the marketplace or create your own deck to get started."
                      : "You don't have any decks in your collection yet. Browse the marketplace or create your own deck to get started."
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setDeckSelectionTab('marketplace')}
                      className="btn btn-primary px-6 py-2 flex items-center gap-2"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Browse Marketplace
                    </button>
                    <Link to="/" className="btn btn-secondary px-6 py-2 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your Own
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {userOwnedDecks.map((ownedDeck) => (
                    <motion.div
                      key={ownedDeck.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => deckChangeMode.isOpen ? handleDeckChange(ownedDeck) : handleDeckSelect(ownedDeck)}
                    >
                      <div className="aspect-[3/4] bg-primary/10 overflow-hidden relative">
                        {ownedDeck.cover_image ? (
                          <img 
                            src={ownedDeck.cover_image} 
                            alt={ownedDeck.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <TarotLogo className="h-12 w-12 text-primary/50" />
                          </div>
                        )}
                        {ownedDeck.is_free && (
                          <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                            Free
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
                          {ownedDeck.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">by {ownedDeck.creator_name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{ownedDeck.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Marketplace Tab */}
          {deckSelectionTab === 'marketplace' && (
            <div>
              {loadingMarketplace ? (
                <div className="text-center py-12">
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading marketplace decks...</p>
                </div>
              ) : marketplaceDecks.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Marketplace Decks</h3>
                  <p className="text-muted-foreground mb-6">
                    No decks available in the marketplace at the moment.
                  </p>
                </div>
              ) : selectedMarketplaceDeck ? (
                /* Deck Details View */
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => selectMarketplaceDeck(null)} // Clears the selected deck for details view
                      className="btn btn-ghost p-2 hover:bg-muted rounded-md"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h3 className="text-lg font-medium">Deck Details</h3>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-32 h-48 rounded-lg overflow-hidden bg-primary/10">
                          {selectedMarketplaceDeck.cover_image ? (
                            <img
                              src={selectedMarketplaceDeck.cover_image}
                              alt={selectedMarketplaceDeck.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <TarotLogo className="h-16 w-16 text-primary/50" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h2 className="text-xl font-bold mb-1">{selectedMarketplaceDeck.title}</h2>
                          <p className="text-muted-foreground">by {selectedMarketplaceDeck.creator_name}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {selectedMarketplaceDeck.is_free ? (
                              <span className="bg-green-500/20 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                                Free
                              </span>
                            ) : (
                              <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
                                ${selectedMarketplaceDeck.price}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {selectedMarketplaceDeck.card_count} cards
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Theme & Style</h4>
                          <p className="text-sm text-muted-foreground">{selectedMarketplaceDeck.theme}</p>
                          <p className="text-sm text-muted-foreground">{selectedMarketplaceDeck.style}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedMarketplaceDeck.description}
                      </p>
                    </div>
                    {selectedMarketplaceDeck.sample_images && selectedMarketplaceDeck.sample_images.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Sample Cards</h4>
                        <div className="flex gap-2 overflow-x-auto">
                          {selectedMarketplaceDeck.sample_images.map((image, index) => (
                            <div key={index} className="flex-shrink-0 w-16 h-24 rounded-md overflow-hidden bg-primary/10">
                              <img
                                src={image}
                                alt={`Sample card ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedMarketplaceDeck.purchase_count > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {selectedMarketplaceDeck.purchase_count} users have added this deck
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {showSubscriptionRequired && (
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="flex items-center gap-2 text-warning">
                          <Sparkles className="h-4 w-4" /> {/* Changed from Zap for theme consistency */}
                          <span className="text-sm font-medium">Subscription Required</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          A premium subscription is required to add paid decks to your collection. Please upgrade your account.
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      {userOwnedDecks.find(d => d.id === selectedMarketplaceDeck.id) ? (
                        <button className="btn btn-secondary flex-1 py-3" disabled>
                          <Check className="h-4 w-4 mr-2" />
                          Already in Collection
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToCollection(selectedMarketplaceDeck)}
                          disabled={addingToCollection}
                          className="btn btn-primary flex-1 py-3"
                        >
                          {addingToCollection ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Adding to Collection...
                            </>
                          ) : selectedMarketplaceDeck.is_free ? (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add to Collection
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              Add for ${selectedMarketplaceDeck.price}
                            </>
                          )}
                        </button>
                      )}
                      {userOwnedDecks.find(d => d.id === selectedMarketplaceDeck.id) && (
                        <button
                          onClick={() => {
                            const ownedDeck = userOwnedDecks.find(d => d.id === selectedMarketplaceDeck.id);
                            if (ownedDeck) {
                              deckChangeMode.isOpen ? handleDeckChange(ownedDeck) : handleDeckSelect(ownedDeck);
                            }
                          }}
                          className="btn btn-secondary px-6 py-3"
                        >
                          Use This Deck
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Featured Decks
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {marketplaceDecks.map((marketplaceDeck) => (
                        <motion.div
                          key={marketplaceDeck.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer group relative"
                          onClick={() => handleMarketplaceDeckSelect(marketplaceDeck)}
                        >
                          <div className="aspect-[3/4] bg-primary/10 overflow-hidden relative">
                            {marketplaceDeck.cover_image ? (
                              <img 
                                src={marketplaceDeck.cover_image} 
                                alt={marketplaceDeck.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <TarotLogo className="h-12 w-12 text-primary/50" />
                              </div>
                            )}
                            {marketplaceDeck.is_free ? (
                              <div className="absolute top-2 right-2 bg-green-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                                Free
                              </div>
                            ) : (
                              <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                                ${marketplaceDeck.price}
                              </div>
                            )}
                            {userOwnedDecks.find(d => d.id === marketplaceDeck.id) && (
                              <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
                              {marketplaceDeck.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2">by {marketplaceDeck.creator_name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{marketplaceDeck.description}</p>
                            <div className="text-xs text-muted-foreground">
                              Click to view details
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckSelectionScreen; 