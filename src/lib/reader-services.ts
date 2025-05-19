import { supabase } from './supabase';
import type { User, QuizAttempt, QuizQuestion } from '../types';
import { generateTarotQuiz } from './gemini-ai';

/**
 * Check if a user can take the tarot reader certification quiz
 * @param userId The user ID to check
 * @returns Object containing eligibility status and next attempt date
 */
export const checkQuizEligibility = async (userId: string): Promise<{ 
  canAttempt: boolean; 
  attemptsRemaining: number;
  nextAttemptDate: Date | null;
  activeQuizId: string | null;
}> => {
  try {
    const MAX_MONTHLY_ATTEMPTS = 3;
    
    // Get the current time
    const now = new Date();
    
    // Calculate the start of the current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthISOString = startOfMonth.toISOString();
    
    // Query for existing attempts this month
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .gte('taken_at', startOfMonthISOString)
      .order('taken_at', { ascending: false });
      
    if (error) {
      console.error('Error checking quiz eligibility:', error);
      throw error;
    }
    
    // Check if there's an active quiz in progress
    const activeQuiz = attempts?.find(attempt => attempt.status === 'in_progress');
    
    if (activeQuiz) {
      return {
        canAttempt: true,
        attemptsRemaining: MAX_MONTHLY_ATTEMPTS - (attempts?.length || 0),
        nextAttemptDate: null,
        activeQuizId: activeQuiz.id
      };
    }
    
    // Check if user has reached maximum attempts for the month
    const attemptsCount = attempts?.length || 0;
    if (attemptsCount >= MAX_MONTHLY_ATTEMPTS) {
      // Calculate the date for the next month when they can attempt again
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      return {
        canAttempt: false,
        attemptsRemaining: 0,
        nextAttemptDate: nextMonth,
        activeQuizId: null
      };
    }
    
    // Check if the user has already passed the quiz
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_reader, reader_since')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error checking user reader status:', userError);
      throw userError;
    }
    
    // If the user is already a certified reader, they don't need to take the quiz again
    if (userData?.is_reader) {
      return {
        canAttempt: false,
        attemptsRemaining: 0,
        nextAttemptDate: null,
        activeQuizId: null
      };
    }
    
    // User can take the quiz
    return {
      canAttempt: true,
      attemptsRemaining: MAX_MONTHLY_ATTEMPTS - attemptsCount,
      nextAttemptDate: null,
      activeQuizId: null
    };
  } catch (error) {
    console.error('Error in checkQuizEligibility:', error);
    // Default to allowing an attempt if there's an error
    return { 
      canAttempt: true, 
      attemptsRemaining: 1,
      nextAttemptDate: null,
      activeQuizId: null
    };
  }
};

/**
 * Start a new quiz attempt
 * @param userId The user ID starting the quiz
 * @returns The quiz ID, questions, and time limit
 */
export const startTarotQuiz = async (userId: string): Promise<{
  quizId: string;
  questions: QuizQuestion[];
  timeLimit: number; // in seconds
}> => {
  try {
    // Generate quiz questions
    const questions = await generateTarotQuiz(15);
    
    // Setting time limit as 20 minutes (1200 seconds)
    const timeLimit = 1200;
    
    // Create a new quiz attempt in the database
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_attempts')
      .insert([{
        user_id: userId,
        questions: JSON.stringify(questions),
        score: 0,
        passed: false,
        time_limit: timeLimit,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }])
      .select('id')
      .single();
      
    if (quizError || !quizData) {
      console.error('Error creating quiz attempt:', quizError);
      throw quizError || new Error('Failed to create quiz attempt');
    }
    
    return {
      quizId: quizData.id,
      questions,
      timeLimit
    };
  } catch (error) {
    console.error('Error in startTarotQuiz:', error);
    throw error;
  }
};

/**
 * Fetch an existing quiz by ID
 * @param quizId The quiz ID to fetch
 * @returns The quiz data including questions and time remaining
 */
export const fetchQuizById = async (quizId: string): Promise<{
  questions: QuizQuestion[];
  timeRemaining: number; // in seconds
  startedAt: string;
}> => {
  try {
    // Fetch the quiz from the database
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', quizId)
      .single();
      
    if (quizError || !quizData) {
      console.error('Error fetching quiz:', quizError);
      throw quizError || new Error('Failed to fetch quiz');
    }
    
    const questions = JSON.parse(quizData.questions) as QuizQuestion[];
    const startedAt = new Date(quizData.started_at);
    const now = new Date();
    
    // Calculate time remaining
    const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    const timeRemaining = Math.max(0, quizData.time_limit - elapsedSeconds);
    
    return {
      questions,
      timeRemaining,
      startedAt: quizData.started_at
    };
  } catch (error) {
    console.error('Error in fetchQuizById:', error);
    throw error;
  }
};

/**
 * Submit quiz answers and grade them
 * @param quizId The quiz ID
 * @param userId The user ID
 * @param answers Array of user's answers (indices of selected options)
 * @returns The quiz results
 */
export const submitQuizAnswers = async (
  quizId: string,
  userId: string,
  answers: number[]
): Promise<{
  score: number;
  totalQuestions: number;
  passed: boolean;
  correctAnswers: number;
  timeElapsed: number;
}> => {
  try {
    // Fetch the quiz data
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', quizId)
      .single();
      
    if (quizError || !quizData) {
      console.error('Error fetching quiz for submission:', quizError);
      throw quizError || new Error('Failed to fetch quiz');
    }
    
    // Verify the quiz belongs to the user and is in progress
    if (quizData.user_id !== userId) {
      throw new Error('Unauthorized access to quiz');
    }
    
    if (quizData.status !== 'in_progress') {
      throw new Error('Quiz has already been completed');
    }
    
    // Parse the questions
    const questions = JSON.parse(quizData.questions) as QuizQuestion[];
    
    if (answers.length !== questions.length) {
      throw new Error(`Answer count mismatch: expected ${questions.length}, got ${answers.length}`);
    }
    
    // Grade the quiz
    let correctAnswers = 0;
    
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].correctAnswer === answers[i]) {
        correctAnswers++;
      }
    }
    
    const score = (correctAnswers / questions.length) * 100;
    
    // Determine if the user passed (75% is passing grade)
    const passed = score >= 75;
    
    // Calculate time elapsed
    const startedAt = new Date(quizData.started_at);
    const completedAt = new Date();
    const timeElapsed = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);
    
    // Update the quiz attempt in the database
    const { error: updateError } = await supabase
      .from('quiz_attempts')
      .update({
        score,
        passed,
        user_answers: JSON.stringify(answers),
        status: 'completed',
        completed_at: completedAt.toISOString()
      })
      .eq('id', quizId);
      
    if (updateError) {
      console.error('Error updating quiz attempt:', updateError);
      throw updateError;
    }
    
    // If the user passed, update their reader status
    if (passed) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          is_reader: true,
          reader_since: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (userUpdateError) {
        console.error('Error updating user reader status:', userUpdateError);
        // Don't fail the whole operation if this part fails
      }
    }
    
    return {
      score,
      totalQuestions: questions.length,
      passed,
      correctAnswers,
      timeElapsed
    };
  } catch (error) {
    console.error('Error in submitQuizAnswers:', error);
    throw error;
  }
};

/**
 * Fetch all certified readers
 * @returns Array of users who are certified readers
 */
export const fetchAllReaders = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_reader', true)
      .order('reader_since', { ascending: false });
    
    if (error) {
      console.error('Error fetching readers:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchAllReaders:', error);
    throw error;
  }
};

/**
 * Get all quiz attempts for a user
 * @param userId The user ID
 * @returns Array of quiz attempts
 */
export const getUserQuizAttempts = async (userId: string): Promise<QuizAttempt[]> => {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('taken_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching quiz attempts:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserQuizAttempts:', error);
    throw error;
  }
};