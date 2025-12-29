import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTimezoneUtils } from '@/lib/timezone';
import { on, off } from '@/lib/socket';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * ConflictDetection Component
 * Detects and resolves multi-user conflicts
 * Phase 3: Real-time features
 */
const ConflictDetection = () => {
  const tz = useTimezoneUtils();
  const [conflicts, setConflicts] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for conflict events from WebSocket
    const handleConflict = (conflictData) => {
      const {
        id,
        type,
        resourceType,
        resourceId,
        message,
        currentUser,
        conflictingUser,
        timestamp,
      } = conflictData;

      setConflicts((prev) => [
        ...prev,
        {
          id: id || `conflict-${Date.now()}`,
          type,
          resourceType,
          resourceId,
          message,
          currentUser,
          conflictingUser,
          timestamp: timestamp || new Date().toISOString(),
        },
      ]);
    };

    // Subscribe to conflict events
    const unsubscribe = on('conflict', handleConflict);

    // Also listen for specific resource updates
    const unsubscribeBooking = on('booking:update', (data) => {
      // Check if we have this resource open/being edited
      // This would require tracking which resources are currently being edited
      // For now, we'll just invalidate the cache
      queryClient.invalidateQueries(['bookings']);
    });

    const unsubscribePet = on('pet:update', () => {
      queryClient.invalidateQueries(['pets']);
    });

    const unsubscribeOwner = on('owner:update', () => {
      queryClient.invalidateQueries(['owners']);
    });

    return () => {
      unsubscribe();
      unsubscribeBooking();
      unsubscribePet();
      unsubscribeOwner();
    };
  }, [queryClient]);

  const handleResolve = (conflictId, action) => {
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));

    if (action === 'refresh') {
      // Refresh the page to get latest data
      window.location.reload();
    } else if (action === 'dismiss') {
      // Just dismiss the conflict warning
      // User takes responsibility for potential data loss
    }
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <>
      {conflicts.map((conflict) => (
        <div
          key={conflict.id}
          className="fixed bottom-20 right-4 z-50 w-96 bg-white dark:bg-surface-primary border-2 border-orange-500 dark:border-orange-400 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="bg-orange-500 dark:bg-orange-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Edit Conflict Detected</h3>
            </div>
            <button
              onClick={() => handleResolve(conflict.id, 'dismiss')}
              className="text-white hover:bg-white/20 rounded p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            <div className="text-sm text-gray-700 dark:text-text-secondary">
              <p className="mb-2">
                {conflict.message ||
                  `Another user (${conflict.conflictingUser?.name || 'Unknown'}) is currently editing this ${conflict.resourceType}.`}
              </p>
              <p className="text-xs text-gray-500 dark:text-text-tertiary">
                To avoid data loss, please refresh to see the latest changes or
                dismiss if you want to continue editing.
              </p>
            </div>

            {/* Conflict Details */}
            {conflict.conflictingUser && (
              <div className="bg-gray-50 dark:bg-surface-secondary rounded p-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 dark:text-text-tertiary">
                      Other User:
                    </span>
                    <p className="font-medium text-gray-900 dark:text-text-primary">
                      {conflict.conflictingUser.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-text-tertiary">
                      Time:
                    </span>
                    <p className="font-medium text-gray-900 dark:text-text-primary">
                      {tz.formatTime(conflict.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleResolve(conflict.id, 'refresh')}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh & Load Latest
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve(conflict.id, 'dismiss')}
                className="flex-1"
              >
                Dismiss & Continue
              </Button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default ConflictDetection;
