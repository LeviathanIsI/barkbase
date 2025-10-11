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

const Modal = ({ open, onClose, title, ariaLabel = 'Dialog', children, footer, className }) => {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const headingId = useId();

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

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? headingId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        className={cn(
          'relative z-[101] w-full max-w-2xl scale-100 rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/10 focus:outline-none',
          className,
        )}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 id={headingId} className="text-xl font-semibold text-text">
                {title}
              </h3>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close modal" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-4 space-y-3 text-sm text-text/90">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default Modal;
