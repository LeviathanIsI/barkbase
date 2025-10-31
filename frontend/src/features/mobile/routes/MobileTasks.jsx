import { useEffect } from 'react';
import MobileTaskView from '../components/MobileTaskView';

const MobileTasks = () => {
  // Mobile-specific optimizations
  useEffect(() => {
    // Add mobile viewport class
    document.body.classList.add('mobile-view');
    
    // Prevent overscroll bounce on iOS
    document.body.style.overscrollBehavior = 'none';
    
    return () => {
      document.body.classList.remove('mobile-view');
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  return <MobileTaskView />;
};

export default MobileTasks;


