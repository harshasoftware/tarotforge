import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const LoadingScreen = () => {
  const [showLoadingTooLong, setShowLoadingTooLong] = useState(false);

  // Show a helpful message if loading takes too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowLoadingTooLong(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="relative">
        <Sparkles className="h-16 w-16 text-accent animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping"></div>
      </div>
      <h2 className="mt-6 text-2xl font-serif">Tarot Forge</h2>
      <p className="mt-2 text-muted-foreground">Weaving magical experiences...</p>
      
      {showLoadingTooLong && (
        <div className="mt-8 max-w-md text-center p-4 bg-card rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            This is taking longer than expected. Try refreshing the page if it doesn't load soon.
          </p>
        </div>
      )}
    </div>
  );
};

export default LoadingScreen;