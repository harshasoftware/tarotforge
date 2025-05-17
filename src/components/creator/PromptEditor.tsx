import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, HelpCircle } from 'lucide-react';
import { generateElaborateTheme } from '../../lib/gemini-ai';

interface PromptEditorProps {
  initialValue?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const PromptEditor: React.FC<PromptEditorProps> = ({
  initialValue = '',
  onChange,
  onSubmit,
  disabled = false
}) => {
  const [value, setValue] = useState(initialValue);
  const [showHelp, setShowHelp] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange(newValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      onSubmit();
    }
  };
  
  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };
  
  // Basic prompt examples
  const examplePrompts = [
    "Create a dreamy underwater scene with bioluminescent creatures and ancient ruins",
    "Design in art nouveau style with flowing lines and natural motifs",
    "Use a dark color palette with deep purples and teals with gold accents",
    "Include cosmic elements like nebulae, stars, and planetary bodies",
    "Feature mystical animals as central figures in each card"
  ];
  
  // Theme inspiration suggestions
  const themeInspirations = [
    "Celestial Voyage",
    "Shamanic Vision",
    "Crystalline Wisdom",
    "Digital Oracle",
    "Ancient Mythology"
  ];
  
  const insertExample = (example: string) => {
    setValue(example);
    onChange(example);
  };
  
  const applyThemeInspiration = async (theme: string) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      // Generate elaborate theme description using Gemini AI
      const elaborateTheme = await generateElaborateTheme(theme);
      
      if (elaborateTheme) {
        setValue(elaborateTheme);
        onChange(elaborateTheme);
      } else {
        // Fallback if generation fails
        const fallbackPrompt = `A mystical deck themed around ${theme} concepts, featuring symbolic imagery that connects ancient wisdom with spiritual awakening.`;
        setValue(fallbackPrompt);
        onChange(fallbackPrompt);
      }
    } catch (error) {
      console.error('Error generating theme:', error);
      // Fallback
      const fallbackPrompt = `A mystical deck themed around ${theme} concepts, featuring symbolic imagery that connects ancient wisdom with spiritual awakening.`;
      setValue(fallbackPrompt);
      onChange(fallbackPrompt);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card/50 rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Sparkles className="text-accent h-5 w-5 mr-2" />
          <h3 className="font-medium">Prompt Enhancement</h3>
        </div>
        
        <button
          type="button"
          onClick={toggleHelp}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>
      
      {showHelp && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-muted/20 rounded-lg p-3"
        >
          <p className="text-sm mb-2">
            Enhance your image generation with specific guidance. Good prompts include:
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Color palette preferences</li>
            <li>Artistic style details</li>
            <li>Compositional elements</li>
            <li>Symbolic motifs to include</li>
            <li>Mood or atmosphere</li>
          </ul>
          
          <div className="mt-3">
            <p className="text-sm mb-2">Examples (click to use):</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => insertExample(example)}
                  className="text-xs bg-primary/20 hover:bg-primary/30 text-primary-foreground px-2 py-1 rounded-full transition-colors"
                >
                  {example.length > 30 ? example.substring(0, 30) + '...' : example}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-sm mb-2">Theme Inspirations (AI-enhanced):</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {themeInspirations.map((theme, index) => (
                <button
                  key={index}
                  onClick={() => applyThemeInspiration(theme)}
                  disabled={isGenerating}
                  className={`text-xs bg-accent/20 hover:bg-accent/30 text-accent-foreground px-2 py-1 rounded-full transition-colors flex items-center ${
                    isGenerating ? 'opacity-50 cursor-wait' : ''
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin mr-1"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      {theme}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      
      <textarea
        value={value}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder="Describe additional details for your card imagery. What mood, colors, or symbols would you like to include?"
        className={`w-full h-24 p-3 bg-background rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
          isGenerating ? 'opacity-70' : ''
        }`}
        disabled={disabled || isGenerating}
      />
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Use Ctrl+Enter to submit
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || isGenerating}
          className="btn btn-accent px-4 py-1.5 text-sm flex items-center"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Apply Prompt
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PromptEditor;