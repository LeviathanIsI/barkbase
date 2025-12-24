/**
 * InspectorRoot - Base container for view-only detail panels
 * Uses SlideoutPanel internally but provides inspector-specific styling
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';

// Variant accent colors for visual distinction
const variantAccents = {
  default: '',
  info: 'border-l-4 border-l-[var(--bb-color-status-info)]',
  booking: 'border-l-4 border-l-[var(--bb-color-accent)]',
  pet: 'border-l-4 border-l-[var(--bb-color-status-positive)]',
  owner: 'border-l-4 border-l-[var(--bb-color-status-info)]',
  finance: 'border-l-4 border-l-[var(--bb-color-status-warning)]',
};

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const InspectorRoot = ({
  isOpen,
  onClose,
  title,
  subtitle,
  variant = 'default',
  size = 'lg',
  children,
  className,
}) => {
  const TRANSITION_MS = 300;
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    } else if (isMounted) {
      setIsVisible(false);
      closeTimeoutRef.current = setTimeout(() => {
        setIsMounted(false);
        closeTimeoutRef.current = null;
      }, TRANSITION_MS);
    }

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [isOpen, isMounted]);

  useEffect(() => {
    if (!isMounted) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMounted, onClose]);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex">
      {/* Backdrop */}
      <div
        className={cn(
          'flex-1 bg-[var(--bb-color-overlay-scrim)] backdrop-blur-sm transition-opacity duration-300 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Inspector Panel */}
      <aside
        role="complementary"
        aria-label={title || 'Details panel'}
        className={cn(
          'relative ml-auto flex h-full w-full transform flex-col',
          'bg-[var(--bb-color-bg-surface)]',
          'border-l border-[var(--bb-color-border-subtle)]',
          'shadow-[var(--bb-elevation-card)]',
          'transition-transform duration-300 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full',
          sizeClasses[size] || sizeClasses.lg,
          variantAccents[variant] || variantAccents.default,
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-[var(--bb-space-4)] border-b border-[var(--bb-color-border-subtle)] px-[var(--bb-space-6)] py-[var(--bb-space-5)]">
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] leading-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-[var(--bb-space-1)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close panel"
            onClick={onClose}
            className="flex-shrink-0 text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default InspectorRoot;

