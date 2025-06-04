import { memo } from 'react';
import Lottie from 'lottie-react';
import lostOracleAnimationData from '../../../public/404tune.json';

interface LostOracleAnimationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-24 h-24',
  md: 'w-48 h-48',
  lg: 'w-64 h-64',
  xl: 'w-96 h-96',
  '2xl': 'w-[500px] h-[500px]', // Example larger size
  '3xl': 'w-[600px] h-[600px]', // Example even larger size
};

const LostOracleAnimation = memo(({ size = 'xl', className = '' }: LostOracleAnimationProps) => {
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <Lottie
        animationData={lostOracleAnimationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

LostOracleAnimation.displayName = 'LostOracleAnimation';

export default LostOracleAnimation; 