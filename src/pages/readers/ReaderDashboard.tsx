import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Award, Calendar, Clock, MessageSquare, UserCheck, Users, BarChart4, BookOpen, ChevronRight, Star, ArrowUp, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getReaderDetails, getReaderReviews } from '../../lib/reader-services';
import TarotLogo from '../../components/ui/TarotLogo';
import { ReaderLevel, User, ReaderReview } from '../../types';
import ReaderCertificate from '../../components/readers/ReaderCertificate';

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
  
  // Get level color
  const getLevelColor = (theme: string = 'blue') => {
    switch (theme) {
      case 'blue': return 'text-blue-500 bg-blue-500/20';
      case 'purple': return 'text-purple-500 bg-purple-500/20';
      case 'teal': return 'text-teal-500 bg-teal-500/20';
      case 'gold': return 'text-amber-500 bg-amber-500/20';
      case 'crimson': return 'text-rose-500 bg-rose-500/20';
      default: return 'text-primary bg-primary/20';
    }
  };
  
  // Get level icon
  const getLevelIcon = (iconName: string = 'star') => {
    switch (iconName) {
      case 'star': return <Star className="h-6 w-6" />;
      case 'moon': return <Moon className="h-6 w-6" />;
      case 'sun': return <Sun className="h-6 w-6" />;
      case 'sparkles': return <Sparkles className="h-6 w-6" />;
      case 'crown': return <Crown className="h-6 w-6" />;
      default: return <Star className="h-6 w-6" />;
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
          
          // Fetch reviews
          const reviewsData = await getReaderReviews(user.id);
          setReviews(reviewsData);
          
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
                  <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <span className="flex items-center">
                      <BarChart4 className="h-5 w-5 text-primary mr-3" />
                      View Analytics
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

// Additional component imports for icons
const Moon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

const Sun = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;

const Crown = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>;

// Needed for imports
const supabase = { from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }) }) };

export default ReaderDashboard;