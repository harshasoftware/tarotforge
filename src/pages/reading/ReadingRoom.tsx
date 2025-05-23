import React, { useState } from 'react';

interface ReadingRoomProps {
  selectedLayout?: string;
}

export default function ReadingRoom({ selectedLayout }: ReadingRoomProps) {
  const [readingStarted, setReadingStarted] = useState(false);

  const startReading = () => {
    setReadingStarted(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {!readingStarted && (
        <>
          <button 
            onClick={() => selectedLayout && startReading()}
            disabled={!selectedLayout}
            className="w-full btn btn-primary py-2 disabled:opacity-50"
          >
            Start Reading
          </button>
        </>
      )}
      
      {readingStarted && (
        <div className="reading-content">
          {/* Reading content will go here */}
        </div>
      )}
    </div>
  );
}