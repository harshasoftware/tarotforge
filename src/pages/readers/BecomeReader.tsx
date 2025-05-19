import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Award, BookOpen, Check, ChevronRight, Clock, Crown, Shield, Sparkles, UserCheck, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { checkQuizEligibility, getUserQuizAttempts, fetchReaderLevels } from '../../lib/reader-services';
import TarotLogo from '../../components/ui/TarotLogo';
import { ReaderLevel } from '../../types';

const BecomeReader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canAttempt, setCanAttempt] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(0);
  const [nextAttemptDate, setNextAttemptDate] = useState<Date | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]); // Simplified for now
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [readerLevels, setReaderLevels] = useState<ReaderLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<ReaderLevel | null>(null);
  const [nextLevel, setNextLevel] = useState<ReaderLevel | null>(null);
  const [showLevelExplanation, setShowLevelExplanation] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Check if the user can take the quiz
        const eligibility = await checkQuizEligibility(user.id);
        setCanAttempt(eligibility.canAttempt);
        setAttemptsRemaining(eligibility.attemptsRemaining);
        setNextAttemptDate(eligibility.nextAttemptDate);
        setActiveQuizId(eligibility.activeQuizId);
        
        // Get recent quiz attempts
        const attempts = await getUserQuizAttempts(user.id);
        setRecentAttempts(attempts.slice(0, 5)); // Get most recent 5 attempts
        
        // Load reader levels
        const levels = await fetchReaderLevels();
        setReaderLevels(levels);
        
        // Set current and next level
        if (user.is_reader) {
          const currentLevelData = levels.find(level => level.id === user.level_id) || levels[0];
          setCurrentLevel(currentLevelData);
          
          // Find next level if there is one
          if (currentLevelData) {
            const nextLevelData = levels.find(level => level.rank_order === currentLevelData.rank_order + 1);
            setNextLevel(nextLevelData || null);
          }
        } else {
          // For non-readers, show the first level as "next"
          setNextLevel(levels[0] || null);
        }
      } catch (err: any) {
        console.error('Error loading reader data:', err);
        setError(err.message || 'Failed to load reader data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);
  
  const startQuiz = () => {
    if (!canAttempt) return;
    
    if (activeQuizId) {
      // Continue existing quiz
      navigate(`/tarot-quiz?id=${activeQuizId}`);
    } else {
      // Start new quiz
      navigate('/tarot-quiz');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reader information...</p>
        </div>
      </div>
    );
  }
  
  if (user?.is_reader) {
    return (
      <div className="min-h-screen pt-12 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 border border-border rounded-xl p-8 text-center mt-12"
          >
            <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-serif font-bold mb-2">You're a Certified Reader!</h1>
            <p className="mb-6 text-lg text-muted-foreground">
              You've passed the certification exam and are recognized as an official Tarot Forge reader.
            </p>
            
            {/* Current level information */}
            <div className="bg-card/60 backdrop-blur-xs p-6 rounded-lg mb-8 max-w-xl mx-auto">
              <div className="flex items-center justify-center mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  currentLevel?.color_theme === 'blue' ? 'bg-blue-500/20 text-blue-500' :
                  currentLevel?.color_theme === 'purple' ? 'bg-purple-500/20 text-purple-500' :
                  currentLevel?.color_theme === 'teal' ? 'bg-teal-500/20 text-teal-500' :
                  currentLevel?.color_theme === 'gold' ? 'bg-amber-500/20 text-amber-500' :
                  currentLevel?.color_theme === 'crimson' ? 'bg-rose-500/20 text-rose-500' :
                  'bg-primary/20 text-primary'
                }`}>
                  {currentLevel?.icon === 'star' ? <Star className="h-6 w-6" /> :
                   currentLevel?.icon === 'moon' ? <Moon className="h-6 w-6" /> :
                   currentLevel?.icon === 'sun' ? <Sun className="h-6 w-6" /> :
                   currentLevel?.icon === 'sparkles' ? <Sparkles className="h-6 w-6" /> :
                   currentLevel?.icon === 'crown' ? <Crown className="h-6 w-6" /> :
                   <Star className="h-6 w-6" />}
                </div>
              </div>
              
              <h2 className="text-xl font-serif font-bold mb-2">
                Current Level: {currentLevel?.name || 'Novice Seer'}
              </h2>
              
              <p className="text-sm text-muted-foreground mb-4">
                {currentLevel?.description || 'Beginning your journey into the mystical arts of tarot reading.'}
              </p>
              
              {nextLevel && (
                <div className="bg-muted/30 rounded-lg p-4 text-left">
                  <h3 className="font-medium mb-2">Next Level: {nextLevel.name}</h3>
                  <div className="flex gap-8 text-sm">
                    <div>
                      <p className="flex items-center mb-1">
                        <Star className="h-4 w-4 text-accent mr-1" />
                        <span>{nextLevel.min_rating || 4.0}+ rating</span>
                      </p>
                      <p className="flex items-center">
                        <BookOpen className="h-4 w-4 text-accent mr-1" />
                        <span>{nextLevel.min_readings || 10}+ readings</span>
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center mb-1">
                        <Award className="h-4 w-4 text-accent mr-1" />
                        <span>Pass {nextLevel.required_quiz_score}% quiz</span>
                      </p>
                      <p className="flex items-center">
                        <Sparkles className="h-4 w-4 text-accent mr-1" />
                        <span>${nextLevel.base_price_per_minute.toFixed(2)}/min rate</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/reader-dashboard" className="btn btn-primary py-2 px-6 flex items-center justify-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Reader Dashboard
              </Link>
              <Link to="/readers" className="btn btn-secondary py-2 px-6 flex items-center justify-center">
                <Users className="h-5 w-5 mr-2" />
                View All Readers
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-accent/20 p-3">
                <TarotLogo className="h-10 w-10 text-accent" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Become a Certified Reader</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Share your tarot wisdom with our community by becoming a certified reader. Take the certification quiz to showcase your knowledge.
            </p>
          </motion.div>
          
          {/* Reader levels information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card border border-border rounded-xl overflow-hidden mb-8"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Reader Levels</h2>
              <button 
                onClick={() => setShowLevelExplanation(!showLevelExplanation)}
                className="text-sm text-primary hover:underline flex items-center"
              >
                {showLevelExplanation ? 'Hide Details' : 'Show Details'}
                <ArrowRight className={`h-4 w-4 ml-1 transition-transform ${showLevelExplanation ? 'rotate-90' : ''}`} />
              </button>
            </div>
            
            {showLevelExplanation ? (
              <div className="p-6">
                <p className="mb-4 text-sm text-muted-foreground">
                  Our reader certification system features 5 ranks, each with increasing prestige, skill requirements, and pricing capabilities.
                  Advance through the ranks by maintaining high ratings, completing readings, and passing more difficult certification quizzes.
                </p>
                
                <div className="space-y-6">
                  {readerLevels.map((level) => (
                    <div key={level.id} className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${
                        level.color_theme === 'blue' ? 'bg-blue-500/20 text-blue-500' :
                        level.color_theme === 'purple' ? 'bg-purple-500/20 text-purple-500' :
                        level.color_theme === 'teal' ? 'bg-teal-500/20 text-teal-500' :
                        level.color_theme === 'gold' ? 'bg-amber-500/20 text-amber-500' :
                        level.color_theme === 'crimson' ? 'bg-rose-500/20 text-rose-500' :
                        'bg-primary/20 text-primary'
                      }`}>
                        {level.icon === 'star' ? <Star className="h-6 w-6" /> :
                         level.icon === 'moon' ? <Moon className="h-6 w-6" /> :
                         level.icon === 'sun' ? <Sun className="h-6 w-6" /> :
                         level.icon === 'sparkles' ? <Sparkles className="h-6 w-6" /> :
                         level.icon === 'crown' ? <Crown className="h-6 w-6" /> :
                         <Star className="h-6 w-6" />}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-lg flex items-center">
                          {level.name}
                          <span className="ml-2 text-xs px-2 py-0.5 bg-muted/50 rounded-full">${level.base_price_per_minute.toFixed(2)}/min</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">{level.description}</p>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                          <div className="flex items-center">
                            <Check className="h-3 w-3 text-success mr-1" />
                            <span>Required quiz score: {level.required_quiz_score}%</span>
                          </div>
                          {level.min_readings !== null && (
                            <div className="flex items-center">
                              <Check className="h-3 w-3 text-success mr-1" />
                              <span>Min. readings: {level.min_readings}</span>
                            </div>
                          )}
                          {level.min_rating !== null && (
                            <div className="flex items-center">
                              <Check className="h-3 w-3 text-success mr-1" />
                              <span>Min. rating: {level.min_rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-5 gap-4">
                {readerLevels.map((level) => (
                  <div 
                    key={level.id} 
                    className="flex flex-col items-center text-center p-3 rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      level.color_theme === 'blue' ? 'bg-blue-500/20 text-blue-500' :
                      level.color_theme === 'purple' ? 'bg-purple-500/20 text-purple-500' :
                      level.color_theme === 'teal' ? 'bg-teal-500/20 text-teal-500' :
                      level.color_theme === 'gold' ? 'bg-amber-500/20 text-amber-500' :
                      level.color_theme === 'crimson' ? 'bg-rose-500/20 text-rose-500' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {level.icon === 'star' ? <Star className="h-5 w-5" /> :
                       level.icon === 'moon' ? <Moon className="h-5 w-5" /> :
                       level.icon === 'sun' ? <Sun className="h-5 w-5" /> :
                       level.icon === 'sparkles' ? <Sparkles className="h-5 w-5" /> :
                       level.icon === 'crown' ? <Crown className="h-5 w-5" /> :
                       <Star className="h-5 w-5" />}
                    </div>
                    <h3 className="font-medium text-sm">{level.name}</h3>
                    <p className="text-xs text-accent font-medium">${level.base_price_per_minute.toFixed(2)}/min</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
          
          {/* Error message */}
          {error && (
            <div className="mb-8 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error checking eligibility</p>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            </div>
          )}
          
          {/* Quiz Eligibility Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card border border-border rounded-xl overflow-hidden mb-8"
          >
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-serif font-bold">Quiz Eligibility</h2>
            </div>
            <div className="p-6">
              {canAttempt ? (
                <div className="flex items-start gap-4">
                  <div className="bg-success/20 rounded-full p-2 mt-1">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">You're eligible to take the quiz!</h3>
                    <p className="text-muted-foreground mb-4">
                      You have {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining this month. 
                      {activeQuizId ? " You have a quiz in progress." : ""}
                    </p>
                    <button
                      onClick={startQuiz}
                      className="btn btn-primary px-6 py-2 flex items-center"
                    >
                      {activeQuizId ? (
                        <>
                          <Clock className="h-5 w-5 mr-2" />
                          Continue Quiz
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Start Certification Quiz
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="bg-warning/20 rounded-full p-2 mt-1">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">You've reached your attempt limit</h3>
                    {nextAttemptDate ? (
                      <p className="text-muted-foreground mb-4">
                        You can try again on {nextAttemptDate.toLocaleDateString()}. Each user is limited to 3 attempts per month.
                      </p>
                    ) : (
                      <p className="text-muted-foreground mb-4">
                        You've already passed the certification! Visit your reader dashboard.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Quiz Requirements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-serif font-bold">Quiz Information</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-muted/30 p-2 rounded-full">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">15 Challenging Questions</h3>
                    <p className="text-sm text-muted-foreground">Multiple choice questions on tarot knowledge</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-muted/30 p-2 rounded-full">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">20 Minute Time Limit</h3>
                    <p className="text-sm text-muted-foreground">Complete all questions within the time limit</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-muted/30 p-2 rounded-full">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">75% Passing Score</h3>
                    <p className="text-sm text-muted-foreground">Score at least 75% to become certified</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-muted/30 p-2 rounded-full">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">3 Attempts per Month</h3>
                    <p className="text-sm text-muted-foreground">Limited to 3 tries each month if you don't pass</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-serif font-bold">Knowledge Required</h2>
              </div>
              <div className="p-6 space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-5 w-5 text-accent mt-0.5" />
                    <span>Major & Minor Arcana card meanings and symbolism</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-5 w-5 text-accent mt-0.5" />
                    <span>Traditional and reversed interpretations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-5 w-5 text-accent mt-0.5" />
                    <span>Common tarot spreads and layouts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-5 w-5 text-accent mt-0.5" />
                    <span>Tarot history and traditions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-5 w-5 text-accent mt-0.5" />
                    <span>Reading ethics and best practices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-5 w-5 text-accent mt-0.5" />
                    <span>Client interaction and communication skills</span>
                  </li>
                </ul>
                
                {/* Study resources */}
                <div className="pt-4 mt-4 border-t border-border">
                  <Link to="#" className="text-primary hover:underline flex items-center text-sm">
                    <BookOpen className="h-4 w-4 mr-1" />
                    View Study Resources
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 border border-border rounded-xl p-8 text-center"
          >
            <h2 className="text-2xl font-serif font-bold mb-6">Benefits of Becoming a Certified Reader</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-card/60 backdrop-blur-xs p-6 rounded-lg">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Verified Credentials</h3>
                <p className="text-sm text-muted-foreground">
                  Display a verified certification badge on your profile, building trust with clients
                </p>
              </div>
              
              <div className="bg-card/60 backdrop-blur-xs p-6 rounded-lg">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Client Connections</h3>
                <p className="text-sm text-muted-foreground">
                  Get featured on our Readers page where clients can discover and book your services
                </p>
              </div>
              
              <div className="bg-card/60 backdrop-blur-xs p-6 rounded-lg">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Professional Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Access reader-exclusive tools, analytics, and resources to enhance your practice
                </p>
              </div>
            </div>
            
            <button 
              onClick={startQuiz}
              disabled={!canAttempt}
              className="btn btn-primary py-3 px-8 text-base font-medium disabled:opacity-70"
            >
              {canAttempt ? (
                <>
                  <TarotLogo className="h-5 w-5 mr-2" />
                  {activeQuizId ? 'Continue Your Quiz' : 'Start Certification Quiz'}
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 mr-2" />
                  Try Again Later
                </>
              )}
            </button>
            
            {!canAttempt && nextAttemptDate && (
              <p className="mt-4 text-sm text-muted-foreground">
                Your next attempt will be available on {nextAttemptDate.toLocaleDateString()}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Icons
const Star = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;

const Moon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

const Sun = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;

const Sparkles = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;

const Users = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

export default BecomeReader;