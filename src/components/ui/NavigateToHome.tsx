import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigateToHomeProps {
  children: ReactNode;
  className?: string;
}

/**
 * A component that handles navigation to the home page
 * If already on the home page, it will scroll to the top
 * If on another page, it will navigate to the home page
 */
const NavigateToHome = ({ children, className = '' }: NavigateToHomeProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If already on home page, just scroll to top
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Navigate to home page
      navigate('/');
    }
  };

  return (
    <a href="/" onClick={handleClick} className={className}>
      {children}
    </a>
  );
};

export default NavigateToHome;