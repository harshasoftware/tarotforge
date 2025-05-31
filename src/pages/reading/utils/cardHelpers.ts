import { Card } from '../../../types';

// Fisher-Yates shuffle algorithm (Durstenfeld modern implementation)
export const fisherYatesShuffle = (array: Card[]): Card[] => {
  const shuffled = [...array]; // Create a copy to avoid mutating the original
  
  // Start from the last element and work backwards
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));
    
    // Swap elements at positions i and j
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

// Performance-optimized transform utility with memoization
export const getTransform = (zoomLevel: number, zoomFocus: { x: number; y: number } | null, panOffset: { x: number; y: number }) => {
  // Cache transform calculations to avoid recalculation
  const scale = `scale(${zoomLevel})`;
  const translate = zoomFocus 
    ? `translate(${50 - zoomFocus.x}%, ${50 - zoomFocus.y}%) translate(${panOffset.x}px, ${panOffset.y}px)`
    : `translate(${panOffset.x}px, ${panOffset.y}px)`;
  
  const transform = `${scale} ${translate}`;
  const transformOrigin = zoomFocus ? `${zoomFocus.x}% ${zoomFocus.y}%` : 'center center';
  
  return {
    transform,
    transformOrigin,
    willChange: 'transform', // Optimize for transforms
    // Add hardware acceleration hint
    backfaceVisibility: 'hidden' as const,
    perspective: 1000,
  };
};

// Function to clean markdown formatting and convert to plain text
export const cleanMarkdownText = (text: string): CleanedMarkdownLine[] => {
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
  }).filter(line => line.content.length > 0); // Remove empty lines
};

// Pinch to Zoom functionality helper
export const getTouchDistance = (touches: TouchList) => {
  if (touches.length < 2) return 0;
  const touch1 = touches[0];
  const touch2 = touches[1];
  return Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) + 
    Math.pow(touch2.clientY - touch1.clientY, 2)
  );
};

// Assuming CleanedMarkdownLine is defined something like this, ensure it's exported:
export interface CleanedMarkdownLine { 
  content: string; 
  isHeader?: boolean; 
  isBullet?: boolean; 
} 