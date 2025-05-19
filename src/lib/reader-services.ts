import { supabase } from './supabase';
import type { User, QuizAttempt, QuizQuestion, ReaderLevel, ReaderReview, QuizDifficultyLevel } from '../types';
import { getQuizQuestions } from './quiz-data';

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
      .gte('started_at', startOfMonthISOString)
      .order('started_at', { ascending: false });
      
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
    // Determine the quiz difficulty based on the user's current level
    const difficulty = await getQuizDifficultyForUser(userId);
    
    // Generate quiz questions - using static questions for now
    // In a production environment, this would use the AI-generated questions
    const questions = getQuizQuestions(15, difficulty);
    
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
        started_at: new Date().toISOString(),
        difficulty_level: difficulty
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
 * Determine the appropriate quiz difficulty for a user based on their level
 * @param userId User ID
 * @returns Quiz difficulty level
 */
async function getQuizDifficultyForUser(userId: string): Promise<QuizDifficultyLevel> {
  try {
    // Get user data including level_id
    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        *,
        readerLevel:level_id (
          rank_order
        )
      `)
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching user data for quiz difficulty:', error);
      return 'novice'; // Default to novice on error
    }
    
    // If user has no level or is not a reader yet, use novice
    if (!userData?.readerLevel) {
      return 'novice';
    }
    
    // Determine difficulty based on user's rank
    const rankOrder = userData.readerLevel.rank_order || 1;
    
    if (rankOrder >= 5) return 'archmage';
    if (rankOrder >= 4) return 'oracle';
    if (rankOrder >= 3) return 'mystic';
    if (rankOrder >= 2) return 'adept';
    return 'novice';
  } catch (error) {
    console.error('Error determining quiz difficulty:', error);
    return 'novice'; // Default to novice on error
  }
}

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
    
    // Get the required passing score (now based on quiz difficulty)
    const { data: levelData, error: levelError } = await supabase
      .from('reader_levels')
      .select('*')
      .eq('name', 'Novice Seer') // Default level for new readers
      .single();
      
    if (levelError) {
      console.error('Error fetching level data:', levelError);
      throw levelError;
    }
    
    // Determine if the user passed (using required score from level)
    const requiredScore = levelData?.required_quiz_score || 75;
    const passed = score >= requiredScore;
    
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
      .select(`
        *,
        readerLevel:level_id (*)
      `)
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
      .order('started_at', { ascending: false });
    
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

/**
 * Fetch all reader levels
 * @returns Array of reader levels
 */
export const fetchReaderLevels = async (): Promise<ReaderLevel[]> => {
  try {
    const { data, error } = await supabase
      .from('reader_levels')
      .select('*')
      .order('rank_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching reader levels:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchReaderLevels:', error);
    throw error;
  }
};

/**
 * Get reader details by ID with level information
 * @param readerId The reader's user ID
 * @returns Reader information including level details
 */
export const getReaderDetails = async (readerId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        readerLevel:level_id (*)
      `)
      .eq('id', readerId)
      .eq('is_reader', true)
      .single();
    
    if (error) {
      console.error('Error fetching reader details:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getReaderDetails:', error);
    return null;
  }
};

/**
 * Submit a review for a reader
 * @param readerId The ID of the reader being reviewed
 * @param clientId The ID of the client submitting the review
 * @param rating Rating (1-5)
 * @param review Text review (optional)
 * @param readingId Related reading ID (optional)
 * @returns Success status
 */
export const submitReaderReview = async (
  readerId: string,
  clientId: string,
  rating: number,
  review?: string,
  readingId?: string
): Promise<boolean> => {
  try {
    // Validate inputs
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    // Check if review for this reader + client + reading already exists
    const { data: existingReview, error: checkError } = await supabase
      .from('reader_reviews')
      .select('id')
      .eq('reader_id', readerId)
      .eq('client_id', clientId)
      .eq('reading_id', readingId || null)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking for existing review:', checkError);
      throw checkError;
    }
    
    // If review exists, update it
    if (existingReview) {
      const { error } = await supabase
        .from('reader_reviews')
        .update({
          rating,
          review,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingReview.id);
        
      if (error) {
        console.error('Error updating review:', error);
        throw error;
      }
    } else {
      // Create new review
      const { error } = await supabase
        .from('reader_reviews')
        .insert({
          reader_id: readerId,
          client_id: clientId,
          rating,
          review,
          reading_id: readingId
        });
        
      if (error) {
        console.error('Error creating review:', error);
        throw error;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in submitReaderReview:', error);
    return false;
  }
};

/**
 * Get reviews for a reader
 * @param readerId The reader's user ID
 * @returns Array of reviews
 */
export const getReaderReviews = async (readerId: string): Promise<ReaderReview[]> => {
  try {
    const { data, error } = await supabase
      .from('reader_reviews')
      .select(`
        *,
        client:client_id (username, avatar_url)
      `)
      .eq('reader_id', readerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching reader reviews:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getReaderReviews:', error);
    return [];
  }
};

/**
 * Update a user's completed readings count
 * @param readerId Reader ID
 * @param increment Amount to increment (default: 1)
 */
export const incrementReaderCompletedReadings = async (readerId: string, increment: number = 1): Promise<boolean> => {
  try {
    // Get current completed_readings count
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('completed_readings')
      .eq('id', readerId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching reader data:', fetchError);
      throw fetchError;
    }
    
    const currentCount = userData?.completed_readings || 0;
    const newCount = currentCount + increment;
    
    // Update the count
    const { error: updateError } = await supabase
      .from('users')
      .update({ completed_readings: newCount })
      .eq('id', readerId);
      
    if (updateError) {
      console.error('Error updating completed readings count:', updateError);
      throw updateError;
    }
    
    return true;
  } catch (error) {
    console.error('Error in incrementReaderCompletedReadings:', error);
    return false;
  }
};