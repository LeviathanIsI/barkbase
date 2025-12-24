import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';

/**
 * SlideoutPanel - Token-based slideout panel for edit/create flows
 * Slides in from the right with smooth animations
 * Supports back navigation for nested slideouts
 */
const SlideoutPanel = ({
  isOpen,
  onClose,
  onBack,
  backLabel,
  title,
  description,
  children,
  footer,
  widthClass = 'max-w-xl',
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

  const hasBackButton = Boolean(onBack && backLabel);

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

      {/* Panel */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative ml-auto flex h-full w-full transform flex-col',
          'bg-[var(--bb-color-bg-surface)] border-l border-[var(--bb-color-border-subtle)]',
          'shadow-[var(--bb-elevation-card)]',
          'transition-transform duration-300 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full',
          widthClass,
        )}
      >
        {/* Back Button (when nested) */}
        {hasBackButton && (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'flex items-center gap-1.5 px-[var(--bb-space-6)] py-[var(--bb-space-2)]',
              'text-[var(--bb-font-size-sm)] text-[var(--bb-color-accent)]',
              'hover:text-[var(--bb-color-accent-hover)] hover:bg-[var(--bb-color-bg-elevated)]',
              'transition-colors border-b border-[var(--bb-color-border-subtle)]'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {backLabel}</span>
          </button>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-[var(--bb-space-4)] border-b border-[var(--bb-color-border-subtle)] px-[var(--bb-space-6)] py-[var(--bb-space-4)]">
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-[var(--bb-space-1)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                {description}
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
        <div className="flex-1 overflow-y-auto px-[var(--bb-space-6)] py-[var(--bb-space-6)]">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="flex items-center justify-end gap-[var(--bb-space-3)] border-t border-[var(--bb-color-border-subtle)] px-[var(--bb-space-6)] py-[var(--bb-space-4)] bg-[var(--bb-color-bg-surface)]">
            {footer}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
};

export default SlideoutPanel;
