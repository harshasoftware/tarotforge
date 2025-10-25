/**
 * Text Processing Worker
 *
 * Handles CPU-intensive text operations:
 * 1. Markdown cleaning with regex operations
 * 2. Text formatting and transformation
 * 3. Interpretation text processing
 *
 * This worker prevents UI blocking during intensive regex operations
 * on large interpretation texts from AI.
 */

console.log('[TextProcessingWorker] Text Processing Worker initialized');

/**
 * Clean markdown formatting and convert to structured plain text
 * Performs multiple regex operations per line
 */
function cleanMarkdownText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.split('\n');

  const processedLines = lines.map(line => {
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

    // Remove inline markdown formatting (regex operations)
    cleanLine = cleanLine.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
    cleanLine = cleanLine.replace(/\*(.*?)\*/g, '$1'); // Remove italic
    cleanLine = cleanLine.replace(/`(.*?)`/g, '$1'); // Remove code
    cleanLine = cleanLine.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove links but keep text
    cleanLine = cleanLine.replace(/~~(.*?)~~/g, '$1'); // Remove strikethrough

    return {
      content: cleanLine,
      isHeader,
      isBullet
    };
  }).filter(line => line.content.length > 0); // Remove empty lines

  return processedLines;
}

/**
 * Extract headers from markdown text
 * Useful for creating table of contents
 */
function extractHeaders(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.split('\n');
  const headers = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      headers.push({ level: 1, text: trimmed.slice(2), lineNumber: index });
    } else if (trimmed.startsWith('## ')) {
      headers.push({ level: 2, text: trimmed.slice(3), lineNumber: index });
    } else if (trimmed.startsWith('### ')) {
      headers.push({ level: 3, text: trimmed.slice(4), lineNumber: index });
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      headers.push({ level: 2, text: trimmed.slice(2, -2), lineNumber: index });
    }
  });

  return headers;
}

/**
 * Convert markdown to HTML (simple conversion)
 */
function markdownToHTML(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let html = text;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Bullet points
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Strip all markdown formatting (plain text only)
 */
function stripMarkdown(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let plain = text;

  // Remove headers
  plain = plain.replace(/^#{1,6}\s+/gm, '');

  // Remove bold
  plain = plain.replace(/\*\*(.*?)\*\*/g, '$1');

  // Remove italic
  plain = plain.replace(/\*(.*?)\*/g, '$1');

  // Remove code
  plain = plain.replace(/`(.*?)`/g, '$1');

  // Remove links but keep text
  plain = plain.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // Remove strikethrough
  plain = plain.replace(/~~(.*?)~~/g, '$1');

  // Remove bullet points
  plain = plain.replace(/^[\*\-]\s+/gm, '');

  return plain.trim();
}

/**
 * Count words in text (useful for reading time estimation)
 */
function countWords(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const stripped = stripMarkdown(text);
  const words = stripped.trim().split(/\s+/);
  return words.filter(word => word.length > 0).length;
}

/**
 * Estimate reading time in minutes
 * Average reading speed: 200-250 words per minute
 */
function estimateReadingTime(text, wordsPerMinute = 225) {
  const wordCount = countWords(text);
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes;
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  console.log('[TextProcessingWorker] Received message:', type);

  try {
    switch (type) {
      case 'CLEAN_MARKDOWN': {
        const { requestId, text } = payload;
        console.log('[TextProcessingWorker] Cleaning markdown, length:', text?.length || 0);

        const startTime = performance.now();
        const cleaned = cleanMarkdownText(text);
        const duration = performance.now() - startTime;

        console.log('[TextProcessingWorker] Markdown cleaned in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'CLEAN_MARKDOWN_COMPLETE',
          payload: {
            requestId,
            cleanedLines: cleaned,
            duration
          }
        });
        break;
      }

      case 'EXTRACT_HEADERS': {
        const { requestId, text } = payload;
        console.log('[TextProcessingWorker] Extracting headers');

        const startTime = performance.now();
        const headers = extractHeaders(text);
        const duration = performance.now() - startTime;

        console.log('[TextProcessingWorker] Headers extracted in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'EXTRACT_HEADERS_COMPLETE',
          payload: {
            requestId,
            headers,
            duration
          }
        });
        break;
      }

      case 'MARKDOWN_TO_HTML': {
        const { requestId, text } = payload;
        console.log('[TextProcessingWorker] Converting markdown to HTML');

        const startTime = performance.now();
        const html = markdownToHTML(text);
        const duration = performance.now() - startTime;

        console.log('[TextProcessingWorker] Conversion completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'MARKDOWN_TO_HTML_COMPLETE',
          payload: {
            requestId,
            html,
            duration
          }
        });
        break;
      }

      case 'STRIP_MARKDOWN': {
        const { requestId, text } = payload;
        console.log('[TextProcessingWorker] Stripping markdown');

        const startTime = performance.now();
        const plain = stripMarkdown(text);
        const duration = performance.now() - startTime;

        console.log('[TextProcessingWorker] Stripping completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'STRIP_MARKDOWN_COMPLETE',
          payload: {
            requestId,
            plainText: plain,
            duration
          }
        });
        break;
      }

      case 'ANALYZE_TEXT': {
        // Comprehensive text analysis
        const { requestId, text } = payload;
        console.log('[TextProcessingWorker] Analyzing text');

        const startTime = performance.now();
        const wordCount = countWords(text);
        const readingTime = estimateReadingTime(text);
        const headers = extractHeaders(text);
        const cleaned = cleanMarkdownText(text);
        const duration = performance.now() - startTime;

        console.log('[TextProcessingWorker] Analysis completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'ANALYZE_TEXT_COMPLETE',
          payload: {
            requestId,
            analysis: {
              wordCount,
              readingTime,
              headerCount: headers.length,
              lineCount: cleaned.length,
              headers,
              cleaned
            },
            duration
          }
        });
        break;
      }

      case 'STOP':
        console.log('[TextProcessingWorker] Stopping worker');
        self.close();
        break;

      default:
        console.warn('[TextProcessingWorker] Unknown message type:', type);
        self.postMessage({
          type: 'ERROR',
          payload: {
            error: `Unknown message type: ${type}`
          }
        });
    }
  } catch (error) {
    console.error('[TextProcessingWorker] Error processing message:', error);
    self.postMessage({
      type: 'ERROR',
      payload: {
        error: error.message,
        stack: error.stack
      }
    });
  }
});

console.log('[TextProcessingWorker] Ready to process text operations');
