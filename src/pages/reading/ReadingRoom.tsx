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
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {!readingStarted && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Reading Room</h1>
              <p className="mt-2 text-gray-600">
                Select your layout and begin your reading session
              </p>
            </div>

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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Reading in Progress</h2>
            {/* Reading content will go here */}
          </div>
        )}
      </div>
    </div>
  );
}