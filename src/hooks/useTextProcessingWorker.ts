import { useEffect, useRef, useCallback, useMemo } from 'react';

// Store for pending requests
const pendingRequests = new Map<number, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();

let requestIdCounter = 0;

export interface CleanedLine {
  content: string;
  isHeader: boolean;
  isBullet: boolean;
}

export interface TextAnalysis {
  wordCount: number;
  readingTime: number;
  headerCount: number;
  lineCount: number;
  headers: any[];
  cleaned: CleanedLine[];
}

/**
 * Hook to manage the Text Processing Worker
 *
 * Handles CPU-intensive text operations:
 * - Markdown cleaning with regex operations
 * - Text formatting and transformation
 * - Header extraction
 * - HTML conversion
 *
 * Prevents UI blocking during intensive regex operations.
 */
export const useTextProcessingWorker = () => {
  const workerRef = useRef<Worker | null>(null);

  /**
   * Clean markdown text to structured plain text
   */
  const cleanMarkdown = useCallback(async (text: string): Promise<CleanedLine[]> => {
    if (!workerRef.current) {
      console.warn('[useTextProcessingWorker] Worker not available, using fallback');
      return cleanMarkdownFallback(text);
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Clean markdown request timed out'));
      }, 10000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'CLEAN_MARKDOWN',
        payload: { requestId, text }
      });
    });
  }, []);

  /**
   * Extract headers from markdown text
   */
  const extractHeaders = useCallback(async (text: string): Promise<any[]> => {
    if (!workerRef.current) {
      console.warn('[useTextProcessingWorker] Worker not available');
      return [];
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Extract headers request timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'EXTRACT_HEADERS',
        payload: { requestId, text }
      });
    });
  }, []);

  /**
   * Convert markdown to HTML
   */
  const markdownToHTML = useCallback(async (text: string): Promise<string> => {
    if (!workerRef.current) {
      console.warn('[useTextProcessingWorker] Worker not available');
      return text;
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Markdown to HTML request timed out'));
      }, 10000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'MARKDOWN_TO_HTML',
        payload: { requestId, text }
      });
    });
  }, []);

  /**
   * Strip all markdown formatting
   */
  const stripMarkdown = useCallback(async (text: string): Promise<string> => {
    if (!workerRef.current) {
      console.warn('[useTextProcessingWorker] Worker not available');
      return text;
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Strip markdown request timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'STRIP_MARKDOWN',
        payload: { requestId, text }
      });
    });
  }, []);

  /**
   * Comprehensive text analysis
   */
  const analyzeText = useCallback(async (text: string): Promise<TextAnalysis> => {
    if (!workerRef.current) {
      console.warn('[useTextProcessingWorker] Worker not available');
      return {
        wordCount: 0,
        readingTime: 0,
        headerCount: 0,
        lineCount: 0,
        headers: [],
        cleaned: []
      };
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Analyze text request timed out'));
      }, 15000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'ANALYZE_TEXT',
        payload: { requestId, text }
      });
    });
  }, []);

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker('/text-processing-worker.js');

      workerRef.current.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'CLEAN_MARKDOWN_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.cleanedLines);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'EXTRACT_HEADERS_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.headers);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'MARKDOWN_TO_HTML_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.html);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'STRIP_MARKDOWN_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.plainText);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'ANALYZE_TEXT_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.analysis);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'ERROR': {
            console.error('[useTextProcessingWorker] Worker error:', payload.error);
            break;
          }

          default:
            console.warn('[useTextProcessingWorker] Unknown message type:', type);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('[useTextProcessingWorker] Worker error:', error);
      };

      console.log('[useTextProcessingWorker] Worker initialized successfully');
    } catch (error) {
      console.error('[useTextProcessingWorker] Failed to create worker:', error);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return useMemo(() => ({
    cleanMarkdown,
    extractHeaders,
    markdownToHTML,
    stripMarkdown,
    analyzeText,
    isWorkerAvailable: () => workerRef.current !== null
  }), [cleanMarkdown, extractHeaders, markdownToHTML, stripMarkdown, analyzeText]);
};

// Fallback function (synchronous)
function cleanMarkdownFallback(text: string): CleanedLine[] {
  if (!text) return [];

  const lines = text.split('\n');

  return lines.map(line => {
    let cleanLine = line.trim();
    let isHeader = false;
    let isBullet = false;

    // Remove markdown headers
    if (cleanLine.startsWith('**') && cleanLine.endsWith('**')) {
      cleanLine = cleanLine.slice(2, -2);
      isHeader = true;
    } else if (cleanLine.startsWith('# ')) {
      cleanLine = cleanLine.slice(2);
      isHeader = true;
    } else if (cleanLine.startsWith('## ')) {
      cleanLine = cleanLine.slice(3);
      isHeader = true;
    } else if (cleanLine.startsWith('### ')) {
      cleanLine = cleanLine.slice(4);
      isHeader = true;
    }

    // Handle bullet points
    if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
      cleanLine = cleanLine.slice(2);
      isBullet = true;
    }

    // Remove inline markdown formatting
    cleanLine = cleanLine.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
    cleanLine = cleanLine.replace(/\*(.*?)\*/g, '$1'); // Remove italic
    cleanLine = cleanLine.replace(/`(.*?)`/g, '$1'); // Remove code

    return {
      content: cleanLine,
      isHeader,
      isBullet
    };
  }).filter(line => line.content.length > 0);
}
