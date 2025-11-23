import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

const SlideoutPanel = ({
  isOpen,
  onClose,
  title,
  children,
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

  return createPortal(
    <div className="fixed inset-0 z-[200] flex">
      <div
        className={cn(
          'flex-1 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative ml-auto flex h-full w-full max-w-xl transform flex-col bg-white shadow-2xl transition-all duration-300 ease-out dark:bg-dark-bg-secondary',
          isVisible ? 'translate-x-0' : 'translate-x-full',
          widthClass,
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-dark-border">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {title}
              </h2>
            )}
          </div>
          <button
            type="button"
            aria-label="Close panel"
            className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-dark-bg-tertiary dark:text-dark-text-secondary"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default SlideoutPanel;

