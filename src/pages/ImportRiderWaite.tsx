import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check, AlertCircle, Loader, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import TarotLogo from '../components/ui/TarotLogo';

const ImportRiderWaite = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [cardsProcessed, setCardsProcessed] = useState(0);

  // Start import process
  const startImport = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProgress(10);

      // Get auth token for the function call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please login again.');
      }

      setProgress(25);
      
      // Call our Supabase Edge Function
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-rider-waite`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          createNew: true
        })
      });

      setProgress(75);
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to import Rider-Waite deck. Please try again.');
      }

      // Success! Update state
      setDeckId(data.deckId);
      setCardsProcessed(data.cardsProcessed);
      setSuccess(true);
      setProgress(100);

    } catch (error) {
      console.error('Error importing Rider-Waite deck:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        {/* Back button */}
        <div className="mt-8 mb-6">
          <Link to="/collection" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Link>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 p-8 text-center">
              <div className="w-16 h-16 bg-card/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                <TarotLogo className="h-8 w-8 text-accent" />
              </div>
              <h1 className="text-3xl font-serif font-bold mb-3">Import Rider-Waite Tarot Deck</h1>
              <p className="text-muted-foreground">
                Create a free Rider-Waite tarot deck in your collection using the classic public domain card images
              </p>
            </div>
            
            <div className="p-8">
              {!success ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-medium mb-3">About The Rider-Waite Deck</h2>
                    <p className="text-muted-foreground mb-4">
                      The Rider-Waite tarot deck is one of the most popular tarot decks in use today. First published in 1909, it was drawn by artist Pamela Colman Smith under the direction of Arthur Edward Waite. This iconic deck has influenced countless others and is considered the standard for tarot readings worldwide.
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg" 
                        alt="The Fool" 
                        className="rounded-md w-full aspect-[2/3] object-cover"
                      />
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg" 
                        alt="The Magician" 
                        className="rounded-md w-full aspect-[2/3] object-cover"
                      />
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/3/3a/RWS_Tarot_02_High_Priestess.jpg" 
                        alt="The High Priestess" 
                        className="rounded-md w-full aspect-[2/3] object-cover"
                      />
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg" 
                        alt="The Empress" 
                        className="rounded-md w-full aspect-[2/3] object-cover"
                      />
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-lg mb-6">
                      <h3 className="font-medium mb-2 flex items-center">
                        <AlertCircle className="h-4 w-4 text-primary mr-2" />
                        Important Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        This process will import all 78 cards from the classic Rider-Waite tarot deck into your collection as a free deck. The images come from Wikimedia Commons where they are hosted as public domain images. The import process may take a minute to complete.
                      </p>
                    </div>
                    
                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-medium text-destructive mb-1">Import Failed</h3>
                            <p className="text-sm text-destructive/90">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {loading && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Importing Rider-Waite Deck...</span>
                          <span className="text-sm">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out" 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={startImport}
                      disabled={loading}
                      className="w-full btn btn-primary py-2 flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Importing Deck...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Import Rider-Waite Deck
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                  <h2 className="text-xl font-medium mb-2">Import Successful!</h2>
                  <p className="text-muted-foreground mb-6">
                    The Rider-Waite tarot deck has been successfully imported to your collection with {cardsProcessed} cards.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link 
                      to="/collection" 
                      className="btn btn-secondary py-2 px-6"
                    >
                      View My Collection
                    </Link>
                    
                    {deckId && (
                      <Link 
                        to={`/reading-room/${deckId}`}
                        className="btn btn-primary py-2 px-6 flex items-center justify-center"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Start Reading
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ImportRiderWaite;