import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

interface ReadingShareButtonProps {
  getShareableLink: () => string;
  className?: string;
}

const ReadingShareButton: React.FC<ReadingShareButtonProps> = ({ 
  getShareableLink,
  className = ''
}) => {
  const [showCopied, setShowCopied] = useState(false);
  
  const copyLink = () => {
    const link = getShareableLink();
    navigator.clipboard.writeText(link);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };
  
  return (
    <button 
      onClick={copyLink}
      className={`btn btn-secondary flex items-center ${className}`}
    >
      {showCopied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="mr-2 h-4 w-4" />
          Share Reading
        </>
      )}
    </button>
  );
};

export default ReadingShareButton;