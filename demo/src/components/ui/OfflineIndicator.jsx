import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, AlertCircle } from 'lucide-react';
import { getQueueCount } from '@/lib/offlineQueue';
import { cn } from '@/lib/cn';

/**
 * OfflineIndicator Component
 * Shows connection status and queued operations count
 * Phase 3: Offline capability
 */
const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('sync-operations');
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check queue count periodically
    const checkQueue = async () => {
      try {
        const count = await getQueueCount();
        setQueueCount(count);
      } catch (error) {
        console.error('Failed to get queue count:', error);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Don't show if online with no queued operations
  if (isOnline && queueCount === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile indicator - bottom of screen */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            'w-full px-[var(--bb-space-4)] py-[var(--bb-space-2)] flex items-center justify-between text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] transition-colors',
            isOnline
              ? 'bg-[var(--bb-color-status-info)] text-white'
              : 'bg-[var(--bb-color-status-negative)] text-white'
          )}
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="w-4 h-4" />
            ) : (
              <CloudOff className="w-4 h-4" />
            )}
            <span>
              {isOnline
                ? queueCount > 0
                  ? `Syncing ${queueCount} operations...`
                  : 'Online'
                : 'Working Offline'}
            </span>
          </div>
          {queueCount > 0 && (
            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
              {queueCount}
            </span>
          )}
        </button>

        {showDetails && queueCount > 0 && (
          <div className="bg-white dark:bg-surface-primary border-t border-gray-200 dark:border-surface-border p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--bb-color-status-warning)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-gray-900 dark:text-text-primary mb-1">
                  {queueCount} {queueCount === 1 ? 'operation' : 'operations'} queued
                </p>
                <p className="text-gray-600 dark:text-text-secondary">
                  {isOnline
                    ? 'These will sync automatically when the connection is stable.'
                    : 'These will sync when you\'re back online.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop indicator - top right corner */}
      <div className="hidden lg:block fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            'flex items-center gap-[var(--bb-space-2)] px-[var(--bb-space-3)] py-[var(--bb-space-2)] rounded-lg shadow-[var(--bb-elevation-card)] text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] transition-all',
            isOnline
              ? 'bg-[var(--bb-color-status-info)] hover:opacity-90 text-white'
              : 'bg-[var(--bb-color-status-negative)] hover:opacity-90 text-white'
          )}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {queueCount > 0 && (
            <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-semibold">
              {queueCount}
            </span>
          )}
        </button>

        {showDetails && queueCount > 0 && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-surface-primary rounded-lg shadow-xl border border-gray-200 dark:border-surface-border p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--bb-color-status-warning)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-text-primary mb-1">
                  {queueCount} Queued {queueCount === 1 ? 'Operation' : 'Operations'}
                </p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">
                  {isOnline
                    ? 'Syncing with server...'
                    : 'Will sync when connection is restored.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OfflineIndicator;
