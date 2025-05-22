import { Link } from 'react-router-dom';
import { Github, Twitter, Instagram, Mail } from 'lucide-react';
import TarotLogo from '../ui/TarotLogo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-3">
              <TarotLogo className="h-6 w-6 text-accent" />
              <span className="text-xl font-serif font-bold">Tarot Forge</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Create and collect unique AI-generated tarot decks. 
              Express your spiritual creativity and connect with like-minded souls.
            </p>
            <div className="flex space-x-4 mt-4">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a 
                href="mailto:contact@tarotforge.xyz" 
                className="text-muted-foreground hover:text-accent transition-colors"
                aria-label="Email"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-1">
            <h3 className="font-serif text-base font-medium mb-3">Explore</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Browse Decks
                </Link>
              </li>
              <li>
                <<ScrollToTop className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Create Deck
                </ScrollToTop>
              </li>
              <li>
                <Link to="/reading-room" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Reading Room
                </Link>
              </li>
              <li>
                <Link to="/collection" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  My Collection
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="md:col-span-1">
            <h3 className="font-serif text-base font-medium mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Tarot Guides
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  AI & Creativity
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Creator Resources
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  API Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-1">
            <h3 className="font-serif text-base font-medium mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Licensing
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-muted-foreground">
              © {currentYear} Tarot Forge. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-2 md:mt-0">
              Powered by <span className="text-accent">AI</span> • Made with 💜
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;