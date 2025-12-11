/**
 * TourHelpButton Component
 *
 * A help button that triggers product tours on any page.
 * Supports multiple display variants and integrates with the tour system.
 */

import { forwardRef, useState } from 'react';
import { HelpCircle, PlayCircle, Sparkles } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { useTour, useTourTrigger } from '@/contexts/TourContext';

// ============================================================================
// BUTTON VARIANTS
// ============================================================================

const tourHelpButtonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-200',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-[var(--bb-color-accent)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        // Icon-only floating button (for corner placement)
        floating: [
          'fixed z-50',
          'w-12 h-12 rounded-full',
          'bg-[var(--bb-color-accent)] text-[var(--bb-color-text-on-accent)]',
          'shadow-lg hover:shadow-xl',
          'hover:scale-105 active:scale-95',
        ],
        // Icon button (inline)
        icon: [
          'w-9 h-9 rounded-lg',
          'bg-transparent text-[var(--bb-color-text-muted)]',
          'hover:bg-[var(--bb-color-bg-elevated)]',
          'hover:text-[var(--bb-color-text-primary)]',
        ],
        // Ghost text button
        ghost: [
          'px-4 py-2 rounded-full text-sm font-semibold',
          'border-2 border-[#a78bfa] text-[#a78bfa]',
          'bg-transparent',
          'shadow-[0_0_15px_rgba(139,92,246,0.4)]',
          'hover:bg-[#a78bfa]/10',
        ],
        // Outlined button
        outline: [
          'px-4 py-2 rounded-lg text-sm',
          'border border-[var(--bb-color-border-subtle)]',
          'bg-transparent text-[var(--bb-color-text-primary)]',
          'hover:bg-[var(--bb-color-bg-elevated)]',
          'hover:border-[var(--bb-color-border-strong)]',
        ],
        // Primary button
        primary: [
          'px-4 py-2 rounded-lg text-sm',
          'bg-[var(--bb-color-accent)] text-[var(--bb-color-text-on-accent)]',
          'hover:brightness-110',
        ],
        // Subtle with accent color
        subtle: [
          'px-3 py-2 rounded-lg text-sm',
          'bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]',
          'hover:bg-[var(--bb-color-accent)]',
          'hover:text-[var(--bb-color-text-on-accent)]',
        ],
      },
      position: {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'top-right': 'top-20 right-6',
        'top-left': 'top-20 left-6',
        inline: '',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    compoundVariants: [
      // Icon variant sizes
      { variant: 'icon', size: 'sm', class: 'w-7 h-7' },
      { variant: 'icon', size: 'md', class: 'w-9 h-9' },
      { variant: 'icon', size: 'lg', class: 'w-11 h-11' },
      // Floating variant sizes
      { variant: 'floating', size: 'sm', class: 'w-10 h-10' },
      { variant: 'floating', size: 'md', class: 'w-12 h-12' },
      { variant: 'floating', size: 'lg', class: 'w-14 h-14' },
    ],
    defaultVariants: {
      variant: 'icon',
      position: 'inline',
      size: 'md',
    },
  }
);

// ============================================================================
// ICON MAPPING
// ============================================================================

const iconMap = {
  help: HelpCircle,
  play: PlayCircle,
  sparkles: Sparkles,
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TourHelpButton - Trigger product tours from any page
 *
 * @param {Object} props
 * @param {Object} props.tourConfig - Tour configuration object with id, steps, etc.
 * @param {string} props.variant - Button style variant
 * @param {string} props.position - Position for floating variant
 * @param {string} props.size - Button size
 * @param {string} props.icon - Icon type: 'help', 'play', 'sparkles'
 * @param {string} props.label - Optional text label
 * @param {string} props.tooltip - Tooltip text
 * @param {boolean} props.showPulse - Show attention-grabbing pulse animation
 * @param {string} props.className - Additional CSS classes
 */
const TourHelpButton = forwardRef(
  (
    {
      tourConfig,
      variant = 'icon',
      position = 'inline',
      size = 'md',
      icon = 'help',
      label,
      tooltip = 'Start page tour',
      showPulse = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const { isActive } = useTour();
    const startTour = useTourTrigger(tourConfig);

    const Icon = iconMap[icon] || HelpCircle;
    const isDisabled = disabled || isActive || !tourConfig;

    // Icon sizes based on button variant and size
    const getIconSize = () => {
      if (variant === 'floating') {
        return size === 'sm' ? 20 : size === 'lg' ? 28 : 24;
      }
      if (variant === 'icon') {
        return size === 'sm' ? 16 : size === 'lg' ? 22 : 18;
      }
      return 16;
    };

    const handleClick = (e) => {
      e.preventDefault();
      if (!isDisabled && tourConfig) {
        startTour();
      }
    };

    const buttonContent = (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          tourHelpButtonVariants({ variant, position, size }),
          showPulse && !isActive && 'animate-pulse',
          className
        )}
        aria-label={tooltip}
        {...props}
      >
        <Icon size={getIconSize()} />
        {label && <span>{label}</span>}

        {/* Pulse ring for floating variant */}
        {showPulse && variant === 'floating' && !isActive && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-[var(--bb-color-accent)]" />
        )}
      </button>
    );

    return buttonContent;
  }
);

TourHelpButton.displayName = 'TourHelpButton';

// ============================================================================
// PRESET COMPONENTS
// ============================================================================

/**
 * Floating help button for page corners
 */
export const FloatingTourButton = forwardRef((props, ref) => (
  <TourHelpButton
    ref={ref}
    variant="floating"
    position="bottom-right"
    icon="sparkles"
    showPulse
    {...props}
  />
));

FloatingTourButton.displayName = 'FloatingTourButton';

/**
 * Inline help button for headers/toolbars
 */
export const InlineTourButton = forwardRef((props, ref) => (
  <TourHelpButton
    ref={ref}
    variant="ghost"
    icon="play"
    label="Start Page Tour"
    {...props}
  />
));

InlineTourButton.displayName = 'InlineTourButton';

/**
 * Icon-only tour button
 */
export const TourIconButton = forwardRef((props, ref) => (
  <TourHelpButton
    ref={ref}
    variant="icon"
    icon="help"
    {...props}
  />
));

TourIconButton.displayName = 'TourIconButton';

// ============================================================================
// EXPORTS
// ============================================================================

export default TourHelpButton;
