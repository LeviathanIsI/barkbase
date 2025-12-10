import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'details summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Modal Shell - The main modal container
 */
const Modal = ({ 
  open, 
  onClose, 
  title, 
  description,
  ariaLabel = 'Dialog', 
  children, 
  footer, 
  className,
  size = 'default' // 'sm', 'default', 'lg', 'xl', 'full'
}) => {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;

    // Only save the previously focused element once when modal opens
    if (!previouslyFocusedRef.current) {
      previouslyFocusedRef.current = document.activeElement;
    }

    const node = dialogRef.current;
    if (!node) return undefined;

    const focusableElements = Array.from(node.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
      (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Only auto-focus the first element if nothing is currently focused in the modal
    if (!node.contains(document.activeElement)) {
      if (firstFocusable) {
        firstFocusable.focus({ preventScroll: true });
      } else {
        node.focus({ preventScroll: true });
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key === 'Tab' && focusableElements.length > 0) {
        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            event.preventDefault();
            (lastFocusable || firstFocusable).focus({ preventScroll: true });
          }
        } else if (document.activeElement === lastFocusable) {
          event.preventDefault();
          (firstFocusable || lastFocusable).focus({ preventScroll: true });
        }
      }
    };

    node.addEventListener('keydown', handleKeyDown);

    return () => {
      node.removeEventListener('keydown', handleKeyDown);
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus({ preventScroll: true });
      }
      previouslyFocusedRef.current = null; // Reset for next open
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-[var(--bb-space-4)]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[var(--bb-color-overlay-scrim)] backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      {/* Modal Shell */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? headingId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        className={cn(
          'relative z-[301] w-full rounded-[var(--bb-radius-lg)]',
          'bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]',
          'shadow-[var(--bb-elevation-card)]',
          'focus:outline-none animate-scale-in',
          'max-h-[90vh] overflow-hidden flex flex-col',
          sizeClasses[size] || sizeClasses.default,
          className,
        )}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || onClose) && (
          <ModalHeader>
            <div className="flex-1">
              {title && (
                <ModalTitle id={headingId}>{title}</ModalTitle>
              )}
              {description && (
                <ModalDescription id={descriptionId}>{description}</ModalDescription>
              )}
            </div>
            {onClose && (
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Close modal" 
                onClick={onClose}
                className="text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)] -mr-[var(--bb-space-2)]"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </ModalHeader>
        )}
        
        {/* Body */}
        <ModalBody>{children}</ModalBody>
        
        {/* Footer */}
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

/**
 * Modal Header - Contains title, description, and close button
 */
const ModalHeader = ({ className, children, ...props }) => (
  <div
    className={cn(
      'flex items-start justify-between gap-[var(--bb-space-4)]',
      'px-[var(--bb-space-6)] py-[var(--bb-space-5)]',
      'border-b border-[var(--bb-color-border-subtle)]',
      'bg-[var(--bb-color-bg-surface)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

/**
 * Modal Title - The main heading
 */
const ModalTitle = ({ className, children, ...props }) => (
  <h2
    className={cn(
      'text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)]',
      'text-[var(--bb-color-text-primary)] leading-tight',
      className
    )}
    {...props}
  >
    {children}
  </h2>
);

/**
 * Modal Description - Subtitle/description text
 */
const ModalDescription = ({ className, children, ...props }) => (
  <p
    className={cn(
      'text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]',
      'mt-[var(--bb-space-1)]',
      className
    )}
    {...props}
  >
    {children}
  </p>
);

/**
 * Modal Body - Main content area
 */
const ModalBody = ({ className, children, ...props }) => (
  <div
    className={cn(
      'flex-1 overflow-y-auto',
      'px-[var(--bb-space-6)] py-[var(--bb-space-5)]',
      'text-[var(--bb-color-text-primary)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

/**
 * Modal Footer - Action buttons area
 */
const ModalFooter = ({ className, children, ...props }) => (
  <div
    className={cn(
      'flex items-center justify-end gap-[var(--bb-space-3)]',
      'px-[var(--bb-space-6)] py-[var(--bb-space-4)]',
      'border-t border-[var(--bb-color-border-subtle)]',
      'bg-[var(--bb-color-bg-surface)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter };
export default Modal;
