import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Award, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import QuizQuestion from '../../components/quiz/QuizQuestion';
import QuizTimer from '../../components/quiz/QuizTimer';
import { QuizQuestion as QuizQuestionType } from '../../types';
import { startTarotQuiz, fetchQuizById, submitQuizAnswers } from '../../lib/reader-services';
import TarotLogo from '../../components/ui/TarotLogo';

// Quiz states
type QuizState = 'loading' | 'instructions' | 'active' | 'submitting' | 'results' | 'error' | 'timeout';

const TarotQuiz: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    timeElapsed: number;
  } | null>(null);
  
  // Initialize the quiz
  useEffect(() => {
    const initializeQuiz = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      
      try {
        setQuizState('loading');
        
        // Check if there's an existing quiz ID in the URL
        const existingQuizId = searchParams.get('id');
        
        if (existingQuizId) {
          // Resume existing quiz
          const quizData = await fetchQuizById(existingQuizId);
          
          setQuizId(existingQuizId);
          setQuestions(quizData.questions);
          setTimeRemaining(quizData.timeRemaining);
          
          // Initialize answer array
          setUserAnswers(Array(quizData.questions.length).fill(null));
          
          setQuizState('instructions');
        } else {
          // Start a new quiz
          const newQuiz = await startTarotQuiz(user.id);
          
          setQuizId(newQuiz.quizId);
          setQuestions(newQuiz.questions);
          setTimeRemaining(newQuiz.timeLimit);
          
          // Initialize answer array
          setUserAnswers(Array(newQuiz.questions.length).fill(null));
          
          setQuizState('instructions');
        }
      } catch (err: any) {
        console.error('Error initializing quiz:', err);
        setError(err.message || 'Failed to initialize quiz');
        setQuizState('error');
      }
    };
    
    initializeQuiz();
  }, [user, navigate, searchParams]);
  
  // Handle quiz start
  const startQuiz = () => {
    setQuizState('active');
  };
  
  // Handle answer selection
  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = answerIndex;
    setUserAnswers(newAnswers);
  };
  
  // Navigate to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Navigate to previous question
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Jump to specific question
  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };
  
  // Handle quiz submission
  const handleSubmitQuiz = async () => {
    if (!quizId || !user) return;
    
    try {
      setQuizState('submitting');
      
      // Check if all questions are answered
      const unansweredCount = userAnswers.filter(a => a === null).length;
      
      if (unansweredCount > 0) {
        if (!window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
          setQuizState('active');
          return;
        }
      }
      
      // Replace any null answers with 0 (first option)
      const finalAnswers = userAnswers.map(a => a === null ? 0 : a);
      
      // Submit the answers
      const results = await submitQuizAnswers(quizId, user.id, finalAnswers);
      
      setQuizResults(results);
      setQuizState('results');
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      setError(err.message || 'Failed to submit quiz');
      setQuizState('error');
    }
  };
  
  // Handle time up
  const handleTimeUp = () => {
    setQuizState('timeout');
  };
  
  // Return to the previous page
  const goBack = () => {
    navigate('/become-reader');
  };
  
  // Check if all questions have been answered
  const allQuestionsAnswered = userAnswers.every(a => a !== null);
  
  // Render different content based on quiz state
  const renderContent = () => {
    switch (quizState) {
      case 'loading':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-medium mb-2">Preparing Your Quiz</h2>
            <p className="text-muted-foreground">
              We're generating challenging questions to test your tarot knowledge...
            </p>
          </div>
        );
      
      case 'instructions':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-xl p-8 max-w-3xl mx-auto"
          >
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/20 p-3">
                  <TarotLogo className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-serif font-bold mb-3">Tarot Reader Certification Quiz</h2>
              <p className="text-muted-foreground">
                Demonstrate your knowledge of tarot to become a certified reader.
              </p>
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium mb-2 text-lg">Quiz Instructions:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <span>
                    You have <strong>20 minutes</strong> to complete 15 questions. The timer will start once you begin.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <span>
                    You need to score <strong>75% or higher</strong> to pass and become certified.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <span>
                    You can navigate between questions and review your answers before submitting.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <span>
                    If you run out of time, your answers will be automatically submitted.
                  </span>
                </li>
              </ul>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg mb-6">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Important Note:</p>
                  <p className="text-sm text-muted-foreground">
                    The quiz covers tarot history, symbolism, card meanings, spreads, and reading ethics. 
                    You are limited to 3 attempts per month.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={goBack}
                className="btn btn-ghost border border-input py-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Not Ready Yet
              </button>
              <button
                onClick={startQuiz}
                className="btn btn-primary py-2 flex items-center justify-center"
              >
                <TarotLogo className="h-4 w-4 mr-2" />
                Begin Quiz
              </button>
            </div>
          </motion.div>
        );
      
      case 'active':
        return (
          <div className="max-w-3xl mx-auto">
            {/* Timer */}
            <div className="mb-6">
              <QuizTimer
                timeRemaining={timeRemaining}
                onTimeUp={handleTimeUp}
              />
            </div>
            
            {/* Current Question */}
            <div className="mb-6">
              <QuizQuestion
                question={questions[currentQuestionIndex]}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={questions.length}
                userAnswer={userAnswers[currentQuestionIndex]}
                onAnswerSelect={(answer) => handleAnswerSelect(currentQuestionIndex, answer)}
              />
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between mb-6">
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="btn btn-ghost border border-input py-2 px-4 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={nextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className="btn btn-primary py-2 px-4 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            
            {/* Question Navigation */}
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Question Navigator</h3>
                <span className="text-sm text-muted-foreground">
                  {userAnswers.filter(a => a !== null).length} of {questions.length} answered
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => jumpToQuestion(index)}
                    className={`w-full aspect-square flex items-center justify-center rounded-md text-sm 
                      ${currentQuestionIndex === index ? 'bg-primary text-primary-foreground' : 
                        userAnswers[index] !== null ? 'bg-primary/20 text-primary' : 'bg-card border border-input'}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Submit button */}
            <div className="flex justify-end">
              <button
                onClick={handleSubmitQuiz}
                className={`btn py-2 px-6 flex items-center justify-center ${
                  allQuestionsAnswered ? 'btn-accent' : 'btn-primary'
                }`}
              >
                {allQuestionsAnswered ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Submit Quiz
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Submit Anyway ({userAnswers.filter(a => a !== null).length}/{questions.length})
                  </>
                )}
              </button>
            </div>
          </div>
        );
      
      case 'submitting':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-medium mb-2">Grading Your Quiz</h2>
            <p className="text-muted-foreground">
              Please wait while we calculate your results...
            </p>
          </div>
        );
      
      case 'results':
        if (!quizResults) return null;
        
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20 p-8 text-center">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  {quizResults.passed ? (
                    <div className="bg-success/20 w-full h-full rounded-full flex items-center justify-center">
                      <Award className="h-10 w-10 text-success" />
                    </div>
                  ) : (
                    <div className="bg-warning/20 w-full h-full rounded-full flex items-center justify-center">
                      <XCircle className="h-10 w-10 text-warning" />
                    </div>
                  )}
                </div>
                
                <h2 className="text-2xl font-serif font-bold mb-2">
                  {quizResults.passed ? 'Congratulations!' : 'Not Quite There'}
                </h2>
                
                <p className="text-lg mb-2">
                  {quizResults.passed 
                    ? "You've passed the certification quiz and are now a certified reader!" 
                    : "You didn't pass this time, but you can try again."}
                </p>
                
                <div className="inline-block bg-card py-2 px-4 rounded-full font-medium mb-2">
                  Score: {quizResults.score.toFixed(1)}%
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {quizResults.correctAnswers} of {quizResults.totalQuestions} correct • 
                  Time: {Math.floor(quizResults.timeElapsed / 60)}:{(quizResults.timeElapsed % 60).toString().padStart(2, '0')}
                </p>
              </div>
              
              <div className="p-6">
                <h3 className="font-medium text-lg mb-4">Quiz Results</h3>
                
                {/* Show the questions with correct/incorrect answers */}
                {questions.map((q, idx) => (
                  <QuizQuestion
                    key={q.id}
                    question={q}
                    questionNumber={idx + 1}
                    totalQuestions={questions.length}
                    userAnswer={userAnswers[idx]}
                    onAnswerSelect={() => {}}
                    showResults
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={goBack}
                className="btn btn-primary py-2 px-6"
              >
                {quizResults.passed ? 'Go to Reader Dashboard' : 'Return to Overview'}
              </button>
              {!quizResults.passed && (
                <button
                  onClick={() => navigate('/become-reader')}
                  className="btn btn-secondary py-2 px-6"
                >
                  Try Again Later
                </button>
              )}
            </div>
          </motion.div>
        );
      
      case 'timeout':
        return (
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">Time's Up!</h2>
              <p className="text-muted-foreground mb-6">
                Your time has expired. Your answers will be submitted automatically.
              </p>
              <button
                onClick={handleSubmitQuiz}
                className="btn btn-primary py-2 px-6"
              >
                Submit Answers
              </button>
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-destructive rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">Error</h2>
              <p className="text-muted-foreground mb-6">
                {error || 'An error occurred while loading the quiz. Please try again later.'}
              </p>
              <button
                onClick={goBack}
                className="btn btn-primary py-2 px-6"
              >
                Return to Overview
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="py-8">
          {quizState !== 'loading' && quizState !== 'instructions' && (
            <div className="flex items-center mb-8">
              <button
                onClick={goBack}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                disabled={quizState === 'active' || quizState === 'submitting'}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {quizState === 'active' || quizState === 'submitting' 
                  ? "Quiz in progress" 
                  : "Back to Reader Certification"}
              </button>
            </div>
          )}
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default TarotQuiz;