import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Calendar, Clock, Video, BookOpen, Crown, Heart, Sun, Flame, Sparkles, Circle, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User as UserType, Deck } from '../../types'; // Added Deck type
import TarotLogo from '../ui/TarotLogo';
import { fetchUserOwnedDecks } from '../../lib/deck-utils'; // Import fetchUserOwnedDecks

interface ReaderCardProps {
  reader: UserType;
}

const ReaderCard: React.FC<ReaderCardProps> = ({ reader }) => {
  // Calculate how long they've been a reader
  const getReaderSince = () => {
    if (!reader.reader_since) return 'New Reader';
    
    const readerDate = new Date(reader.reader_since);
    const now = new Date();
    
    const monthsDiff = (now.getFullYear() - readerDate.getFullYear()) * 12 + 
                       (now.getMonth() - readerDate.getMonth());
    
    if (monthsDiff < 1) return 'New Reader';
    if (monthsDiff < 12) return `${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`;
    
    const years = Math.floor(monthsDiff / 12);
    return `${years} year${years > 1 ? 's' : ''}`;
  };
  
  // Generate some placeholder "specialties" for the reader
  const getReaderSpecialties = () => {
    const allSpecialties = [
      'Love & Relationships', 'Career Guidance', 'Spiritual Growth',
      'Past Life Readings', 'Shadow Work', 'Life Purpose',
      'Decision Making', 'Ancestral Guidance', 'Energy Healing',
      'Chakra Alignment', 'Higher Self Connection', 'Manifestation'
    ];
    
    const idSum = reader.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const specialtyCount = (idSum % 3) + 2; // 2-4 specialties
    const specialties = [];
    
    for (let i = 0; i < specialtyCount; i++) {
      const index = (idSum + i * 17) % allSpecialties.length;
      specialties.push(allSpecialties[index]);
    }
    
    return specialties;
  };

  const specialties = getReaderSpecialties();
  
  const getReaderLevelInfo = () => {
    if (!reader.readerLevel) {
      return {
        name: 'Novice Seer',
        colorTheme: 'red',
        icon: 'flame',
        pricePerMinute: 0.25
      };
    }
    
    return {
      name: reader.readerLevel.name,
      colorTheme: reader.readerLevel.color_theme || 'red',
      icon: reader.readerLevel.icon || 'flame',
      pricePerMinute: reader.custom_price_per_minute !== undefined && reader.custom_price_per_minute !== null
        ? reader.custom_price_per_minute 
        : reader.readerLevel.base_price_per_minute
    };
  };
  
  const levelInfo = getReaderLevelInfo();

  const [ownedDecks, setOwnedDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState<boolean>(true);

  useEffect(() => {
    if (reader.id) {
      const loadDecks = async () => {
        setLoadingDecks(true);
        try {
          const decks = await fetchUserOwnedDecks(reader.id);
          setOwnedDecks(decks);
        } catch (error) {
          console.error("Error fetching reader's decks:", error);
          setOwnedDecks([]); 
        }
        setLoadingDecks(false);
      };
      loadDecks();
    } else {
      setOwnedDecks([]);
      setLoadingDecks(false);
    }
  }, [reader.id]);
  
  const getLevelColor = () => {
    switch (levelInfo.colorTheme) {
      case 'red': return 'text-red-500 border-red-500';
      case 'orange': return 'text-orange-500 border-orange-500';
      case 'yellow': return 'text-yellow-500 border-yellow-500';
      case 'green': return 'text-green-500 border-green-500';
      case 'blue': return 'text-blue-500 border-blue-500';
      case 'indigo': return 'text-indigo-500 border-indigo-500';
      case 'violet': return 'text-violet-500 border-violet-500';
      default: return 'text-accent border-accent';
    }
  };
  
  const getLevelGradient = () => {
    switch (levelInfo.colorTheme) {
      case 'red': return 'from-red-500/5 to-transparent';
      case 'orange': return 'from-orange-500/5 to-transparent';
      case 'yellow': return 'from-yellow-500/5 to-transparent';
      case 'green': return 'from-green-500/5 to-transparent';
      case 'blue': return 'from-blue-500/5 to-transparent';
      case 'indigo': return 'from-indigo-500/5 to-transparent';
      case 'violet': return 'from-violet-500/5 to-transparent';
      default: return 'from-accent/5 to-transparent';
    }
  };

  const getLevelBorder = () => {
    switch (levelInfo.colorTheme) {
      case 'red': return 'hover:border-red-500/50';
      case 'orange': return 'hover:border-orange-500/50';
      case 'yellow': return 'hover:border-yellow-500/50';
      case 'green': return 'hover:border-green-500/50';
      case 'blue': return 'hover:border-blue-500/50';
      case 'indigo': return 'hover:border-indigo-500/50';
      case 'violet': return 'hover:border-violet-500/50';
      default: return 'hover:border-accent/50';
    }
  };
  
  const getLevelIcon = () => {
    switch (levelInfo.icon) {
      case 'flame': return <Flame className="h-4 w-4" />;
      case 'sparkles': return <Sparkles className="h-4 w-4" />;
      case 'sun': return <Sun className="h-4 w-4" />;
      case 'heart': return <Heart className="h-4 w-4" />;
      case 'crown': return <Crown className="h-4 w-4" />;
      default: return <Flame className="h-4 w-4" />;
    }
  };
  
  const getAvatarBorder = () => {
    switch (levelInfo.colorTheme) {
      case 'red': return 'border-red-500';
      case 'orange': return 'border-orange-500';
      case 'yellow': return 'border-yellow-500';
      case 'green': return 'border-green-500';
      case 'blue': return 'border-blue-500';
      case 'indigo': return 'border-indigo-500';
      case 'violet': return 'border-violet-500';
      default: return 'border-accent';
    }
  };

  const getButtonBg = () => {
    switch (levelInfo.colorTheme) {
      case 'red': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'orange': return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'yellow': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'green': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'blue': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'indigo': return 'bg-indigo-500 hover:bg-indigo-600 text-white';
      case 'violet': return 'bg-violet-500 hover:bg-violet-600 text-white';
      default: return 'bg-primary hover:bg-primary/90 text-primary-foreground';
    }
  };
  
  const isFreeReader = levelInfo.pricePerMinute === 0;
  
  return (
    <motion.div
      className={`bg-card border border-border rounded-xl overflow-hidden ${getLevelBorder()} transition-all group bg-gradient-to-b ${getLevelGradient()}`}
      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
    >
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to={`/readers/${reader.username || reader.id}`} className="relative block">
            {reader.avatar_url ? (
              <img 
                src={reader.avatar_url} 
                alt={reader.username || 'Reader'} 
                className={`w-16 h-16 rounded-full object-cover border-2 ${getAvatarBorder()}`}
              />
            ) : (
              <div className={`w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold border-2 ${getAvatarBorder()}`}>
                {reader.username?.charAt(0) || reader.email?.charAt(0) || 'R'}
              </div>
            )}
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <Circle 
                className={`h-4 w-4 ${reader.is_online ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`}
              />
            </div>
            <div className={`absolute -bottom-1 -right-1 ${getButtonBg()} p-1 rounded-full`}>
              <TarotLogo className="h-4 w-4" />
            </div>
          </Link>
          
          <div className="flex-1">
            <Link to={`/readers/${reader.username || reader.id}`} className="hover:underline">
              <h3 className="text-xl font-serif font-bold">{reader.username || reader.email?.split('@')[0] || 'Reader'}</h3>
            </Link>
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border mt-1 ${getLevelColor()}`}>
              {getLevelIcon()}
              <span className="ml-1">{levelInfo.name}</span>
            </div>
            <div className="flex items-center text-muted-foreground text-sm mt-1 space-x-4">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{getReaderSince()}</span>
              </div>
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-accent text-accent mr-1" />
                <span>{reader.average_rating ? reader.average_rating.toFixed(1) : '5.0'}</span>
              </div>
            </div>
            <div className="flex items-center mt-1">
              <Circle className={`h-2 w-2 mr-1 ${reader.is_online ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`} />
              <span className={`text-xs ${reader.is_online ? 'text-green-600' : 'text-muted-foreground'}`}>
                {reader.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {reader.bio || `Certified tarot reader specializing in intuitive guidance. Expertise in spiritual journeys and personal growth through tarot wisdom. Every reading is personalized to your unique energy and questions.`}
        </p>
        
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {specialties.map((specialty, index) => (
              <span key={index} className={`text-xs px-2 py-1 bg-${levelInfo.colorTheme}-500/10 ${getLevelColor().split(' ')[0]} rounded-full`}>
                {specialty}
              </span>
            ))}
          </div>
        </div>

        {/* Reader's Decks Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center">
            <Layers className="h-3 w-3 mr-1.5 text-current" />
            Reader's Decks
          </h4>
          {loadingDecks ? (
            <div className="text-xs text-muted-foreground animate-pulse">Loading decks...</div>
          ) : ownedDecks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ownedDecks.slice(0, 4).map(deck => (
                <div key={deck.id} className="group relative w-10 h-14 rounded-sm overflow-hidden border border-border hover:border-primary/50 transition-all duration-200 bg-muted/30 cursor-default">
                  {deck.cover_image ? (
                    <img src={deck.cover_image} alt={deck.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TarotLogo className="h-5 w-5 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-1">
                    <p className="text-white text-[8px] leading-tight text-center line-clamp-2 font-medium">
                      {deck.title}
                    </p>
                  </div>
                </div>
              ))}
              {ownedDecks.length > 4 && (
                <div className="w-10 h-14 rounded-sm border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs font-medium">
                  +{ownedDecks.length - 4}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">This reader hasn't featured any decks yet.</p>
          )}
        </div>
        
        <div className="mb-4 flex items-center">
          <span className="text-sm font-medium mr-1">Rate:</span>
          {isFreeReader ? (
            <span className="text-success font-bold flex items-center">
              <Sparkles className="h-4 w-4 mr-1" />
              Free
            </span>
          ) : (
            <>
              <span className={getLevelColor().split(' ')[0] + ' font-bold'}>${levelInfo.pricePerMinute.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground ml-1">/ min</span>
            </>
          )}
        </div>
        
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          {reader.is_online ? (
            <Link to="#" className="flex-1 btn btn-secondary p-2 text-xs flex items-center justify-center hover:bg-secondary/80">
              <Video className="h-3 w-3 mr-1" />
              Video
            </Link>
          ) : (
            <button 
              disabled 
              className="flex-1 p-2 text-xs flex items-center justify-center rounded-md bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
            >
              <Video className="h-3 w-3 mr-1" />
              Video
            </button>
          )}
          <Link to="#" className={`flex-1 p-2 text-xs flex items-center justify-center rounded-md ${getButtonBg()}`}>
            <BookOpen className="h-3 w-3 mr-1" />
            Book
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ReaderCard;
