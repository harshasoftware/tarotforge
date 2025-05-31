import React from 'react';

interface QuestionCategory {
  id: string;
  name: string;
  icon: string; // Or JSX.Element if icons are components
  desc: string;
}

interface AskQuestionScreenProps {
  isMobile: boolean;
  mobileLayoutClasses: { mainPadding: string };
  question: string;
  questionCategories: QuestionCategory[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  isLoadingQuestions: boolean;
  generatedQuestions: string[];
  handleCategorySelect: (category: string | null) => Promise<void>; // Assuming it can be async
  handleQuestionSelect: (question: string) => void;
  handleSkipQuestion: () => void;
  handleCustomQuestion: (question: string) => void;
  showCustomQuestionInput: boolean;
  setShowCustomQuestionInput: (show: boolean) => void;
  highlightedCategoryIndex: number;
  setHighlightedCategoryIndex: (index: number) => void;
  highlightedQuestionIndex: number;
  setHighlightedQuestionIndex: (index: number) => void;
  isCategoryHighlightingActive: boolean;
  setIsCategoryHighlightingActive: (active: boolean) => void;
  isQuestionHighlightingActive: boolean;
  setIsQuestionHighlightingActive: (active: boolean) => void;
}

const AskQuestionScreen: React.FC<AskQuestionScreenProps> = ({
  isMobile,
  mobileLayoutClasses,
  question,
  questionCategories,
  selectedCategory,
  setSelectedCategory,
  isLoadingQuestions,
  generatedQuestions,
  handleCategorySelect,
  handleQuestionSelect,
  handleSkipQuestion,
  handleCustomQuestion,
  showCustomQuestionInput,
  setShowCustomQuestionInput,
  highlightedCategoryIndex,
  setHighlightedCategoryIndex,
  highlightedQuestionIndex,
  setHighlightedQuestionIndex,
  isCategoryHighlightingActive,
  setIsCategoryHighlightingActive,
  isQuestionHighlightingActive,
  setIsQuestionHighlightingActive,
}) => {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${mobileLayoutClasses.mainPadding}`}>
      <div className={`w-full ${isMobile ? 'max-w-2xl max-h-full overflow-y-auto' : 'max-w-lg'} ${isMobile ? 'p-3' : 'p-4 md:p-6'} bg-card border border-border rounded-xl shadow-lg`}>
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-serif font-bold mb-2`}>🔮 Inspired Questions</h2>
          <p className="text-sm text-muted-foreground">
            Choose a life area for personalized questions, or skip to draw cards with your current question.
          </p>
        </div>

        {/* Current Question Display */}
        {question && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current question:</p>
            <p className="text-sm font-medium">"{question}"</p>
          </div>
        )}

        {/* Life Areas Categories */}
        {!selectedCategory && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {questionCategories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                onMouseEnter={() => {
                  setHighlightedCategoryIndex(index);
                  setIsCategoryHighlightingActive(true);
                }}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  isCategoryHighlightingActive && highlightedCategoryIndex === index 
                    ? 'border-accent bg-accent/10 ring-2 ring-accent' 
                    : 'border-border hover:border-accent/50 hover:bg-accent/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{category.icon}</span>
                  <h3 className="font-medium text-sm">{category.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{category.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Generated Questions */}
        {selectedCategory && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm">
                {selectedCategory === 'love' && '💕 Love Questions'}
                {selectedCategory === 'career' && '🎯 Career Questions'}
                {selectedCategory === 'finance' && '💰 Finance Questions'}
                {selectedCategory === 'relationships' && '👥 Relationship Questions'}
                {selectedCategory === 'spiritual-growth' && '⭐ Spiritual Growth Questions'}
                {selectedCategory === 'past-lives' && '♾️ Past Lives Questions'}
              </h3>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  // Consider resetting generatedQuestions here if appropriate: setGeneratedQuestions([]);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </div>

            {isLoadingQuestions ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Generating personalized questions...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {generatedQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionSelect(q)}
                    onMouseEnter={() => {
                      setHighlightedQuestionIndex(index);
                      setIsQuestionHighlightingActive(true);
                    }}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      isQuestionHighlightingActive && highlightedQuestionIndex === index 
                        ? 'border-accent bg-accent/10 ring-2 ring-accent' 
                        : 'border-border hover:border-accent/50 hover:bg-accent/5'
                    }`}
                  >
                    <p className="text-sm">{q}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Question Input */}
        {showCustomQuestionInput && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Write your own question</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="What would you like guidance on?"
                className="flex-1 p-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      handleCustomQuestion(input.value.trim());
                    }
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  setShowCustomQuestionInput(false);
                  setIsQuestionHighlightingActive(true); 
                  setIsCategoryHighlightingActive(true); 
                }}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          {!showCustomQuestionInput && (
            <button
              onClick={() => {
                setShowCustomQuestionInput(true);
                setIsQuestionHighlightingActive(false); 
                setIsCategoryHighlightingActive(false); 
              }}
              className="btn btn-secondary px-4 py-2 text-sm"
            >
              ✍️ Write Your Own
            </button>
          )}
          
          <button
            onClick={handleSkipQuestion}
            className="btn btn-ghost px-4 py-2 text-sm border border-input"
          >
            Skip & Draw Cards
          </button>
        </div>
      </div>
    </div>
  );
};

export default AskQuestionScreen; 