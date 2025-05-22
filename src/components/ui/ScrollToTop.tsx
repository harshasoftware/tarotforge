import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollToTopProps {
  forceScroll?: boolean;
}

export default function ScrollToTop({ forceScroll = false }: ScrollToTopProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  // Force scroll to top when component mounts if forceScroll is true
  useEffect(() => {
    if (forceScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [forceScroll]);

  return null;
}