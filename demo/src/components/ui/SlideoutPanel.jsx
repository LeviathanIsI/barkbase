/**
 * SlideoutPanel Component - Demo Version
 * A slide-out drawer component for displaying detail panels.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';

const SlideoutPanel = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  actions,
  size = 'md',
  resizable = true,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  showBackdrop = true,
  className,
  headerClassName,
  contentClassName,
  footerContent,
}) => {
  const [currentSize, setCurrentSize] = useState(size);
  const [isClosing, setIsClosing] = useState(false);

  // Size presets
  const sizeClasses = {
    sm: 'w-96 max-w-[calc(100vw-1rem)]',
    md: 'w-[600px] max-w-[calc(100vw-1rem)]',
    lg: 'w-[800px] max-w-[calc(100vw-1rem)]',
    xl: 'w-[1000px] max-w-[calc(100vw-1rem)]',
    full: 'w-screen',
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleSizeToggle = () => {
    const sizes = ['sm', 'md', 'lg', 'xl', 'full'];
    const currentIndex = sizes.indexOf(currentSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setCurrentSize(sizes[nextIndex]);
  };

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const content = (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={cn(
            'absolute inset-0 bg-[var(--bb-color-overlay-scrim)] backdrop-blur-sm transition-opacity duration-300',
            isClosing ? 'opacity-0' : 'opacity-100'
          )}
          onClick={closeOnBackdropClick ? handleClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Slide out panel'}
        className={cn(
          'absolute top-0 bottom-0 right-0 flex flex-col transition-transform duration-300 overflow-hidden box-border',
          'bg-[var(--bb-color-bg-surface)] border-l border-[var(--bb-color-border-subtle)]',
          'shadow-[var(--bb-elevation-card)]',
          sizeClasses[currentSize],
          isClosing ? 'translate-x-full' : 'translate-x-0',
          className
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex-shrink-0 px-6 py-4 border-b border-[var(--bb-color-border-subtle)]',
            'bg-[var(--bb-color-bg-surface)]',
            headerClassName
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 pr-4 min-w-0">
              <h2 className="text-xl font-semibold text-[var(--bb-color-text-primary)]">{title}</h2>
              {subtitle && <p className="text-sm text-[var(--bb-color-text-muted)] mt-1">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-1">
              {/* Size Toggle */}
              {resizable && (
                <Button variant="ghost" size="icon" onClick={handleSizeToggle} className="h-8 w-8">
                  {currentSize === 'full' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              )}

              {/* Close Button */}
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Header Actions */}
          {actions && <div className="flex items-center gap-2 mt-3">{actions}</div>}
        </div>

        {/* Content */}
        <div className={cn('flex-1 overflow-y-auto overflow-x-hidden min-w-0', contentClassName)}>{children}</div>

        {/* Footer */}
        {footerContent && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default SlideoutPanel;
