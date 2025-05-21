import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Stars } from 'lucide-react';
import TarotLogo from '../components/ui/TarotLogo';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

const Home = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();

  // Check for createDeck query parameter that indicates the user wants to create a deck
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const createDeck = params.get('createDeck');
    
    if (createDeck === 'true' && user) {
      // User came here with intent to create a deck, redirect them
      navigate('/create-deck');
    }
  }, [location, user, navigate]);

  return (
    <>
      {/* Hero Section */}
      <section className="min-h-[90vh] flex items-center relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.pexels.com/photos/1938348/pexels-photo-1938348.jpeg?auto=compress&cs=tinysrgb&w=1600')] bg-cover bg-center opacity-20"></div>
        </div>
        
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="flex justify-center mb-6">
                <TarotLogo className="h-16 w-16 text-accent" />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">
                Create Your Own <span className="text-accent">Magical</span> Tarot Decks
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Unleash your creativity with AI-powered tarot deck design. 
                Generate stunning cards, share your creations, or perform readings.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to={user ? '/create-deck' : '/pricing'} 
                  className="btn btn-primary px-6 py-3 text-lg font-medium flex items-center justify-center"
                >
                  <Stars className="mr-2 h-5 w-5" />
                  {user ? 'Create Your Deck' : 'Get Started'} 
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                
                <Link 
                  to="/marketplace" 
                  className="btn btn-secondary px-6 py-3 text-lg font-medium"
                >
                  Explore Marketplace
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-serif font-bold mb-4">Create, Collect, Connect</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for your tarot journey, all in one place.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'AI-Powered Creation',
                description: 'Design your own tarot decks with our AI image generation. Create cards that perfectly match your spiritual aesthetic.',
                icon: <Sparkles className="h-10 w-10 text-primary" />,
                cta: 'Start Creating',
                link: user ? '/create-deck' : '/pricing'
              },
              {
                title: 'Deck Marketplace',
                description: 'Discover and collect unique tarot decks created by our global community of artists and enthusiasts.',
                icon: <ShoppingCart className="h-10 w-10 text-accent" />,
                cta: 'Browse Decks',
                link: '/marketplace'
              },
              {
                title: 'Professional Readings',
                description: 'Connect with certified tarot readers for personal readings using your favorite decks.',
                icon: <Users className="h-10 w-10 text-primary" />,
                cta: 'Find a Reader',
                link: '/readers'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 + index * 0.1 }}
                className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-primary/10 rounded-full">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-serif font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground mb-6 min-h-[4.5rem]">{feature.description}</p>
                <Link to={feature.link} className="btn btn-outline w-full py-2">
                  {feature.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Search Banner */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/20 to-accent/20"></div>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="bg-card rounded-xl border border-border p-8 shadow-xl"
            >
              <h2 className="text-2xl font-serif font-bold text-center mb-6">
                Find Your Perfect Tarot Deck
              </h2>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search by theme, style, or creator..."
                  className="w-full pl-12 pr-4 py-3 rounded-full bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {['Celestial', 'Mythology', 'Nature', 'Gothic', 'Minimalist', 'Watercolor'].map((tag, index) => (
                  <button key={index} className="px-3 py-1.5 bg-secondary/50 rounded-full text-sm hover:bg-secondary/80 transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-center"
          >
            <h2 className="text-3xl font-serif font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Join our community of tarot enthusiasts and creators today.
            </p>
            <Link 
              to={user ? (isSubscribed ? '/create-deck' : '/subscription') : '/pricing'} 
              className="btn btn-primary px-8 py-3 text-lg font-medium"
            >
              {user 
                ? (isSubscribed ? 'Create Your First Deck' : 'Upgrade to Premium')
                : 'View Pricing Plans'
              }
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
};

// Icons for the features section
const Sparkles = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
};

const ShoppingCart = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
};

const Users = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
};

export default Home;