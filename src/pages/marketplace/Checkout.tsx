import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Deck } from '../../types';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../../components/checkout/CheckoutForm';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const Checkout = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Fetch deck details
  useEffect(() => {
    const fetchDeckDetails = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would fetch from Supabase
        setTimeout(() => {
          // Mock data - would be replaced with actual API call
          const mockDeck: Deck = {
            id: '1',
            creator_id: 'user1',
            creator_name: 'MysticArtist',
            title: 'Celestial Journey',
            description: 'A cosmic-themed deck exploring the journey through celestial bodies and astral planes.',
            theme: 'cosmic',
            style: 'ethereal',
            card_count: 78,
            price: 12.99,
            cover_image: 'https://images.pexels.com/photos/1274260/pexels-photo-1274260.jpeg?auto=compress&cs=tinysrgb&w=1600',
            sample_images: [],
            created_at: '2023-10-15T14:30:00Z',
            updated_at: '2023-10-15T14:30:00Z',
            purchase_count: 124,
            rating: 4.7,
            is_nft: true,
          };
          
          setDeck(mockDeck);
          
          // Mock client secret for demo purposes
          // In a real app, this would be fetched from a serverless function that communicates with Stripe
          setClientSecret('mock_client_secret');
          
          setLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('Error fetching deck details:', error);
        setError('Failed to load checkout information. Please try again.');
        setLoading(false);
      }
    };
    
    fetchDeckDetails();
  }, [deckId]);
  
  // Handle mock payment success
  const handleMockPaymentSuccess = () => {
    setSuccess(true);
    
    // Redirect to collection page after 2 seconds
    setTimeout(() => {
      navigate('/collection');
    }, 2000);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing checkout...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !deck) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-serif mb-2">Checkout Error</h2>
        <p className="text-muted-foreground mb-6">{error || 'Unable to find the requested deck.'}</p>
        <Link to="/marketplace" className="btn btn-primary px-6 py-2">
          Return to Marketplace
        </Link>
      </div>
    );
  }
  
  // Success state
  if (success) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-serif mb-2">Purchase Successful!</h2>
        <p className="text-muted-foreground mb-6">Your deck has been added to your collection.</p>
        <p className="text-center mb-8">Redirecting to your collection...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back button */}
        <div className="mt-8 mb-6">
          <Link to={`/marketplace/${deckId}`} className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deck
          </Link>
        </div>
        
        <h1 className="text-3xl font-serif font-bold mb-8 text-center">Complete Your Purchase</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-24">
              <div className="p-6">
                <h2 className="text-xl font-serif font-bold mb-4">Order Summary</h2>
                
                <div className="flex mb-4">
                  <div className="w-20 h-24 rounded-md overflow-hidden mr-3">
                    <img 
                      src={deck.cover_image} 
                      alt={deck.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">{deck.title}</h3>
                    <p className="text-sm text-muted-foreground">{deck.card_count} cards</p>
                    <p className="text-sm text-muted-foreground">By {deck.creator_name}</p>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Price</span>
                    <span>${deck.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${(deck.price * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t border-border">
                    <span>Total</span>
                    <span>${(deck.price * 1.1).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment Form */}
          <div className="md:col-span-2">
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-xl font-serif font-bold mb-6 flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Information
              </h2>
              
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  {/* Mock payment form for demo */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Card Number</label>
                      <input 
                        type="text" 
                        placeholder="4242 4242 4242 4242" 
                        className="w-full p-2 rounded-md border border-input bg-background"
                        defaultValue="4242 4242 4242 4242"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Expiration Date</label>
                        <input 
                          type="text" 
                          placeholder="MM/YY" 
                          className="w-full p-2 rounded-md border border-input bg-background"
                          defaultValue="12/25"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">CVC</label>
                        <input 
                          type="text" 
                          placeholder="123" 
                          className="w-full p-2 rounded-md border border-input bg-background"
                          defaultValue="123"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Name on Card</label>
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        className="w-full p-2 rounded-md border border-input bg-background"
                        defaultValue={user?.username || ''}
                      />
                    </div>
                    
                    <div className="pt-4">
                      <button 
                        onClick={handleMockPaymentSuccess}
                        className="w-full btn btn-primary py-3 text-base font-medium"
                      >
                        Pay ${(deck.price * 1.1).toFixed(2)}
                      </button>
                      <p className="text-xs text-center mt-2 text-muted-foreground">
                        Your payment information is secure and encrypted
                      </p>
                    </div>
                  </div>
                </Elements>
              ) : (
                <p className="text-muted-foreground">Loading payment options...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;