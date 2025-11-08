import { Home, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * KennelMapCard - Visual representation of a kennel with availability badge
 * Shows as a positioned box on the facility map with a floating availability indicator
 */
const KennelMapCard = ({ kennel, onClick }) => {
  if (!kennel) return null;
  
  const capacity = kennel.capacity || 0;
  const occupied = kennel.occupied || 0;
  const occupancyRate = capacity > 0 ? (occupied / capacity) * 100 : 0;
  
  const getOccupancyColor = (rate) => {
    if (rate >= 100) return 'bg-gray-400 dark:bg-surface-secondary border-gray-500 dark:border-surface-border';
    if (rate >= 95) return 'bg-red-50 dark:bg-surface-primary border-red-600 dark:border-red-700';
    if (rate >= 80) return 'bg-orange-500 dark:bg-surface-primary border-orange-600 dark:border-orange-700';
    if (rate >= 50) return 'bg-yellow-50 dark:bg-surface-primary border-yellow-600 dark:border-yellow-700';
    return 'bg-green-50 dark:bg-surface-primary border-green-600 dark:border-green-700';
  };

  const getBadgeColor = (rate) => {
    if (rate >= 100) return 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary border-gray-300 dark:border-surface-border';
    if (rate >= 95) return 'bg-red-100 dark:bg-surface-secondary text-red-700 dark:text-red-200 border-red-300 dark:border-red-700';
    if (rate >= 80) return 'bg-orange-100 dark:bg-surface-secondary text-orange-700 dark:text-orange-200 border-orange-300 dark:border-orange-700';
    if (rate >= 50) return 'bg-yellow-100 dark:bg-surface-secondary text-yellow-700 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700';
    return 'bg-green-100 dark:bg-surface-secondary text-green-700 dark:text-green-200 border-green-300 dark:border-green-700';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'suite': return '🏨';
      case 'kennel': return '🏠';
      case 'daycare': return '🎮';
      default: return '📦';
    }
  };

  const available = capacity - occupied;

  return (
    <div
      className={cn(
        'relative cursor-pointer transition-all hover:scale-105 hover:shadow-lg',
        'w-32 h-32 rounded-lg border-2 flex flex-col items-center justify-center p-2',
        'bg-white dark:bg-surface-primary shadow-md',
        occupied === 0 && 'border-green-300 dark:border-green-700',
        occupied > 0 && occupied < capacity && 'border-blue-300 dark:border-blue-700',
        occupied >= capacity && 'border-gray-400 dark:border-surface-border'
      )}
      onClick={() => onClick?.(kennel)}
    >
      {/* Availability Pin Badge - floats above */}
      <div
        className={cn(
          'absolute -top-3 left-1/2 transform -translate-x-1/2',
          'px-3 py-1 rounded-full border-2 shadow-lg font-bold text-xs whitespace-nowrap',
          getBadgeColor(occupancyRate)
        )}
      >
        {occupied}/{capacity}
      </div>

      {/* Type Icon */}
      <div className="text-3xl mb-1">{getTypeIcon(kennel.type)}</div>

      {/* Kennel Name */}
      <div className="text-xs font-semibold text-center text-gray-900 dark:text-text-primary mb-1">
        {kennel.name}
      </div>

      {/* Availability Status */}
      <div className="text-xs text-gray-600 dark:text-text-secondary flex items-center gap-1">
        {available > 0 ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400"></span>
            {available} open
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"></span>
            Full
          </>
        )}
      </div>

      {/* Capacity Bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-surface-border rounded-full mt-2">
        <div
          className={cn('h-full rounded-full transition-all', getOccupancyColor(occupancyRate))}
          style={{ width: `${occupancyRate}%` }}
        />
      </div>
    </div>
  );
};

export default KennelMapCard;

