import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Collapsible section component for panel sidebars
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
    <div className={cn(
      "border-b border-gray-200 dark:border-[var(--border-light)] last:border-0",
      className
    )}>
      {/* Section Header */}
      {title && (
        <div className={cn(
          "flex items-center justify-between px-6 py-4",
          collapsible && "cursor-pointer hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)]",
          headerClassName
        )}>
          <button
            onClick={collapsible ? toggleOpen : undefined}
            disabled={!collapsible}
            className="flex items-center gap-2 flex-1 text-left group"
          >
            {collapsible && (
              <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
            )}
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
          </button>

          {/* Optional action buttons */}
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Section Content */}
      {(!collapsible || isOpen) && (
        <div className={cn(
          "px-6 py-4",
          contentClassName
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

PanelSection.displayName = 'PanelSection';
