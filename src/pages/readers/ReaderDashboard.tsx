import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Award, Calendar, Clock, MessageSquare, UserCheck, Users, BarChart4, BookOpen, ChevronRight, Star, ArrowUp, Sparkles, Flame, Heart, Crown, Sun, DollarSign, Edit, Save, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getReaderDetails, getReaderReviews } from '../../lib/reader-services';
import TarotLogo from '../../components/ui/TarotLogo';
import { ReaderLevel, User, ReaderReview } from '../../types';
import ReaderCertificate from '../../components/readers/ReaderCertificate';
import { supabase } from '../../lib/supabase';

// Custom rate setting form interface
interface RateSettingFormData {
  ratePerMinute: number;
  offerFree: boolean;
}

const ReaderDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReadings: 0,
    averageRating: 0,
    pendingRequests: 0,
    completedToday: 0
  });
  const [readerDetails, setReaderDetails] = useState<User | null>(null);
  const [readerLevel, setReaderLevel] = useState<ReaderLevel | null>(null);
  const [nextLevel, setNextLevel] = useState<ReaderLevel | null>(null);
  const [reviews, setReviews] = useState<ReaderReview[]>([]);
  const [progressToNextLevel, setProgressToNextLevel] = useState({
    ratings: 0, // 0-100%
    readings: 0 // 0-100%
  });
  const [showCertificate, setShowCertificate] = useState(false);
  const [allLevels, setAllLevels] = useState<ReaderLevel[]>([]);
  
  // Rate setting states
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [isFreeReading, setIsFreeReading] = useState<boolean>(false);
  const [maxRate, setMaxRate] = useState<number>(0);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateSuccess, setRateSuccess] = useState(false);
  
  // Format date to get reader since date in readable format
  const formattedReaderSince = () => {
    if (!user?.reader_since) return 'Recent';
    
    const date = new Date(user.reader_since);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };
  
  // Get level color based on chakra colors
  const getLevelColor = (theme: string = 'red') => {
    switch (theme) {
      case 'red': return 'text-red-500 bg-red-500/20';
      case 'orange': return 'text-orange-500 bg-orange-500/20';
      case 'yellow': return 'text-yellow-500 bg-yellow-500/20';
      case 'green': return 'text-green-500 bg-green-500/20';
      case 'blue': return 'text-blue-500 bg-blue-500/20';
      case 'indigo': return 'text-indigo-500 bg-indigo-500/20';
      case 'violet': return 'text-violet-500 bg-violet-500/20';
      default: return 'text-primary bg-primary/20';
    }
  };
  
  // Get level icon based on chakra themes
  const getLevelIcon = (iconName: string = 'flame') => {
    switch (iconName) {
      case 'flame': return <Flame className="h-6 w-6" />;
      case 'sparkles': return <Sparkles className="h-6 w-6" />;
      case 'sun': return <Sun className="h-6 w-6" />;
      case 'heart': return <Heart className="h-6 w-6" />;
      case 'crown': return <Crown className="h-6 w-6" />;
      case 'star': return <Star className="h-6 w-6" />;
      default: return <Flame className="h-6 w-6" />;
    }
  };
  
  useEffect(() => {
    // Check if user is actually a certified reader
    if (user && !user.is_reader) {
      navigate('/become-reader');
      return;
    }
    
    const loadReaderData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get reader details including level info
        const readerData = await getReaderDetails(user.id);
        setReaderDetails(readerData);
        
        // Set reader level
        if (readerData?.readerLevel) {
          setReaderLevel(readerData.readerLevel);
          
          // Set max rate and current rate
          if (readerData.readerLevel && readerData.readerLevel.base_price_per_minute) {
            setMaxRate(readerData.readerLevel.base_price_per_minute);
          }
          
          // Set current rate - use custom_price_per_minute if available,
          // otherwise use the level's base price
          const userRate = readerData.custom_price_per_minute !== undefined && 
                          readerData.custom_price_per_minute !== null
            ? readerData.custom_price_per_minute
            : readerData.readerLevel.base_price_per_minute;
            
          setCurrentRate(userRate);
          setIsFreeReading(userRate === 0);
          
          // Fetch reviews
          const reviewsData = await getReaderReviews(user.id);
          setReviews(reviewsData);
          
          // Fetch all levels for milestone progress bar
          const { data: allLevelsData } = await supabase
            .from('reader_levels')
            .select('*')
            .order('rank_order', { ascending: true });
            
          if (allLevelsData && allLevelsData.length > 0) {
            setAllLevels(allLevelsData);
          }
          
          // Calculate progress to next level
          if (readerData.readerLevel.rank_order < 5) {
            // Assuming reader levels are in order, find the next level
            const { data: nextLevelData } = await supabase
              .from('reader_levels')
              .select('*')
              .eq('rank_order', readerData.readerLevel.rank_order + 1)
              .single();
              
            if (nextLevelData) {
              setNextLevel(nextLevelData);
              
              // Calculate progress percentages
              // Ratings progress
              const currentRating = readerData.average_rating || 0;
              const targetRating = nextLevelData.min_rating || 5;
              const previousLevelRating = readerData.readerLevel.min_rating || 0;
              const ratingRange = targetRating - previousLevelRating;
              const ratingProgress = Math.min(100, Math.max(0, ((currentRating - previousLevelRating) / ratingRange) * 100));
              
              // Readings progress
              const currentReadings = readerData.completed_readings || 0;
              const targetReadings = nextLevelData.min_readings || 0;
              const previousLevelReadings = readerData.readerLevel.min_readings || 0;
              const readingsRange = targetReadings - previousLevelReadings;
              const readingsProgress = Math.min(100, Math.max(0, ((currentReadings - previousLevelReadings) / readingsRange) * 100));
              
              setProgressToNextLevel({
                ratings: ratingProgress,
                readings: readingsProgress
              });
            }
          }
        }
        
        // Set mock stats for demo
        setStats({
          totalReadings: readerData?.completed_readings || Math.floor(Math.random() * 30),
          averageRating: readerData?.average_rating || 4.8,
          pendingRequests: Math.floor(Math.random() * 5),
          completedToday: Math.floor(Math.random() * 3)
        });
      } catch (error) {
        console.error('Error loading reader data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadReaderData();
  }, [user, navigate]);
  
  // Handle saving the rate
  const handleSaveRate = async () => {
    if (!user) return;
    
    try {
      setIsSavingRate(true);
      setRateError(null);
      
      // Validate rate
      // If offering free readings, set rate to 0
      const rateToSave = isFreeReading ? 0 : currentRate;
      
      // If not free, validate against max and min
      if (!isFreeReading) {
        if (rateToSave > maxRate) {
          setRateError(`Rate cannot exceed $${maxRate.toFixed(2)} per minute for your current level`);
          setIsSavingRate(false);
          return;
        }
        
        if (rateToSave < 0) {
          setRateError("Rate cannot be negative");
          setIsSavingRate(false);
          return;
        }
      }
      
      // Save to database
      const { error } = await supabase
        .from('users')
        .update({
          custom_price_per_minute: rateToSave
        })
        .eq('id', user.id);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      if (readerDetails) {
        setReaderDetails({
          ...readerDetails,
          custom_price_per_minute: rateToSave
        });
      }
      
      setRateSuccess(true);
      setIsEditingRate(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setRateSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving rate:', error);
      setRateError('Failed to save rate. Please try again.');
    } finally {
      setIsSavingRate(false);
    }
  };
  
  // Handle rate input change
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setCurrentRate(value);
    }
  };
  
  // Handle free reading toggle
  const handleFreeReadingToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsFreeReading(e.target.checked);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 mt-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Reader Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your tarot reading services and client connections
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Reader level badge */}
            <div className={`px-4 py-2 rounded-full flex items-center ${getLevelColor(readerLevel?.color_theme)}`}>
              {getLevelIcon(readerLevel?.icon)}
              <span className="ml-2 font-medium">{readerLevel?.name || 'Novice Seer'}</span>
            </div>
            
            <div className="bg-card/50 border border-border rounded-full px-4 py-2 flex items-center">
              <UserCheck className="h-5 w-5 text-accent mr-2" />
              <span className="text-sm">Since {formattedReaderSince()}</span>
            </div>
            
            {/* View certificate button */}
            <button
              onClick={() => setShowCertificate(true)}
              className="btn btn-secondary py-2 px-4 flex items-center"
            >
              <Award className="h-5 w-5 mr-2" />
              View Certificate
            </button>
          </div>
        </div>
        
        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Readings</p>
                <h3 className="text-3xl font-bold mt-1">{stats.totalReadings}</h3>
              </div>
              <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Average Rating</p>
                <h3 className="text-3xl font-bold mt-1">{stats.averageRating.toFixed(1)}</h3>
              </div>
              <div className="h-12 w-12 bg-accent/20 rounded-full flex items-center justify-center">
                <Award className="h-6 w-6 text-accent" />
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Pending Requests</p>
                <h3 className="text-3xl font-bold mt-1">{stats.pendingRequests}</h3>
              </div>
              <div className="h-12 w-12 bg-warning/20 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Completed Today</p>
                <h3 className="text-3xl font-bold mt-1">{stats.completedToday}</h3>
              </div>
              <div className="h-12 w-12 bg-success/20 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-success" />
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Rate Setting Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-8"
        >
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-serif font-bold flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-accent" />
                Your Reading Rate
              </h2>
            </div>
            <div className="p-6">
              {rateSuccess && (
                <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-success flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Your rate has been updated successfully!
                  </p>
                </div>
              )}
              
              {rateError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-destructive flex items-center">
                    <XCircle className="h-4 w-4 mr-2" />
                    {rateError}
                  </p>
                </div>
              )}
              
              {isEditingRate ? (
                <div className="space-y-4">
                  <div className="flex items-center mb-2">
                    <input 
                      type="checkbox" 
                      id="offerFree"
                      checked={isFreeReading}
                      onChange={handleFreeReadingToggle}
                      className="mr-2"
                    />
                    <label htmlFor="offerFree">Offer free readings</label>
                  </div>
                  
                  {!isFreeReading && (
                    <div className="space-y-2">
                      <label htmlFor="rateInput" className="block text-sm font-medium">
                        Rate per minute <span className="text-xs text-muted-foreground">(Max: ${maxRate.toFixed(2)})</span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted/50">$</span>
                        <input
                          type="number"
                          id="rateInput"
                          value={currentRate}
                          onChange={handleRateChange}
                          min="0.01"
                          max={maxRate}
                          step="0.01"
                          className="flex-1 rounded-r-md border border-input p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your rate cannot exceed the maximum for your current level ({readerLevel?.name}: ${maxRate.toFixed(2)}/min).
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsEditingRate(false)}
                      className="btn btn-ghost border border-input py-2 px-4"
                      disabled={isSavingRate}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRate}
                      className="btn btn-primary py-2 px-4 flex items-center"
                      disabled={isSavingRate}
                    >
                      {isSavingRate ? (
                        <>
                          <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Rate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center">
                      {isFreeReading ? (
                        <span className="flex items-center text-success">
                          <Sparkles className="h-5 w-5 mr-2" />
                          Free Readings
                        </span>
                      ) : (
                        <>
                          <span className="text-accent">${currentRate.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground ml-2">per minute</span>
                        </>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isFreeReading 
                        ? "You're currently offering your readings for free" 
                        : `Maximum allowed for your level (${readerLevel?.name}): $${maxRate.toFixed(2)}/min`}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingRate(true)}
                    className="btn btn-secondary py-2 px-4 flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Change Rate
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* Level Progress */}
        {nextLevel && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-serif font-bold flex items-center">
                  <ArrowUp className="h-5 w-5 mr-2 text-accent" />
                  Progress to {nextLevel.name}
                </h2>
              </div>
              <div className="p-6">
                {/* Chakra Color System Milestone Progress Bar */}
                {allLevels.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-medium mb-3">Reader Level Progression</h3>
                    <div className="relative">
                      {/* Background Track */}
                      <div className="h-6 bg-muted/30 rounded-full overflow-hidden relative">
                        {/* Milestone Markers */}
                        <div className="absolute inset-0 flex items-center">
                          {allLevels.map((level, index) => (
                            <React.Fragment key={level.id}>
                              {/* Divider except for first item */}
                              {index > 0 && (
                                <div className="h-6 w-0.5 bg-background/80 relative z-10"></div>
                              )}
                              
                              {/* Level Section */}
                              <div 
                                className={`flex-grow h-full relative ${
                                  index < (readerLevel?.rank_order || 1) 
                                    ? getProgressBarColor(level.color_theme) 
                                    : ''
                                }`}
                              >
                                {/* Level Icon */}
                                <div 
                                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                                  title={`${level.name}: ${level.description}`}
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                    index < (readerLevel?.rank_order || 1) 
                                      ? getBorderColor(level.color_theme) + ' shadow-md' 
                                      : 'border-muted-foreground'
                                  } ${
                                    index === (readerLevel?.rank_order || 1) - 1 
                                      ? 'ring-2 ring-accent/50' 
                                      : ''
                                  } bg-background`}
                                  >
                                    <div className={`w-5 h-5 ${
                                      index < (readerLevel?.rank_order || 1) 
                                        ? getIconColor(level.color_theme)
                                        : 'text-muted-foreground'
                                    }`}>
                                      {getLevelIconSmall(level.icon)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      
                      {/* Level Names */}
                      <div className="mt-3 flex justify-between">
                        {allLevels.map((level, index) => (
                          <div 
                            key={`label-${level.id}`} 
                            className={`text-xs ${
                              index === (readerLevel?.rank_order || 1) - 1
                                ? getTextColor(level.color_theme) + ' font-medium'
                                : 'text-muted-foreground'
                            }`}
                            style={{ 
                              width: `${100 / allLevels.length}%`, 
                              textAlign: index === 0 ? 'left' : index === allLevels.length - 1 ? 'right' : 'center' 
                            }}
                          >
                            {level.name}
                          </div>
                        ))}
                      </div>
                      
                      {/* Milestone Tooltips */}
                      <div className="mt-1">
                        {allLevels.map((level, index) => (
                          <div 
                            key={`requirement-${level.id}`} 
                            className="text-xs text-muted-foreground"
                            style={{ 
                              width: `${100 / allLevels.length}%`, 
                              display: 'inline-block',
                              textAlign: index === 0 ? 'left' : index === allLevels.length - 1 ? 'right' : 'center',
                              paddingLeft: index === 0 ? 0 : 8,
                              paddingRight: index === allLevels.length - 1 ? 0 : 8
                            }}
                          >
                            {index === (readerLevel?.rank_order || 1) - 1 
                              ? 'Current Level' 
                              : index === readerLevel?.rank_order
                                ? 'Next Level'
                                : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Rating progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-accent mr-2" />
                        <span className="font-medium">Rating Progress</span>
                      </div>
                      <div className="text-sm">
                        {readerDetails?.average_rating?.toFixed(1) || '0'} / {nextLevel.min_rating?.toFixed(1) || '5.0'}
                      </div>
                    </div>
                    <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full" 
                        style={{ width: `${progressToNextLevel.ratings}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Readings progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 text-accent mr-2" />
                        <span className="font-medium">Readings Progress</span>
                      </div>
                      <div className="text-sm">
                        {readerDetails?.completed_readings || '0'} / {nextLevel.min_readings || '10'}
                      </div>
                    </div>
                    <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full" 
                        style={{ width: `${progressToNextLevel.readings}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-3 bg-muted/20 rounded-lg text-sm text-muted-foreground">
                  <p>
                    Rank up from {readerLevel?.name || 'Novice Seer'} to {nextLevel.name} by:
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li className="flex items-baseline gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1"></span>
                      <span>Maintaining {nextLevel.min_rating}+ star rating average</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1"></span>
                      <span>Completing at least {nextLevel.min_readings} readings</span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1"></span>
                      <span>Passing the {nextLevel.name} certification quiz with {nextLevel.required_quiz_score}%+ score</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Main Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reading Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold">Reading Requests</h2>
                <button className="text-sm text-primary">View All</button>
              </div>
              
              <div className="p-6">
                {stats.pendingRequests > 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: stats.pendingRequests }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mr-3">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-medium">New Reading Request</h4>
                            <p className="text-sm text-muted-foreground">
                              {["Career Guidance", "Love & Relationships", "Spiritual Growth"][Math.floor(Math.random() * 3)]} • {Math.floor(Math.random() * 30) + 1} min ago
                            </p>
                          </div>
                        </div>
                        <button className="btn btn-primary py-1 px-3 text-xs">
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No Pending Requests</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You don't have any reading requests at the moment.
                    </p>
                    <button className="btn btn-secondary py-1.5 px-4 text-sm">
                      Update Availability
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-serif font-bold">Quick Actions</h2>
              </div>
              
              <div className="p-4">
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <Clock className="h-5 w-5 text-primary mr-3" />
                      Set Availability
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-primary mr-3" />
                      Manage Messages
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <Award className="h-5 w-5 text-primary mr-3" />
                      Update Profile
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <BarChart4 className="h-5 w-5 text-primary mr-3" />
                      View Analytics
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button 
                    onClick={() => setShowCertificate(true)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Award className="h-5 w-5 text-accent mr-3" />
                      View Certificate
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 mt-2 bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-start gap-3">
                  <TarotLogo className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium mb-1">Rank-up Quiz</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Ready for a challenge? Take the {nextLevel?.name || 'advanced'} certification quiz to level up your reader status.
                    </p>
                    <Link to="/tarot-quiz" className="btn btn-secondary py-1.5 px-4 text-xs w-full">
                      Take Level Quiz
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Recent Readings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Recent Readings</h2>
              <button className="text-sm text-primary">View All</button>
            </div>
            
            <div className="p-6">
              {stats.totalReadings > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-border">
                        <th className="pb-3 pr-4 font-medium">Client</th>
                        <th className="pb-3 px-4 font-medium">Type</th>
                        <th className="pb-3 px-4 font-medium">Date</th>
                        <th className="pb-3 px-4 font-medium">Duration</th>
                        <th className="pb-3 pl-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.min(stats.totalReadings, 5) }).map((_, index) => (
                        <tr key={index} className="border-b border-border last:border-0">
                          <td className="py-4 pr-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center mr-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span>Anonymous User</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {["Celtic Cross", "Three Card", "Career Spread", "Relationship Spread"][Math.floor(Math.random() * 4)]}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {Math.floor(Math.random() * 40) + 20} min
                          </td>
                          <td className="pl-4 py-4">
                            <button className="btn btn-ghost py-1 px-2 text-xs border border-input hover:bg-secondary/50">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">No Readings Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    You haven't completed any readings yet. Check back here to see your reading history.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* Reader Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-serif font-bold">Client Reviews</h2>
            </div>
            
            <div className="p-6">
              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review, index) => (
                    <div key={index} className="border-b border-border last:border-b-0 pb-6 last:pb-0">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">Anonymous User</h3>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center mt-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? 'text-accent fill-accent' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                          {review.review && (
                            <p className="text-sm text-muted-foreground">
                              {review.review}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">No Reviews Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    You haven't received any reviews yet. Complete readings to get reviews from clients.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Certificate Modal */}
      {showCertificate && user && readerLevel && (
        <ReaderCertificate
          user={user}
          readerLevel={readerLevel}
          quizScore={90}
          certificationDate={user.reader_since ? new Date(user.reader_since) : new Date()}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
};

// Helper functions for milestone progress bar
const getProgressBarColor = (colorTheme: string) => {
  switch (colorTheme) {
    case 'red': return 'bg-red-500';
    case 'orange': return 'bg-orange-500';
    case 'yellow': return 'bg-yellow-500';
    case 'green': return 'bg-green-500';
    case 'blue': return 'bg-blue-500';
    case 'indigo': return 'bg-indigo-500';
    case 'violet': return 'bg-violet-500';
    default: return 'bg-primary';
  }
};

const getBorderColor = (colorTheme: string) => {
  switch (colorTheme) {
    case 'red': return 'border-red-500';
    case 'orange': return 'border-orange-500';
    case 'yellow': return 'border-yellow-500';
    case 'green': return 'border-green-500';
    case 'blue': return 'border-blue-500';
    case 'indigo': return 'border-indigo-500';
    case 'violet': return 'border-violet-500';
    default: return 'border-primary';
  }
};

const getIconColor = (colorTheme: string) => {
  switch (colorTheme) {
    case 'red': return 'text-red-500';
    case 'orange': return 'text-orange-500';
    case 'yellow': return 'text-yellow-500';
    case 'green': return 'text-green-500';
    case 'blue': return 'text-blue-500';
    case 'indigo': return 'text-indigo-500';
    case 'violet': return 'text-violet-500';
    default: return 'text-primary';
  }
};

const getTextColor = (colorTheme: string) => {
  switch (colorTheme) {
    case 'red': return 'text-red-500';
    case 'orange': return 'text-orange-500';
    case 'yellow': return 'text-yellow-500';
    case 'green': return 'text-green-500';
    case 'blue': return 'text-blue-500';
    case 'indigo': return 'text-indigo-500';
    case 'violet': return 'text-violet-500';
    default: return 'text-primary';
  }
};

const getLevelIconSmall = (iconName: string = 'flame') => {
  switch (iconName) {
    case 'flame': return <Flame className="h-4 w-4" />;
    case 'sparkles': return <Sparkles className="h-4 w-4" />;
    case 'sun': return <Sun className="h-4 w-4" />;
    case 'heart': return <Heart className="h-4 w-4" />;
    case 'crown': return <Crown className="h-4 w-4" />;
    default: return <Flame className="h-4 w-4" />;
  }
};

export default ReaderDashboard;