import { supabase } from './supabase';
import { User, ReaderLevel, ReaderReview, QuizQuestion as QuizQuestionType } from '../types';

/**
 * Fetch all reader profiles for the readers page
 * @returns Array of User objects with reader information
 */
export const fetchAllReaders = async (): Promise<User[]> => {
  try {
    // Fetch users who are readers
    const { data: readersData, error: readersError } = await supabase
      .from('users')
      .select(`
        *,
        readerLevel:level_id (
          id, 
          name, 
          color_theme, 
          icon, 
          base_price_per_minute,
          description
        )
      `)
      .eq('is_reader', true)
      .order('average_rating', { ascending: false });
      
    if (readersError) {
      console.error('Error fetching readers:', readersError);
      throw readersError;
    }
    
    // Process online status for each reader
    const now = new Date();
    const ONLINE_THRESHOLD_MINUTES = 5;
    
    const processedReaders = readersData?.map(reader => ({
      ...reader,
      is_online: reader.is_online && reader.last_seen_at 
        ? (now.getTime() - new Date(reader.last_seen_at).getTime()) / (1000 * 60) <= ONLINE_THRESHOLD_MINUTES
        : false
    })) || [];
    
    return processedReaders;
  } catch (error) {
    console.error('Error in fetchAllReaders:', error);
    return [];
  }
};

/**
 * Check if a user is eligible to take the reader certification quiz
 * @param userId The user ID to check
 */
export const checkQuizEligibility = async (userId: string) => {
  try {
    // Check if the user already has active attempts
    const { data: attemptsData, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1);
      
    if (attemptsError) {
      console.error('Error checking quiz attempts:', attemptsError);
      throw attemptsError;
    }
    
    // If there's an in-progress attempt, return its ID
    if (attemptsData && attemptsData.length > 0) {
      return {
        canAttempt: true,
        attemptsRemaining: 3, // Default value
        nextAttemptDate: null,
        activeQuizId: attemptsData[0].id
      };
    }
    
    // Check how many attempts the user has made this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: monthAttempts, error: monthError } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('started_at', startOfMonth.toISOString())
      .not('status', 'eq', 'in_progress');
      
    if (monthError) {
      console.error('Error checking monthly quiz attempts:', monthError);
      throw monthError;
    }
    
    const attemptsThisMonth = monthAttempts?.length || 0;
    const attemptsRemaining = Math.max(0, 3 - attemptsThisMonth); // Limit to 3 attempts per month
    
    // Check if the user has already passed the quiz
    const { data: passedAttempt, error: passedError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('passed', true)
      .order('completed_at', { ascending: false })
      .limit(1);
      
    if (passedError) {
      console.error('Error checking passed quiz attempts:', passedError);
    }
    
    // Calculate next attempt date if needed
    let nextAttemptDate: Date | null = null;
    if (attemptsRemaining === 0) {
      nextAttemptDate = new Date();
      nextAttemptDate.setMonth(nextAttemptDate.getMonth() + 1);
      nextAttemptDate.setDate(1);
    }
    
    return {
      canAttempt: attemptsRemaining > 0 && !passedAttempt?.length,
      attemptsRemaining,
      nextAttemptDate,
      activeQuizId: null
    };
  } catch (error) {
    console.error('Error checking quiz eligibility:', error);
    throw error;
  }
};

/**
 * Get all quiz attempts for a user
 * @param userId The user ID
 */
export const getUserQuizAttempts = async (userId: string) => {
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
    return [];
  }
};

/**
 * Start a new tarot certification quiz
 * @param userId The user ID
 * @returns Quiz data including questions, time limit, and quiz ID
 */
export const startTarotQuiz = async (userId: string) => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        is_reader,
        readerLevel:level_id (
          id,
          name,
          rank_order,
          required_quiz_score,
          description,
          base_price_per_minute,
          color_theme,
          icon
        )
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data for quiz start:', userError);
      throw userError;
    }

    if (!userData) {
      throw new Error('User not found when trying to start quiz.');
    }

    let currentActualReaderLevel: ReaderLevel | null = null;
    if (Array.isArray(userData.readerLevel)) {
      if (userData.readerLevel.length > 0) {
        currentActualReaderLevel = userData.readerLevel[0] as ReaderLevel;
      } else {
        currentActualReaderLevel = null; 
      }
    } else {
      currentActualReaderLevel = userData.readerLevel as ReaderLevel | null; 
    }

    const currentRankOrder = currentActualReaderLevel?.rank_order || 0;
    const nextRankOrder = currentRankOrder + 1;

    const { data: nextLevelData, error: nextLevelError } = await supabase
      .from('reader_levels')
      .select('id, name, required_quiz_score, rank_order')
      .eq('rank_order', nextRankOrder)
      .single();

    if (nextLevelError || !nextLevelData) {
      console.error(`Error fetching next quiz level (rank ${nextRankOrder}):`, nextLevelError);
      throw new Error(`Could not determine the next quiz level. Current rank: ${currentRankOrder}. Attempted rank: ${nextRankOrder}`);
    }

    const quizDifficulty = nextLevelData.name.toLowerCase().replace(/\s+/g, '-');
    const timeLimitInSeconds = 15 * 60; 
    const numberOfQuestions = 15;

    const questionsForQuiz: Partial<QuizQuestionType>[] = Array.from({ length: numberOfQuestions }, (_, i) => ({
        id: i + 1,
        question: `Sample question ${i + 1} for ${quizDifficulty} level?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: Math.floor(Math.random() * 4),
        explanation: `This is an explanation for sample question ${i + 1}.`
    }));

    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert([{
        user_id: userId,
        reader_level_id_attempted: nextLevelData.id,
        questions: questionsForQuiz, 
        time_limit: timeLimitInSeconds, 
        status: 'in_progress',
        difficulty_level: quizDifficulty
      }])
      .select('id, questions, time_limit, difficulty_level')
      .single();

    if (attemptError) {
      console.error('Error creating quiz attempt:', attemptError);
      throw attemptError;
    }

    return {
      quizId: attempt.id,
      questions: attempt.questions as QuizQuestionType[],
      timeLimit: attempt.time_limit,
      difficultyLevel: attempt.difficulty_level
    };
  } catch (error) {
    console.error('Error starting tarot quiz:', error);
    throw error;
  }
};

/**
 * Get quiz attempt by ID
 * @param quizId The quiz ID
 * @returns Quiz data
 */
export const fetchQuizById = async (quizId: string) => {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*, reader_level_id_attempted ( name, rank_order ) ')
      .eq('id', quizId)
      .single();
      
    if (error) {
      console.error('Error fetching quiz:', error);
      throw error;
    }
    
    const startTime = data.started_at ? new Date(data.started_at).getTime() : Date.now();
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
    const timeRemaining = Math.max(0, (data.time_limit || 900) - elapsedSeconds); 
    
    return {
      ...data,
      questions: data.questions as QuizQuestionType[],
      timeRemaining,
      difficultyLevel: data.difficulty_level 
    };
  } catch (error) {
    console.error('Error in fetchQuizById:', error);
    throw error;
  }
};

/**
 * Submit quiz answers
 * @param quizId The quiz ID
 * @param userId The user ID
 * @param answers Array of answer indices
 * @returns Quiz results
 */
export const submitQuizAnswers = async (quizId: string, userId: string, answers: number[]) => {
  try {
    // Get the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', quizId)
      .single();
      
    if (quizError) {
      console.error('Error fetching quiz:', quizError);
      throw quizError;
    }
    
    // Calculate score
    const correctAnswers = quiz.questions.reduce((count: number, q: any, index: number) => {
      return count + (answers[index] === q.correctAnswer ? 1 : 0);
    }, 0);
    
    const totalQuestions = quiz.questions.length;
    const score = (correctAnswers / totalQuestions) * 100;
    
    // Calculate time elapsed
    const startTime = new Date(quiz.started_at).getTime();
    const endTime = Date.now();
    const timeElapsed = Math.floor((endTime - startTime) / 1000);
    
    // Check if passed based on level requirements
    const { data: levelData, error: levelError } = await supabase
      .from('reader_levels')
      .select('*')
      .eq('id', quiz.difficulty_level)
      .single();
      
    if (levelError) {
      console.error('Error fetching reader level:', levelError);
    }
    
    const passingScore = levelData?.required_quiz_score || 75;
    const passed = score >= passingScore;
    
    // Update the quiz attempt
    const { error: updateError } = await supabase
      .from('quiz_attempts')
      .update({
        user_answers: answers,
        score,
        passed,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', quizId);
      
    if (updateError) {
      console.error('Error updating quiz attempt:', updateError);
      throw updateError;
    }
    
    // If passed, update user reader status
    if (passed) {
      const { error: userError } = await supabase
        .from('users')
        .update({
          is_reader: true,
          reader_since: quiz.started_at,
          level_id: levelData?.id
        })
        .eq('id', userId);
        
      if (userError) {
        console.error('Error updating user reader status:', userError);
      }
    }
    
    return {
      score,
      passed,
      correctAnswers,
      totalQuestions,
      timeElapsed
    };
  } catch (error) {
    console.error('Error in submitQuizAnswers:', error);
    throw error;
  }
};

/**
 * Get reader levels for display
 * @returns Array of reader level objects
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
    return [];
  }
};

/**
 * Get detailed reader information including level data
 * @param readerId The reader ID
 * @returns Detailed user object with reader level data
 */
export const getReaderDetails = async (readerId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        readerLevel:level_id (
          id,
          name,
          rank_order,
          required_quiz_score,
          description,
          base_price_per_minute,
          color_theme,
          icon
        )
      `)
      .eq('id', readerId)
      .eq('is_reader', true)
      .single();
      
    if (error) {
      console.error('Error fetching reader details:', error);
      return null;
    }
    
    let processedData = data as any;
    if (data && Array.isArray(data.readerLevel) && data.readerLevel.length > 0) {
      processedData = { ...data, readerLevel: data.readerLevel[0] };
    } else if (data && Array.isArray(data.readerLevel) && data.readerLevel.length === 0) {
      processedData = { ...data, readerLevel: null };
    }

    return processedData as User | null;
  } catch (error) {
    console.error('Error in getReaderDetails catch block:', error);
    return null;
  }
};

/**
 * Get reviews for a specific reader
 * @param readerId The reader ID
 * @returns Array of reader reviews
 */
export const getReaderReviews = async (readerId: string): Promise<ReaderReview[]> => {
  try {
    const { data, error } = await supabase
      .from('reader_reviews')
      .select('*')
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
 * Upload a certificate to storage and save record in database
 * @param userId User ID 
 * @param imageBlob Certificate image as blob
 * @param metadata Certificate metadata
 */
export const uploadCertificate = async (
  userId: string,
  imageBlob: Blob,
  metadata: {
    username: string;
    level: string;
    certificationId: string;
    score: number;
    date: string;
  }
): Promise<string | null> => {
  try {
    // Upload image to storage
    const certificateId = `${userId}-${metadata.level.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const filePath = `certificates/${certificateId}.png`;
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('reader-certificates')
      .upload(filePath, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Error uploading certificate:', uploadError);
      throw uploadError;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('reader-certificates')
      .getPublicUrl(filePath);
      
    // Save certificate record in database
    const { error: dbError } = await supabase
      .from('reader_certificates')
      .insert([{
        user_id: userId,
        certificate_url: publicUrl,
        level_name: metadata.level,
        certification_id: metadata.certificationId,
        score: metadata.score,
        username: metadata.username,
        certification_date: new Date(metadata.date || new Date()).toISOString(),
        metadata: {
          generated_at: new Date().toISOString(),
          device_info: navigator.userAgent
        }
      }]);
      
    if (dbError) {
      console.error('Error saving certificate record:', dbError);
      throw dbError;
    }
    
    // Get the public sharable link
    // This is the URL that will be shared for viewing the certificate
    const shareableUrl = `${window.location.origin}/certificate/${certificateId}`;
    
    return shareableUrl;
  } catch (error) {
    console.error('Error in uploadCertificate:', error);
    return null;
  }
};