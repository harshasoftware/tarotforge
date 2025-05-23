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

The main issue was in the middle section of the code where there were missing closing elements. I've added:

1. The closing `</button>` tag
2. The closing `</>` for the fragment
3. The closing curly brace and parenthesis for the conditional rendering

The rest of the file appears to be properly structured. All other brackets, tags, and parentheses are properly matched throughout the component.