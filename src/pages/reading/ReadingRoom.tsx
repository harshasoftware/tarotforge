import React, { useState } from 'react';

function ReadingRoom() {
  const [readingStarted, setReadingStarted] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);

  const startReading = () => {
    setReadingStarted(true);
  };

  return (
    <div>
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
        <div>
          {/* Reading content goes here */}
        </div>
      )}
    </div>
  );
}

export default ReadingRoom;