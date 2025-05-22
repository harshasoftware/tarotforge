import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Wand2, ShoppingBag, BookOpen, Hammer, ArrowRight, Zap, Video, Star, Camera, Users, Download, Shield, ChevronLeft, ChevronRight, RefreshCw, CreditCard, Check, Clock } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TarotLogo from '../components/ui/TarotLogo';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditContext';
import { generateThemeSuggestions } from '../lib/gemini-ai';
import CreditBadge from '../components/ui/CreditBadge';
import NavigateToHome from '../components/ui/NavigateToHome';

const featuredDecks = [
  {
    id: '1',
    creator_name: 'MysticArtist',
    title: 'Celestial Journey',
    description: 'A mystical deck featuring cosmic symbolism and celestial imagery',
    cover_image: 'https://images.pexels.com/photos/2792157/pexels-photo-2792157.jpeg',
    rating: 4.8,
    purchase_count: 156,
    is_free: false,
    price: 24.99
  },
  {
    id: '2',
    creator_name: 'NatureMage',
    title: 'Woodland Mysteries',
    description: 'Connect with nature through this enchanted forest-themed deck',
    cover_image: 'https://images.pexels.com/photos/15286/pexels-photo.jpg',
    rating: 4.7,
    purchase_count: 132,
    is_free: true,
    price: 0
  },
  {
    id: '3',
    creator_name: 'DreamWeaver',
    title: 'Urban Oracle',
    description: 'A modern take on traditional tarot with urban art influences',
    cover_image: 'https://images.pexels.com/photos/1707820/pexels-photo-1707820.jpeg',
    rating: 4.9,
    purchase_count: 198,
    is_free: false,
    price: 19.99
  }
];

const Home = () => {
  return (
    <div>
      <section className="py-12 md:py-24">
        <div className="container">
          <motion.div 
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2">Featured Decks</h2>
              <p className="text-xl text-muted-foreground">Discover unique tarot decks from our creators</p>
            </div>
            <Link 
              to="/marketplace" 
              className="mt-4 md:mt-0 btn btn-outline flex items-center"
            >
              View All Decks
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredDecks.map((deck, index) => (
              <motion.div
                key={deck.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img 
                    src={deck.cover_image} 
                    alt={deck.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
                        {deck.creator_name}
                      </span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-white mb-1">{deck.title}</h3>
                    <p className="text-sm text-white/80 line-clamp-2">{deck.description}</p>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">{deck.rating}</span>
                    <span className="text-sm text-muted-foreground">({deck.purchase_count})</span>
                  </div>
                  <div>
                    {deck.is_free ? (
                      <span className="text-sm font-medium text-primary">Free</span>
                    ) : (
                      <span className="text-sm font-medium">${deck.price}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;