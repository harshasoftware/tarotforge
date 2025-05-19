import React from 'react';
import { motion } from 'framer-motion';
import { User, Star, Calendar, Clock, Eye, MessageSquare, BookOpen } from 'lucide-react';
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
            <div className="flex items-center text-muted-foreground text-sm mt-1 space-x-4">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{getReaderSince()}</span>
              </div>
              
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-accent text-accent mr-1" />
                <span>5.0</span>
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
        
        {/* Reading Options */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Link to="#" className="flex-1 btn btn-secondary p-2 text-xs flex items-center justify-center">
            <MessageSquare className="h-3 w-3 mr-1" />
            Message
          </Link>
          <Link to="#" className="flex-1 btn btn-primary p-2 text-xs flex items-center justify-center">
            <BookOpen className="h-3 w-3 mr-1" />
            Book Reading
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ReaderCard;