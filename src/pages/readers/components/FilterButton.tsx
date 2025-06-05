import React from 'react';

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const FilterButton: React.FC<FilterButtonProps> = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-2 rounded-md text-sm transition-colors w-full text-left ${
      active ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/50'
    }`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4 mr-2 flex-shrink-0' })}
    {children}
  </button>
);

export default FilterButton; 