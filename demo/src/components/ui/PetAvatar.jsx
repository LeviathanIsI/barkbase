import React from 'react';
import { cn } from '@/lib/cn';

/**
 * PetAvatar Component
 * Displays pet photo or initials placeholder
 * Used across all list views for consistent visual identification
 */
const PetAvatar = ({
  pet,
  size = 'md',
  className,
  showBorder = true,
  showStatus = false
}) => {
  // Size mappings
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  // Get pet photo URL
  const photoUrl = pet?.photoUrl || pet?.photo || pet?.imageUrl;

  // Get pet initials
  const getInitials = () => {
    const name = pet?.name || pet?.petName || 'P';
    const words = name.split(' ');
    if (words.length > 1) {
      return words[0][0] + words[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get background color based on pet name (for consistent colors)
  const getBackgroundColor = () => {
    const name = pet?.name || pet?.petName || '';
    const colors = [
      'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      'bg-success-100 dark:bg-success-600/10 text-success-700 dark:text-success-300',
      'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
      'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
      'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
      'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
      'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300',
      'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const baseClasses = cn(
    'rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
    sizeClasses[size],
    showBorder && 'ring-2 ring-white dark:ring-surface-primary shadow-sm',
    className
  );

  return (
    <div className="relative">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={pet?.name || 'Pet'}
          className={cn(baseClasses, 'object-cover')}
          onError={(e) => {
            // Fallback to initials if image fails to load
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}

      <div
        className={cn(
          baseClasses,
          getBackgroundColor(),
          'font-semibold',
          photoUrl ? 'hidden' : 'flex'
        )}
        style={photoUrl ? { display: 'none' } : {}}
      >
        {getInitials()}
      </div>

      {/* Status indicator */}
      {showStatus && pet?.status && (
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-surface-primary',
          pet.status === 'active' && 'bg-green-500',
          pet.status === 'checked-in' && 'bg-blue-500',
          pet.status === 'inactive' && 'bg-gray-400',
          pet.status === 'medical' && 'bg-red-500'
        )} />
      )}

      {/* Medical alert indicator */}
      {pet?.hasMedicalAlerts && (
        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">!</span>
        </div>
      )}
    </div>
  );
};

export default PetAvatar;