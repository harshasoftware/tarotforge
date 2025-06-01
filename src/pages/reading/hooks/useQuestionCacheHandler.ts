import { useEffect } from 'react';
import { getTodayDateString } from '../utils/sessionHelpers'; // Assuming this utility exists

/**
 * @interface QuestionCacheEntry
 * @description Defines the structure for a cache entry for questions.
 * @property {string[]} questions - An array of questions for a specific category.
 * @property {string} date - The date (YYYY-MM-DD) when the cache entry was saved.
 */
interface QuestionCacheEntry {
  questions: string[];
  date: string;
}

/**
 * @interface QuestionCache
 * @description Defines the structure of the overall question cache, mapping categories to their entries.
 * @property {QuestionCacheEntry} [key: string] - Each key is a category name, and the value is its QuestionCacheEntry.
 */
interface QuestionCache {
  [key: string]: QuestionCacheEntry;
}

/**
 * @interface UseQuestionCacheHandlerProps
 * @description Props for the `useQuestionCacheHandler` hook.
 * @property {function(cache: QuestionCache): void} setQuestionCache - Callback function to update the question cache in the parent component's state.
 */
interface UseQuestionCacheHandlerProps {
  setQuestionCache: (cache: QuestionCache) => void;
}

/**
 * @hook useQuestionCacheHandler
 * @description React hook to manage loading and cleaning of a question cache from localStorage.
 * On mount, it attempts to load a 'tarot_question_cache' from localStorage.
 * It validates the cache entries, keeping only those that are for the current day.
 * If the cache is updated (by removing outdated entries), it writes the cleaned cache back to localStorage.
 * This hook does not return any value.
 * Its primary side effects are reading from and potentially writing to `localStorage`.
 *
 * @param {UseQuestionCacheHandlerProps} props - The properties for the hook.
 */
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