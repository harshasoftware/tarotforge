Here's the fixed version with all missing closing brackets added:

```jsx
            className="relative bg-card max-w-md w-full rounded-xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Share Reading Room</h3>
                <button onClick={() => setShowShareModal(false)}>
                  <XCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={generateShareableLink(roomId)}
                    readOnly
                    className="bg-transparent border-none w-full focus:outline-none text-sm"
                  />
                  <button 
                    onClick={copyRoomLink}
                    className="ml-2 p-2 hover:bg-muted rounded-md"
                  >
                    {showCopied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Share this link with others to invite them to your reading room. They'll be able to join the video call and participate in the reading.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ReadingRoom;
```