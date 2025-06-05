import React from 'react';
import { X } from 'lucide-react'; // Import X icon for reset button

const levelsData = [
  {
    name: 'Arcane Hierophant',
    color: 'bg-purple-500',
    dotSize: 'w-4.5 h-4.5', // Largest dot
    description: 'Supreme mastery and enlightenment'
  },
  {
    name: 'Celestial Oracle',
    color: 'bg-green-500',
    dotSize: 'w-4 h-4',
    description: 'Profound wisdom and esoteric knowledge'
  },
  {
    name: 'Ethereal Guide',
    color: 'bg-yellow-500',
    dotSize: 'w-3.5 h-3.5',
    description: 'Advanced understanding of interpretations'
  },
  {
    name: 'Mystic Adept',
    color: 'bg-orange-500',
    dotSize: 'w-3 h-3',
    description: 'Developing deeper insight and intuition'
  },
  {
    name: 'Novice Seer',
    color: 'bg-red-500',
    dotSize: 'w-2.5 h-2.5', // Smallest dot
    description: 'Foundational knowledge of tarot'
  }
];

interface ReaderLevelsLegendProps {
  selectedLevelName: string | null;
  onLevelSelect: (levelName: string) => void;
  onResetFilter: () => void;
}

const ReaderLevelsLegend: React.FC<ReaderLevelsLegendProps> = ({ 
  selectedLevelName,
  onLevelSelect,
  onResetFilter 
}) => {
  return (
    <div className="bg-card/50 border border-border rounded-lg p-4 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Filter by Level</h3>
        {selectedLevelName && (
          <button 
            onClick={onResetFilter}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted/50"
            aria-label="Reset level filter"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {levelsData.map((level) => {
          const isSelected = selectedLevelName === level.name;
          return (
            <button
              key={level.name}
              onClick={() => onLevelSelect(level.name)}
              className={`flex items-center w-full text-left p-1.5 rounded-md transition-all duration-150 ease-in-out group
                ${isSelected 
                  ? 'bg-primary/20 ring-2 ring-primary/70 shadow-md' 
                  : 'hover:bg-muted/40'
                }`}
            >
              <div className={`rounded-full mr-2.5 flex-shrink-0 ${level.color} ${level.dotSize} group-hover:scale-110 transition-transform`}></div>
              <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                {level.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Readers progress through levels by expertise, ratings, and completing readings. Higher levels indicate greater experience.
      </p>
    </div>
  );
};

export default ReaderLevelsLegend; 