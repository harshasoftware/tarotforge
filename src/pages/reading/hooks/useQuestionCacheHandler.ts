import { useEffect } from 'react';
import { getTodayDateString } from '../utils/sessionHelpers'; // Assuming this utility exists

interface QuestionCacheEntry {
  questions: string[];
  date: string;
}

interface QuestionCache {
  [key: string]: QuestionCacheEntry;
}

interface UseQuestionCacheHandlerProps {
  setQuestionCache: (cache: QuestionCache) => void;
}

export function useQuestionCacheHandler({ setQuestionCache }: UseQuestionCacheHandlerProps) {
  useEffect(() => {
    console.log('[QuestionCache] Attempting to load question cache from localStorage...');
    try {
      const savedCache = localStorage.getItem('tarot_question_cache');
      if (savedCache) {
        const parsedCache: QuestionCache = JSON.parse(savedCache);
        const today = getTodayDateString();
        const validCache: QuestionCache = {};

        Object.entries(parsedCache).forEach(([category, data]) => {
          if (data.date === today) {
            validCache[category] = data;
          }
        });

        setQuestionCache(validCache);
        console.log('[QuestionCache] Loaded and cleaned cache:', Object.keys(validCache).length, 'valid entries.');

        if (Object.keys(validCache).length !== Object.keys(parsedCache).length) {
          localStorage.setItem('tarot_question_cache', JSON.stringify(validCache));
          console.log('[QuestionCache] Updated localStorage with cleaned cache.');
        }
      } else {
        console.log('[QuestionCache] No cache found in localStorage.');
      }
    } catch (error) {
      console.error('[QuestionCache] Error loading question cache:', error);
      localStorage.removeItem('tarot_question_cache'); // Clear corrupted cache
    }
  }, [setQuestionCache]);
} 