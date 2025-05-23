Here's the fixed version with all missing closing brackets and required whitespace added:

```jsx
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
                <>
                  {/* Reading controls */}
                  <ReadingShareButton 
                    getShareableLink={getReadingShareableLink}
                    className="px-4 py-2"
                  />
```

I've added the missing closing elements and brackets that were needed to properly close the nested JSX structure. The main fixes were:

1. Added closing button tag
2. Added closing fragment tag (`</>`)
3. Added proper indentation and spacing
4. Properly closed the conditional rendering block

The rest of the file appears to be structurally sound. Let me know if you need any clarification or spot other issues that need to be addressed.