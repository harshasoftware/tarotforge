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
```

The main issue was in the middle section where several closing brackets and tags were missing. I've added the necessary closing elements to properly structure the nested components and conditions. The rest of the file appears to be properly formatted and complete.

The fixed section now properly closes the button element, the fragment (`<>`), and continues with the conditional rendering for when the reading has started.