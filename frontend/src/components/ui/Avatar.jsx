/**
 * Avatar - Unified avatar component system
 *
 * Features:
 * - Deterministic color assignment based on name hash
 * - Consistent sizing: xs (24px), sm (32px), md (40px), lg (48px), xl (56px), 2xl (72px)
 * - Shape variants: round (people), rounded (pets)
 * - Species differentiation for pets (subtle icon overlay)
 * - Hover/interactive states for clickable avatars
 * - Graceful fallback when images fail
 * - Optional upload functionality
 * - Status indicators and badges
 */

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { User, Camera, Loader2, Dog, Cat } from 'lucide-react';

/**
 * Curated color palette - 12 harmonious colors with good dark mode contrast
 * Each color has bg, text for light mode and dark mode variants
 */
const AVATAR_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/60', text: 'text-blue-700 dark:text-blue-200', ring: 'ring-blue-200 dark:ring-blue-700/50' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/60', text: 'text-emerald-700 dark:text-emerald-200', ring: 'ring-emerald-200 dark:ring-emerald-700/50' },
  { bg: 'bg-violet-100 dark:bg-violet-900/60', text: 'text-violet-700 dark:text-violet-200', ring: 'ring-violet-200 dark:ring-violet-700/50' },
  { bg: 'bg-amber-100 dark:bg-amber-900/60', text: 'text-amber-700 dark:text-amber-200', ring: 'ring-amber-200 dark:ring-amber-700/50' },
  { bg: 'bg-rose-100 dark:bg-rose-900/60', text: 'text-rose-700 dark:text-rose-200', ring: 'ring-rose-200 dark:ring-rose-700/50' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/60', text: 'text-cyan-700 dark:text-cyan-200', ring: 'ring-cyan-200 dark:ring-cyan-700/50' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/60', text: 'text-fuchsia-700 dark:text-fuchsia-200', ring: 'ring-fuchsia-200 dark:ring-fuchsia-700/50' },
  { bg: 'bg-teal-100 dark:bg-teal-900/60', text: 'text-teal-700 dark:text-teal-200', ring: 'ring-teal-200 dark:ring-teal-700/50' },
  { bg: 'bg-orange-100 dark:bg-orange-900/60', text: 'text-orange-700 dark:text-orange-200', ring: 'ring-orange-200 dark:ring-orange-700/50' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/60', text: 'text-indigo-700 dark:text-indigo-200', ring: 'ring-indigo-200 dark:ring-indigo-700/50' },
  { bg: 'bg-lime-100 dark:bg-lime-900/60', text: 'text-lime-700 dark:text-lime-200', ring: 'ring-lime-200 dark:ring-lime-700/50' },
  { bg: 'bg-sky-100 dark:bg-sky-900/60', text: 'text-sky-700 dark:text-sky-200', ring: 'ring-sky-200 dark:ring-sky-700/50' },
];

/**
 * Generate a deterministic color index from a string
 * Same input always produces same color
 */
const getColorIndex = (str) => {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
};

/**
 * Get initials from a name string
 * - For single word: first 2 characters
 * - For multiple words: first char of first 2 words
 */
const getInitials = (name, maxChars = 2) => {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].substring(0, maxChars).toUpperCase();
  }
  return words.slice(0, maxChars).map(w => w[0]).join('').toUpperCase();
};

/**
 * Size configurations
 */
const SIZES = {
  xs: {
    container: 'h-6 w-6',
    text: 'text-[10px]',
    icon: 'h-3 w-3',
    speciesIcon: 'h-2 w-2',
    speciesOffset: '-bottom-0 -right-0',
    statusDot: 'h-2 w-2',
    ring: 'ring-1',
  },
  sm: {
    container: 'h-8 w-8',
    text: 'text-xs',
    icon: 'h-4 w-4',
    speciesIcon: 'h-2.5 w-2.5',
    speciesOffset: '-bottom-0.5 -right-0.5',
    statusDot: 'h-2.5 w-2.5',
    ring: 'ring-[1.5px]',
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-sm',
    icon: 'h-5 w-5',
    speciesIcon: 'h-3 w-3',
    speciesOffset: '-bottom-0.5 -right-0.5',
    statusDot: 'h-3 w-3',
    ring: 'ring-2',
  },
  lg: {
    container: 'h-12 w-12',
    text: 'text-base',
    icon: 'h-6 w-6',
    speciesIcon: 'h-3.5 w-3.5',
    speciesOffset: '-bottom-0.5 -right-0.5',
    statusDot: 'h-3.5 w-3.5',
    ring: 'ring-2',
  },
  xl: {
    container: 'h-14 w-14',
    text: 'text-lg',
    icon: 'h-7 w-7',
    speciesIcon: 'h-4 w-4',
    speciesOffset: '-bottom-1 -right-1',
    statusDot: 'h-4 w-4',
    ring: 'ring-2',
  },
  '2xl': {
    container: 'h-[72px] w-[72px]',
    text: 'text-xl',
    icon: 'h-8 w-8',
    speciesIcon: 'h-5 w-5',
    speciesOffset: '-bottom-1 -right-1',
    statusDot: 'h-5 w-5',
    ring: 'ring-[3px]',
  },
};

/**
 * Shape configurations
 */
const SHAPES = {
  round: 'rounded-full',
  rounded: 'rounded-xl',
  square: 'rounded-lg',
};

/**
 * Avatar Component
 */
const Avatar = React.forwardRef(({
  // Display props
  name,
  src,
  alt,
  fallback,

  // Appearance
  size = 'md',
  shape = 'round',
  colorSeed, // Override name for color generation
  showRing = false,

  // Pet-specific
  species, // 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  showSpecies = false,

  // Status
  status, // 'active' | 'inactive' | 'away' | 'busy'
  showStatus = false,
  badge,

  // Interaction
  onClick,
  interactive = false,

  // Upload functionality
  uploadable = false,
  onUpload,
  isUploading = false,

  className,
  ...props
}, ref) => {
  const fileInputRef = useRef(null);
  const [imageError, setImageError] = useState(false);

  // Reset image error when src changes
  useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeConfig = SIZES[size] || SIZES.md;
  const shapeClass = SHAPES[shape] || SHAPES.round;
  const colorIndex = getColorIndex(colorSeed || name);
  const colors = AVATAR_COLORS[colorIndex];
  const initials = getInitials(name, shape === 'round' ? 1 : 2);
  const isClickable = onClick || uploadable || interactive;

  const handleClick = (e) => {
    if (uploadable && fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
    onClick?.(e);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const SpeciesIcon = species?.toLowerCase() === 'cat' ? Cat : Dog;
  const showSpeciesIndicator = showSpecies && species && ['dog', 'cat'].includes(species?.toLowerCase());

  // Status dot colors
  const statusColors = {
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
    'checked-in': 'bg-blue-500',
    medical: 'bg-red-500',
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      {/* Main avatar container */}
      <div
        onClick={isClickable ? handleClick : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => e.key === 'Enter' && handleClick?.(e) : undefined}
        className={cn(
          // Base styles
          'relative flex shrink-0 items-center justify-center overflow-hidden',
          sizeConfig.container,
          shapeClass,
          // Ring/border for definition
          showRing && [sizeConfig.ring, 'ring-white dark:ring-slate-800'],
          // Shadow for depth
          'shadow-sm',
          // Interactive states
          isClickable && [
            'cursor-pointer transition-all duration-200',
            'hover:scale-105 hover:shadow-md',
            'active:scale-100',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--bb-color-accent)] dark:focus:ring-offset-slate-900',
          ],
          // Uploadable group hover
          uploadable && !isUploading && 'group',
          className
        )}
        {...props}
      >
        {/* Image */}
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Fallback - initials or icon */
          <div
            className={cn(
              'flex h-full w-full items-center justify-center font-semibold',
              colors.bg,
              colors.text,
              sizeConfig.text
            )}
          >
            {fallback !== undefined ? (
              typeof fallback === 'string' ? fallback : fallback
            ) : name ? (
              initials
            ) : (
              <User className={sizeConfig.icon} />
            )}
          </div>
        )}

        {/* Upload overlay */}
        {uploadable && !isUploading && (
          <div className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
            shapeClass
          )}>
            <Camera className="h-1/3 w-1/3 text-white" />
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/50',
            shapeClass
          )}>
            <Loader2 className="h-1/3 w-1/3 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Species indicator (for pets) */}
      {showSpeciesIndicator && (
        <div
          className={cn(
            'absolute flex items-center justify-center rounded-full',
            'bg-white dark:bg-slate-800 shadow-sm',
            'border border-slate-200 dark:border-slate-600',
            sizeConfig.speciesOffset,
            // Size based on avatar size
            size === 'xs' ? 'p-0.5' : size === 'sm' ? 'p-0.5' : 'p-1'
          )}
        >
          <SpeciesIcon
            className={cn(
              sizeConfig.speciesIcon,
              species?.toLowerCase() === 'cat'
                ? 'text-violet-500 dark:text-violet-400'
                : 'text-amber-600 dark:text-amber-400'
            )}
          />
        </div>
      )}

      {/* Status dot */}
      {showStatus && status && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full',
            'border-2 border-white dark:border-slate-800',
            sizeConfig.statusDot,
            statusColors[status] || statusColors.inactive
          )}
        />
      )}

      {/* Custom badge */}
      {badge && (
        <div className={cn(
          'absolute -top-1 -right-1',
          'flex items-center justify-center',
          'min-w-[18px] h-[18px] px-1',
          'rounded-full text-[10px] font-bold',
          'bg-red-500 text-white',
          'border-2 border-white dark:border-slate-800',
          'shadow-sm'
        )}>
          {badge}
        </div>
      )}

      {/* Hidden file input */}
      {uploadable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

/**
 * AvatarGroup - Display multiple avatars stacked
 */
export const AvatarGroup = ({
  children,
  max = 4,
  size = 'md',
  className,
  ...props
}) => {
  const childArray = React.Children.toArray(children);
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;
  const sizeConfig = SIZES[size] || SIZES.md;
  const colors = AVATAR_COLORS[0];

  return (
    <div
      className={cn('flex items-center -space-x-2', className)}
      {...props}
    >
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className="relative"
          style={{ zIndex: visibleChildren.length - index }}
        >
          {React.cloneElement(child, {
            size,
            showRing: true,
            className: cn(child.props.className),
          })}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center rounded-full',
            'ring-2 ring-white dark:ring-slate-800',
            'shadow-sm',
            sizeConfig.container,
            colors.bg,
            colors.text,
            sizeConfig.text,
            'font-semibold'
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

AvatarGroup.displayName = 'AvatarGroup';

export default Avatar;
export { getColorIndex, getInitials, AVATAR_COLORS, SIZES as AVATAR_SIZES };
