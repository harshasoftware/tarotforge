export const generateShareableLink = (id: string): string => {
  const baseUrl = window.location.origin;
  const currentPath = window.location.pathname;
  return `${baseUrl}${currentPath}?join=${id}`;
};

// Helper function to get today's date string
export const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Helper function to check if cached questions are still valid (same day)
export const isCacheValid = (category: string, questionCache: {[key: string]: {questions: string[], date: string}}) => {
  const cached = questionCache[category];
  if (!cached) return false;
  return cached.date === getTodayDateString();
}; 