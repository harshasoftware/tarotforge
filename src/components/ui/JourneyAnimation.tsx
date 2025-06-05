import { memo } from 'react';
import Lottie from 'lottie-react';

interface JourneyAnimationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16', // Adjusted for potentially different aspect ratio or desired display
  md: 'w-32 h-32',
  lg: 'w-48 h-48',
  xl: 'w-64 h-64',
};

// Cast Lottie to any to bypass strict type checking for props if issues persist
const LottieAny = Lottie as any;

const JourneyAnimation = memo(({ size = 'md', className = '' }: JourneyAnimationProps) => {
  // The path to the animation JSON file in the public folder
  const animationPath = '/journey.json';

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <LottieAny
        path={animationPath}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

JourneyAnimation.displayName = 'JourneyAnimation';

export default JourneyAnimation; 