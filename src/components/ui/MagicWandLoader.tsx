import { memo } from 'react';
import Lottie from 'lottie-react';
import magicWandAnimationData from '../../../public/magicwandbotanimation.json';

interface MagicWandLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-32 h-32',
  lg: 'w-48 h-48',
  xl: 'w-64 h-64',
};

const MagicWandLoader = memo(({ size = 'md', className = '' }: MagicWandLoaderProps) => {
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <Lottie
        animationData={magicWandAnimationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

MagicWandLoader.displayName = 'MagicWandLoader';

export default MagicWandLoader; 