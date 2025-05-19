import React from 'react';
import { motion } from 'framer-motion';
import { User, Star, Calendar, Clock, Video, MessageSquare, BookOpen, Crown, Heart, Sun, Flame, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User as UserType } from '../../types';
import TarotLogo from '../ui/TarotLogo';

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
    
    // Use reader's ID to deterministically select specialties (but appear random)
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
  
  // Get reader level information
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
      pricePerMinute: reader.readerLevel.base_price_per_minute
    };
  };
  
  const levelInfo = getReaderLevelInfo();
  
  // Get appropriate color based on reader level (Chakra system colors)
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
  
  // Get appropriate icon based on reader level
  const getLevelIcon = () => {
    switch (levelInfo.icon) {
      case 'flame': return <Flame className="h-4 w-4" />;
      case 'sparkles': return <Sparkles className="h-4 w-4" />;
      case 'sun': return <Sun className="h-4 w-4" />;
      case 'heart': return <Heart className="h-4 w-4" />;
      case 'crown': return <Crown className="h-4 w-4" />;
      case 'star': return <Star className="h-4 w-4" />;
      default: return <Flame className="h-4 w-4" />;
    }
  };
  
  return (
    <motion.div
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-all group"
      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
    >
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          {/* Profile Image */}
          <div className="relative">
            {reader.avatar_url ? (
              <img 
                src={reader.avatar_url} 
                alt={reader.username || 'Reader'} 
                className="w-16 h-16 rounded-full object-cover border-2 border-accent"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold">
                {reader.username?.charAt(0) || reader.email.charAt(0)}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground p-1 rounded-full">
              <TarotLogo className="h-4 w-4" />
            </div>
          </div>
          
          {/* Reader Details */}
          <div className="flex-1">
            <h3 className="text-xl font-serif font-bold">{reader.username || reader.email.split('@')[0]}</h3>
            
            {/* Reader Level Badge */}
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
          </div>
        </div>
        
        {/* Reader Bio */}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {reader.bio || `Certified tarot reader specializing in intuitive guidance. Expertise in spiritual journeys and personal growth through tarot wisdom. Every reading is personalized to your unique energy and questions.`}
        </p>
        
        {/* Specialties */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {specialties.map((specialty, index) => (
              <span key={index} className="text-xs px-2 py-1 bg-accent/10 text-accent-foreground rounded-full">
                {specialty}
              </span>
            ))}
          </div>
        </div>
        
        {/* Price */}
        <div className="mb-4 flex items-center">
          <span className="text-sm font-medium mr-1">Rate:</span>
          <span className="text-accent font-bold">${levelInfo.pricePerMinute.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground ml-1">/ min</span>
        </div>
        
        {/* Reading Options */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Link to="#" className="flex-1 btn btn-secondary p-2 text-xs flex items-center justify-center">
            <MessageSquare className="h-3 w-3 mr-1" />
            Message
          </Link>
          <Link to="#" className="flex-1 btn btn-secondary p-2 text-xs flex items-center justify-center">
            <Video className="h-3 w-3 mr-1" />
            Video
          </Link>
          <Link to="#" className="flex-1 btn btn-primary p-2 text-xs flex items-center justify-center">
            <BookOpen className="h-3 w-3 mr-1" />
            Book
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ReaderCard;