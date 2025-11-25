import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Collapsible section component for panel sidebars
 * Uses BarkBase design tokens for consistent theming.
 *
 * Features:
 * - Collapsible with animated chevron
 * - localStorage persistence (optional)
 * - Divider between sections
 * - Hover states
 *
 * @example
 * <PanelSection title="Filters" collapsible defaultOpen>
 *   <FilterContent />
 * </PanelSection>
 */
export function PanelSection({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  storageKey,  // Optional: persist state to localStorage
  className,
  headerClassName,
  contentClassName,
  actions,  // Optional: action buttons in header
}) {
  // Load initial state from localStorage if storageKey provided
  const getInitialState = () => {
    if (!collapsible) return true;
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`panel-section-${storageKey}`);
      return stored !== null ? stored === 'true' : defaultOpen;
    }
    return defaultOpen;
  };

  const [isOpen, setIsOpen] = useState(getInitialState);

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);

    // Persist to localStorage if storageKey provided
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`panel-section-${storageKey}`, String(newState));
    }
  };

  return (
    <div
      className={cn(
        "border-b last:border-0",
        className
      )}
      style={{
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      {/* Section Header */}
      {title && (
        <div
          className={cn(
            "flex items-center justify-between px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]",
            collapsible && "cursor-pointer",
            headerClassName
          )}
          style={{
            ...(collapsible && {
              ':hover': {
                backgroundColor: 'var(--bb-color-bg-elevated)',
              }
            })
          }}
        >
          <button
            onClick={collapsible ? toggleOpen : undefined}
            disabled={!collapsible}
            className="flex items-center gap-[var(--bb-space-2,0.5rem)] flex-1 text-left group"
          >
            {collapsible && (
              <span style={{ color: 'var(--bb-color-text-muted)' }}>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
            )}
            <h3
              className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              {title}
            </h3>
          </button>

          {/* Optional action buttons */}
          {actions && (
            <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Section Content */}
      {(!collapsible || isOpen) && (
        <div
          className={cn(
            "px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-4,1rem)]",
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

PanelSection.displayName = 'PanelSection';
