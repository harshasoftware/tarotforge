import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User as UserType, Deck, ReaderLevel } from '../../types';
import { supabase } from '../../lib/supabase'; 
import { fetchUserOwnedDecks } from '../../lib/deck-utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Star, Calendar, Video, BookOpen, Layers, MessageSquare, ShieldCheck, Crown, Heart, Sun, Flame, Sparkles, Circle } from 'lucide-react';
import TarotLogo from '../../components/ui/TarotLogo';
import { useTheme } from '../../hooks/useTheme';

// Fetch reader by USERNAME
const fetchReaderByUsername = async (username: string): Promise<UserType | null> => {
  if (!username) return null;
  const { data, error } = await supabase
    .from('users') 
    .select(`
      *,
      readerLevel:reader_levels (*)
    `)
    .eq('username', username) // Query by username
    .single();
  if (error) {
    console.error('Error fetching reader by username:', error);
    return null;
  }
  return data as UserType & { readerLevel: ReaderLevel | null }; 
};

// Moved getLevelIcon outside to be a true utility, passing darkMode and levelInfo
const getLevelIcon = (iconName?: string, currentLevelInfo?: any, currentDarkMode?: boolean) => {
    const icon = iconName || currentLevelInfo.icon;
    // Determine color based on currentLevelInfo and currentDarkMode
    const colorName = currentLevelInfo.colorTheme || 'purple';
    const textClass = currentDarkMode ? `text-${colorName}-400` : `text-${colorName}-600`;
    const iconSize = "h-4 w-4"; // Reverted icon size
    switch (icon) {
      case 'flame': return <Flame className={`${iconSize} ${textClass}`} />;
      case 'sparkles': return <Sparkles className={`${iconSize} ${textClass}`} />;
      case 'sun': return <Sun className={`${iconSize} ${textClass}`} />;
      case 'heart': return <Heart className={`${iconSize} ${textClass}`} />;
      case 'crown': return <Crown className={`${iconSize} ${textClass}`} />;
      default: return <Sparkles className={`${iconSize} ${textClass}`} />;
    }
  };

const ReaderProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [reader, setReader] = useState<UserType | null>(null);
  const [ownedDecks, setOwnedDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const { darkMode } = useTheme();

  const generateReaderSpecialties = (currentReader: UserType) => {
    const allSpecialtiesList = [
      'Love & Relationships', 'Career Guidance', 'Spiritual Growth',
      'Past Life Readings', 'Shadow Work', 'Life Purpose',
      'Decision Making', 'Ancestral Guidance', 'Energy Healing',
      'Chakra Alignment', 'Higher Self Connection', 'Manifestation'
    ];
    if (!currentReader || !currentReader.id) return ['General Readings'];
    const idSum = currentReader.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const specialtyCount = (idSum % 3) + 2; // Reverted to 2-4 specialties
    const selectedSpecialties: string[] = [];
    for (let i = 0; i < specialtyCount; i++) {
      const index = (idSum + i * 17) % allSpecialtiesList.length;
      if (!selectedSpecialties.includes(allSpecialtiesList[index])){
        selectedSpecialties.push(allSpecialtiesList[index]);
      }
    }
    return selectedSpecialties.length > 0 ? selectedSpecialties : ['General Readings'];
  };

  useEffect(() => {
    if (!username) {
      setError('Reader username not found in URL.');
      setIsLoading(false);
      return;
    }
    const loadReaderData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const readerData = await fetchReaderByUsername(username);
        if (!readerData) {
          setError('Reader not found.');
          setIsLoading(false);
          return;
        }
        setReader(readerData);
        setSpecialties(generateReaderSpecialties(readerData));
        if (readerData.id) {
          const decks = await fetchUserOwnedDecks(readerData.id);
          setOwnedDecks(decks);
        } else {
          setOwnedDecks([]);
        }
      } catch (err) {
        console.error('Failed to load reader data:', err);
        setError('Failed to load reader profile. Please try again.');
      }
      setIsLoading(false);
    };
    loadReaderData();
  }, [username]);

  const getReaderSince = () => {
    if (!reader?.reader_since) return 'New Reader';
    const readerDate = new Date(reader.reader_since);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - readerDate.getFullYear()) * 12 + (now.getMonth() - readerDate.getMonth());
    if (monthsDiff < 1) return 'New Reader';
    if (monthsDiff < 12) return `${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`;
    const years = Math.floor(monthsDiff / 12);
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  const getReaderLevelInfo = () => {
    const defaultLevel = { name: 'Novice Seer', colorTheme: 'purple', icon: 'sparkles', pricePerMinute: 0.25 };
    if (!reader || !reader.readerLevel) return defaultLevel;
    const readerLevel = reader.readerLevel as ReaderLevel;
    return {
      name: readerLevel.name || defaultLevel.name,
      colorTheme: readerLevel.color_theme || defaultLevel.colorTheme,
      icon: readerLevel.icon || defaultLevel.icon,
      pricePerMinute: reader.custom_price_per_minute !== undefined && reader.custom_price_per_minute !== null
        ? reader.custom_price_per_minute 
        : readerLevel.base_price_per_minute ?? defaultLevel.pricePerMinute
    };
  };

  const levelInfo = reader ? getReaderLevelInfo() : { name: 'Novice Seer', colorTheme: 'purple', icon: 'sparkles', pricePerMinute: 0.25 };

  const getLevelColorClasses = (theme?: string) => {
    const colorName = theme || levelInfo.colorTheme;
    // Use 500 for light mode text, 400 for dark mode text for better vibrancy against respective backgrounds
    // Borders are slightly darker/more opaque in light mode for definition
    const textClass = darkMode ? `text-${colorName}-400` : `text-${colorName}-600`;
    const borderClass = darkMode ? `border-${colorName}-500/50` : `border-${colorName}-500/70`;
    return `${textClass} ${borderClass}`;
  };
  
  const getButtonBgClasses = (theme?: string) => {
    const color = theme || levelInfo.colorTheme;
    const baseColorStrength = darkMode ? 500 : 600;
    const hoverColorStrength = darkMode ? 600 : 700;
    const textColor = (color === 'yellow' || color === 'amber') ? 'text-black' : 'text-white';

    return `bg-${color}-${baseColorStrength} hover:bg-${color}-${hoverColorStrength} ${textColor}`;
  };

  if (isLoading && !reader) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><LoadingSpinner size="xl" /></div>;
  }

  if (error || !reader) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 text-center ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
        <ShieldCheck className={`h-16 w-16 ${darkMode ? 'text-red-500' : 'text-red-600'} mb-4`} />
        <h2 className={`text-2xl font-serif mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Profile Unavailable</h2>
        <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} mb-6 text-base`}>{error || 'Could not load this reader\'s profile.'}</p>
        <Link to="/readers" className={`btn text-sm py-2 px-5 ${darkMode ? 'btn-primary' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
          Browse Other Readers
        </Link>
      </div>
    );
  }
  
  const isFreeReader = levelInfo.pricePerMinute === 0;
  const avatarInitial = reader.username?.charAt(0).toUpperCase() || reader.email?.charAt(0).toUpperCase() || 'R';
  const displayName = reader.username || reader.email?.split('@')[0] || 'Reader';

  return (
    <div className={`min-h-screen antialiased ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
      <div className={`container mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 md:pb-20`}>
        <div className="lg:flex lg:gap-8 xl:gap-12">
          {/* Left Column / Top Section on Mobile */}
          <div className="lg:w-1/3 xl:w-1/4 mb-8 lg:mb-0 flex flex-col items-center lg:items-start lg:sticky lg:top-20">
            {reader.avatar_url ? (
              <img 
                src={reader.avatar_url} 
                alt={displayName} 
                className={`w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 ${darkMode ? getLevelColorClasses().split(' ')[1] : 'border-purple-500'} shadow-xl mx-auto lg:mx-0`}
              />
            ) : (
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full ${darkMode ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-100 text-purple-600'} flex items-center justify-center text-5xl font-bold border-4 ${darkMode ? getLevelColorClasses().split(' ')[1] : 'border-purple-500'} shadow-xl mx-auto lg:mx-0`}>
                {avatarInitial}
              </div>
            )}

            <div className="text-center lg:text-left mt-5">
              <h1 className={`text-3xl lg:text-4xl font-bold tracking-tight ${darkMode ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300' : 'text-purple-700'}`}>
                {displayName}
              </h1>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs border mt-2.5 ${getLevelColorClasses()} ${darkMode ? `bg-${levelInfo.colorTheme}-500/10 backdrop-blur-sm` : `bg-${levelInfo.colorTheme}-100`}`}>
                {getLevelIcon(levelInfo.icon, levelInfo, darkMode)}
                <span className="ml-1.5 font-semibold tracking-wide">{levelInfo.name}</span>
              </div>
            </div>

            <div className={`mt-5 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'} space-y-1.5 text-center lg:text-left`}>
              <div className="flex items-center justify-center lg:justify-start">
                <Star className={`h-4 w-4 mr-2 ${darkMode ? 'fill-yellow-400 text-yellow-500' : 'fill-amber-500 text-amber-600'}`} />
                <span>{reader.average_rating ? reader.average_rating.toFixed(1) : '5.0'} Rating ({((reader as any).total_readings as number | undefined) ?? 0} readings)</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <Calendar className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'} mr-2`} />
                <span>Reader for {getReaderSince()}</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <Circle className={`h-3 w-3 mr-2 ${reader.is_online ? (darkMode ? 'text-green-400 fill-green-400' : 'text-green-500 fill-green-500') : (darkMode ? 'text-slate-500 fill-slate-500' : 'text-slate-400 fill-slate-400')}`} />
                <span className={`${reader.is_online ? (darkMode ? 'text-green-400' : 'text-green-500') : (darkMode ? 'text-slate-400' : 'text-slate-500')} font-semibold`}>
                  {reader.is_online ? 'Online Now' : 'Currently Offline'}
                </span>
              </div>
            </div>

            <div className="mt-5 text-center lg:text-left">
              <h3 className={`text-lg font-semibold font-serif mb-1 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>Rate</h3>
              {isFreeReader ? (
                <p className={`text-xl ${darkMode ? 'text-green-400' : 'text-green-500'} font-bold flex items-center justify-center lg:justify-start`}>
                  <Sparkles className={`h-5 w-5 mr-1.5 ${darkMode ? 'text-green-400 fill-green-400' : 'text-green-500 fill-green-500'}`} />Free Readings!
                </p>
              ) : (
                <p className="text-xl font-bold">
                  <span className={`${levelInfo.colorTheme ? (darkMode ? `text-${levelInfo.colorTheme}-400` : `text-${levelInfo.colorTheme}-600`) : (darkMode ? 'text-accent' : 'text-primary') }`}>${levelInfo.pricePerMinute.toFixed(2)}</span>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>/ minute</span>
                </p>
              )}
            </div>
            
            <div className="mt-6 w-full space-y-3">
                <button className={`w-full btn text-base py-3 ${getButtonBgClasses()} flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transition-shadow rounded-lg`}>
                    <Video className="h-5 w-5"/> Start Video Reading
                </button>
                <button className={`w-full btn ${darkMode ? 'btn-secondary' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} text-base py-3 flex items-center justify-center gap-2.5 rounded-lg`}>
                    <MessageSquare className="h-5 w-5"/> Send Message
                </button>
            </div>
          </div>

          {/* Right Column / Bottom Section on Mobile */}
          <div className="lg:w-2/3 xl:w-3/4">
            <div className={`${darkMode ? 'bg-slate-800/50 backdrop-blur-md' : 'bg-white border border-slate-200/80'} p-6 rounded-xl shadow-xl mb-6 lg:mb-8`}>
              <h2 className={`text-2xl font-serif font-semibold mb-3 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>About Me</h2>
              <p className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm md:text-base leading-relaxed whitespace-pre-line`}>
                {reader.bio || 'This reader is still crafting their story. In the meantime, trust in their intuitive abilities to guide you.'}
              </p>
            </div>

            <div className={`${darkMode ? 'bg-slate-800/50 backdrop-blur-md' : 'bg-white border border-slate-200/80'} p-6 rounded-xl shadow-xl mb-6 lg:mb-8`}>
              <h2 className={`text-2xl font-serif font-semibold mb-3 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>My Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty: string, index: number) => (
                  <span key={index} className={`text-sm px-3 py-1.5 bg-${levelInfo.colorTheme}-500/${darkMode ? '20' : '100'} ${getLevelColorClasses().split(' ')[0]} rounded-full font-medium shadow-sm ${darkMode ? '' : `text-${levelInfo.colorTheme}-700`}`}>
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
            
            <div className={`${darkMode ? 'bg-slate-800/50 backdrop-blur-md' : 'bg-white border border-slate-200/80'} p-6 rounded-xl shadow-xl`}>
              <h2 className={`text-2xl font-serif font-semibold mb-3 ${darkMode ? 'text-purple-300' : 'text-purple-600'} flex items-center`}>
                <Layers className="h-5 w-5 mr-2" /> My Decks
              </h2>
              {(isLoading && ownedDecks.length === 0) ? (
                <div className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-6`}>
                    <LoadingSpinner size="sm"/>
                    <p className="mt-2 text-xs">Loading mystical tools...</p>
                </div>
              ) : ownedDecks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ownedDecks.map(deck => (
                    <div key={deck.id} className={`group aspect-[3/4] rounded-lg overflow-hidden border ${darkMode ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-slate-100'} hover:border-purple-500/70 transition-all duration-300 relative shadow-lg hover:shadow-purple-500/20`}>
                      {deck.cover_image ? (
                        <img src={deck.cover_image} alt={deck.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-800/60' : 'bg-slate-200'}`}>
                          <TarotLogo className={`h-1/3 w-1/3 ${darkMode ? 'text-slate-600/60' : 'text-slate-400'}`} />
                        </div>
                      )}
                      <div className={`absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t ${darkMode ? 'from-black/80 via-black/60' : 'from-neutral-800/70 via-neutral-800/50'} to-transparent`}>
                        <h3 className={`text-xs font-semibold ${darkMode ? 'text-white group-hover:text-purple-200' : 'text-slate-100 group-hover:text-purple-100'} truncate transition-colors`}>{deck.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-center py-6 text-sm`}>This seer is still attuning their collection of sacred decks.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReaderProfilePage; 