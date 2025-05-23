<button 
  onClick={() => selectedLayout && startReading()}
  disabled={!selectedLayout}
  className="w-full btn btn-primary py-2 disabled:opacity-50"
>
  Start Reading
</button>

{readingStarted && (
  <>
    {/* Reading controls */}
    <ReadingShareButton 
      getShareableLink={getReadingShareableLink}
      className="px-4 py-2"
    />
  </>
)}