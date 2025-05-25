import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Moon, Sun, User, UserCheck, Crown, WalletCards } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../stores/subscriptionStore';
import SignInModal from '../auth/SignInModal';
import TarotLogo from '../ui/TarotLogo';
import DeckQuotaBadge from '../ui/CreditBadge';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, signOut, showSignInModal, setShowSignInModal } = useAuthStore();
  const { isSubscribed } = useSubscription();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  
  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Toggle dark/light mode
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('light-theme');
  };
  
  // Toggle user dropdown
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-background/90 backdrop-blur-sm shadow-md' : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <TarotLogo className="h-6 w-6 text-accent" />
            <span className="text-xl font-serif font-bold">Tarot Forge</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/marketplace">Marketplace</NavLink>
            <NavLink to="/readers">Readers</NavLink>
            <NavLink to="/reading-room">Reading Room</NavLink>
            {user ? (
              <>
                <NavLink to="/collection">My Collection</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/pricing">Pricing</NavLink>
              </>
            )}
          </div>

          {/* Right side - Auth & Theme */}
          <div className="flex items-center space-x-2">
            {/* Deck Badge (Only show for authenticated users) */}
            {user && !isMobile && (
              <div className="relative mr-1">
                <DeckQuotaBadge showIcon={true} className="py-1" absolute={false} />
              </div>
            )}
            
            {/* Theme toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-accent" />
              ) : (
                <Moon className="h-5 w-5 text-primary" />
              )}
            </button>

            {/* Auth links */}
            {user ? (
              <div className="relative group" ref={dropdownRef}>
                <button 
                  onClick={toggleDropdown}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-secondary/50"
                >
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.username || 'User'} 
                      className="w-8 h-8 rounded-full object-cover border-2 border-accent"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <span className="hidden md:block text-sm font-medium">
                    {user.username || user.email.split('@')[0]}
                  </span>
                  {isSubscribed && (
                    <Crown className="h-4 w-4 text-primary hidden md:block" />
                  )}
                </button>
                
                {/* Dropdown Menu */}
                <div 
                  className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-card ${
                    dropdownOpen ? 'block' : 'hidden'
                  }`}
                >
                  <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-secondary/50">
                    Profile
                  </Link>
                  <Link to="/collection" className="block px-4 py-2 text-sm hover:bg-secondary/50">
                    My Collection
                  </Link>
                  <Link to="/subscription" className="block px-4 py-2 text-sm hover:bg-secondary/50 flex items-center">
                    {isSubscribed ? (
                      <>
                        <Crown className="h-4 w-4 mr-2 text-primary" />
                        Premium Membership
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2 text-muted-foreground" />
                        Upgrade to Premium
                      </>
                    )}
                  </Link>
                  {user.is_reader ? (
                    <Link to="/reader-dashboard" className="block px-4 py-2 text-sm hover:bg-secondary/50 flex items-center">
                      <UserCheck className="h-4 w-4 mr-2 text-accent" />
                      Reader Dashboard
                    </Link>
                  ) : (
                    <Link to="/become-reader" className="block px-4 py-2 text-sm hover:bg-secondary/50">
                      Become a Reader
                    </Link>
                  )}
                  <button 
                    onClick={signOut} 
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 text-destructive"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSignInModal(true)}
                className="btn btn-primary py-1.5 px-4 text-sm"
              >
                Sign In
              </button>
            )}

            {/* Mobile menu button */}
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="md:hidden p-2 rounded-md hover:bg-secondary/50 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-card shadow-lg"
          >
            <div className="px-4 py-5 space-y-5">
              <Link to="/marketplace" className="block py-2 px-4 rounded-md hover:bg-secondary/50">
                Marketplace
              </Link>
              <Link to="/readers" className="block py-2 px-4 rounded-md hover:bg-secondary/50">
                Readers
              </Link>
              <Link to="/reading-room" className="block py-2 px-4 rounded-md hover:bg-secondary/50">
                Reading Room
              </Link>
              {user ? (
                <>
                  <Link to="/collection" className="block py-2 px-4 rounded-md hover:bg-secondary/50">
                    My Collection
                  </Link>
                  <Link to="/profile" className="block py-2 px-4 rounded-md hover:bg-secondary/50">
                    Profile
                  </Link>
                  {user.is_reader ? (
                    <Link to="/reader-dashboard" className="block py-2 px-4 rounded-md hover:bg-secondary/50 flex items-center">
                      <UserCheck className="h-4 w-4 mr-2 text-accent" />
                      Reader Dashboard
                    </Link>
                  ) : (
                    <Link to="/become-reader" className="block py-2 px-4 rounded-md hover:bg-secondary/50">
                      Become a Reader
                    </Link>
                  )}
                  <button 
                    onClick={signOut} 
                    className="block w-full text-left py-2 px-4 rounded-md hover:bg-destructive/20 text-destructive"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/pricing" className="block py-2 px-4 rounded-md hover:bg-secondary/50">
                    Pricing
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowSignInModal(true);
                    }}
                    className="block w-full text-left py-2 px-4 rounded-md bg-primary text-primary-foreground"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};

// NavLink component with active state styling
const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm transition-colors relative ${
        isActive ? 'text-accent font-medium' : 'hover:text-accent'
      }`}
    >
      {children}
      {isActive && (
        <motion.span
          layoutId="navbar-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </Link>
  );
};

export default Navbar;