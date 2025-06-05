import React from 'react';

interface SortButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const SortButton: React.FC<SortButtonProps> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between w-full px-3 py-1.5 rounded text-xs transition-colors ${
      active ? 'bg-accent/20 text-accent-foreground' : 'bg-muted/30 hover:bg-muted/50'
    }`}
  >
    {children}
  </button>
);

export default SortButton; 