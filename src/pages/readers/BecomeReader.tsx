import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Award, BookOpen, Check, ChevronRight, Clock, Shield, Sparkles, UserCheck, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { checkQuizEligibility, getUserQuizAttempts } from '../../lib/reader-services';
import TarotLogo from '../../components/ui/TarotLogo';

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
  
  useEffect(() => {
    const checkEligibility = async () => {
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
      } catch (err: any) {
        console.error('Error checking eligibility:', err);
        setError(err.message || 'Failed to check eligibility');
      } finally {
        setLoading(false);
      }
    };
    
    checkEligibility();
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
          <p className="text-muted-foreground">Checking eligibility...</p>
        </div>
      </div>
    );
  }
  
  if (user?.is_reader) {
    // User is already a certified reader
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
              You've already passed the certification exam and are recognized as an official Tarot Forge reader.
            </p>
            
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

// Needed for import to work
const Users = () => <svg></svg>;

export default BecomeReader;