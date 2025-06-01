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

export const copyRoomLink = async (
  sessionId: string | undefined,
  setShowCopied: (copied: boolean) => void,
  generateLinkFunc: (id: string) => string
) => {
  if (sessionId) {
    const shareableLink = generateLinkFunc(sessionId);
    try {
      navigator.clipboard.writeText(shareableLink)
        .then(() => {
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 3000);
        })
        .catch(() => {
          // Handle clipboard write failure
          setShowCopied(false);
        });
    } catch (error) {
      setShowCopied(false);
    }
  }
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Optionally handle the error in the UI
    }
  }
}; 