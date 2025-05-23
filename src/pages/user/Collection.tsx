import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, ShoppingBag, Filter, Package, Zap, Edit, Trash2, Eye, EyeOff, DollarSign } from 'lucide-react';
import DeckPreview from '../../components/ui/DeckPreview';
import { Deck } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { deleteDeckImages } from '../../lib/storage-utils';
import { fetchFreeDecks, fetchUserCreatedDecks } from '../../lib/deck-utils';
import { riderWaiteDeck } from '../data/riderWaiteDeck';

const Collection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'owned' | 'created' | 'free'>('owned');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownedDecks, setOwnedDecks] = useState<Deck[]>([]);
  const [createdDecks, setCreatedDecks] = useState<Deck[]>([]);
  const [freeDecks, setFreeDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updatingDeckId, setUpdatingDeckId] = useState<string | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Only proceed if user is logged in
        if (user) {
          // Fetch user-created decks
          const userDecks = await fetchUserCreatedDecks(user.id);
          setCreatedDecks(userDecks);
          
          // For owned decks, we would typically query a purchases table
          // For this example, we'll just use our created decks for now
          setOwnedDecks(userDecks);
        }
        
        // For free decks, fetch decks where is_free = true
        const freeDecksList = await fetchFreeDecks();
        setFreeDecks(freeDecksList);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user decks:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);
  
  // Filter decks based on search query
  const filteredOwnedDecks = ownedDecks.filter(deck => 
    deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deck.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredCreatedDecks = createdDecks.filter(deck => 
    deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deck.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFreeDecks = freeDecks.filter(deck => 
    deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deck.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Confirm delete modal
  const showConfirmDelete = (deckId: string) => {
    setDeletingDeckId(deckId);
    setShowDeleteModal(true);
  };
  
  // Delete a deck
  const deleteDeck = async () => {
    if (!deletingDeckId) return;
    
    try {
      // First delete all images from storage
      await deleteDeckImages(deletingDeckId);
      
      // Delete the deck from the database
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deletingDeckId);
        
      if (error) throw error;
      
      // Update state to remove the deleted deck
      setCreatedDecks(prev => prev.filter(deck => deck.id !== deletingDeckId));
      
      // Close the modal
      setShowDeleteModal(false);
      setDeletingDeckId(null);
    } catch (error) {
      console.error('Error deleting deck:', error);
    }
  };
  
  // Toggle deck visibility in marketplace
  const toggleDeckListed = async (deckId: string) => {
    try {
      setUpdatingDeckId(deckId);
      
      // Find the deck to update
      const deck = createdDecks.find(d => d.id === deckId);
      if (!deck) return;
      
      // Update the deck in Supabase
      const { error } = await supabase
        .from('decks')
        .update({
          is_listed: !deck.is_listed
        })
        .eq('id', deckId);
        
      if (error) throw error;
      
      // Update the local state
      setCreatedDecks(prev => prev.map(d => 
        d.id === deckId ? { ...d, is_listed: !d.is_listed } : d
      ));
    } catch (error) {
      console.error('Error toggling deck visibility:', error);
    } finally {
      setUpdatingDeckId(null);
    }
  };
  
  // Toggle deck sellability
  const toggleDeckSellable = async (deckId: string) => {
    try {
      setUpdatingDeckId(deckId);
      
      // Find the deck to update
      const deck = createdDecks.find(d => d.id === deckId);
      if (!deck) return;
      
      // Update values based on current state
      const newIsSellable = !deck.is_sellable;
      const newIsFreefqaaa = !newIsSellable;
      const newPrice = newIsSellable ? (deck.price > 0 ? deck.price : 9.99) : 0;
      
      // Update the deck in Supabase
      const { error } = await supabase
        .from('decks')
        .update({
          is_sellable: newIsSellable,
          is_free: newIsFreefqaaa,
          price: newPrice
        })
        .eq('id', deckId);
        
      if (error) throw error;
      
      // Update the local state
      setCreatedDecks(prev => prev.map(d => 
        d.id === deckId 
          ? { 
              ...d, 
              is_sellable: newIsSellable, 
              is_free: newIsFreefqaaa,
              price: newPrice
            } 
          : d
      ));
    } catch (error) {
      console.error('Error toggling deck sellability:', error);
    } finally {
      setUpdatingDeckId(null);
    }
  };

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 mt-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-1">Your Collection</h1>
            <p className="text-muted-foreground">
              Manage your purchased and created tarot decks
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link to="/marketplace" className="btn btn-secondary px-4 py-2 flex items-center">
              <ShoppingBag className="mr-2 h-5 w-5" />
              Shop Decks
            </Link>
            <Link to="/" className="btn btn-primary px-4 py-2 flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Create Deck
            </Link>
          </div>
        </div>
        
        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex border border-border rounded-lg p-1 overflow-x-auto">
            <button 
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'owned' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-secondary/50'
              }`}
              onClick={() => setActiveTab('owned')}
            >
              Purchased ({ownedDecks.length})
            </button>
            <button 
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'created' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-secondary/50'
              }`}
              onClick={() => setActiveTab('created')}
            >
              Created ({createdDecks.length})
            </button>
            <button 
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                activeTab === 'free' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-secondary/50'
              }`}
              onClick={() => setActiveTab('free')}
            >
              <Zap className="mr-1 h-4 w-4" />
              Free Decks ({freeDecks.length})
            </button>
          </div>
          
          <div className="relative w-full sm:w-auto min-w-[250px]">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
            <input 
              type="text"
              placeholder="Search your decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        
        {/* Decks Grid */}
        {activeTab === 'owned' ? (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-card border border-border">
                    <div className="aspect-[3/4] bg-primary/10 animate-pulse" />
                    <div className="p-4">
                      <div className="h-6 w-2/3 bg-muted/30 rounded animate-pulse mb-4" />
                      <div className="h-4 bg-muted/30 rounded animate-pulse mb-2" />
                      <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOwnedDecks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOwnedDecks.map((deck, index) => (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <DeckPreview deck={deck} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No purchased decks found</h3>
                {searchQuery ? (
                  <p className="text-muted-foreground">
                    No decks match your search. Try different keywords or clear your search.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      You haven't purchased any decks yet. Explore the marketplace to find unique decks.
                    </p>
                    <Link to="/marketplace" className="btn btn-primary px-6 py-2 inline-flex items-center">
                      Browse Marketplace
                      <ShoppingBag className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        ) : activeTab === 'created' ? (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-card border border-border">
                    <div className="aspect-[3/4] bg-primary/10 animate-pulse" />
                    <div className="p-4">
                      <div className="h-6 w-2/3 bg-muted/30 rounded animate-pulse mb-4" />
                      <div className="h-4 bg-muted/30 rounded animate-pulse mb-2" />
                      <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCreatedDecks.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg bg-card/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Managing Your Decks</h3>
                      <p className="text-sm text-muted-foreground">
                        You can control the visibility and pricing of your decks using the controls below each deck.
                        Toggle <span className="inline-flex items-center"><Eye className="h-3 w-3 mx-1" /></span> 
                        to show/hide your deck in the marketplace and
                        <span className="inline-flex items-center"><DollarSign className="h-3 w-3 mx-1" /></span>
                        to set it as free or paid.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCreatedDecks.map((deck, index) => (
                    <motion.div
                      key={deck.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="relative group"
                    >
                      {/* Deck Card */}
                      <DeckPreview 
                        deck={deck} 
                        showControls={true}
                        onToggleListed={toggleDeckListed} 
                        onToggleSellable={toggleDeckSellable}
                      />
                      
                      {/* Quick Actions */}
                      <div className="absolute top-3 right-3 flex space-x-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          to={`/edit-deck/${deck.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 bg-primary/90 rounded-full text-primary-foreground"
                          title="Edit Deck"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showConfirmDelete(deck.id);
                          }}
                          className="p-2 bg-destructive/90 rounded-full text-destructive-foreground"
                          title="Delete Deck"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Loading overlay */}
                      {updatingDeckId === deck.id && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl z-20">
                          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No created decks found</h3>
                {searchQuery ? (
                  <p className="text-muted-foreground">
                    No decks match your search. Try different keywords or clear your search.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      You haven't created any decks yet. Start creating your own mystical tarot deck.
                    </p>
                    <Link to="/" className="btn btn-primary px-6 py-2 inline-flex items-center">
                      Create New Deck
                      <Plus className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Free decks tab
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFreeDecks.map((deck, index) => (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <DeckPreview deck={deck} />
              </motion.div>
            ))}
            {filteredFreeDecks.length === 0 && (
              <div className="text-center py-16 col-span-3">
                <Filter className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No free decks match your search</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or clear the search filter.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <motion.div 
            className="bg-card rounded-xl overflow-hidden max-w-md w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6">
              <h3 className="text-xl font-medium mb-4">Delete Deck</h3>
              <p className="mb-6">
                Are you sure you want to delete this deck? This action cannot be undone and all cards associated with this deck will be permanently removed.
              </p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="btn btn-ghost border border-input px-4 py-2"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteDeck} 
                  className="btn bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Collection;