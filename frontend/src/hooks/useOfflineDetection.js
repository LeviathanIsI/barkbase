import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui';
import toast from 'react-hot-toast';
import { flushQueue } from '@/lib/offlineQueue';

export const useOfflineDetection = () => {
  const setOffline = useUIStore((state) => state.setOffline);

  useEffect(() => {
    const evaluate = () => {
      const offline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      setOffline(offline);
      if (offline) {
        toast.error('You are offline. Changes will sync when connection returns.', { recordId: 'offline-warning',
        });
      } else {
        toast.success('Connection restored. Synchronizing...', { recordId: 'offline-warning',
        });
      }
    };

    evaluate();

    const handleOnline = () => {
      setOffline(false);
      toast.success('Back online. Sync in progress...', { recordId: 'offline-warning' });
      flushQueue();
    };

    const handleOffline = () => {
      setOffline(true);
      toast.error('Offline mode activated.', { recordId: 'offline-warning' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);
};
