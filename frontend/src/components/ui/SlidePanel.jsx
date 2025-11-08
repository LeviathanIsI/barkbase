import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';

/**
 * SlidePanel - A right-side flyout panel component
 * 
 * ⭐ STANDARD PATTERN: Use this for all side panels, filters, and contextual overlays
 * 
 * Features:
 * - Slides in from right side
 * - Close on backdrop click
 * - Close on ESC key
 * - Close button (X) in header
 * - Prevents body scroll when open
 * - Smooth animations
 * 
 * Usage:
 * ```jsx
 * <SlidePanel open={isOpen} onClose={handleClose} title="Panel Title">
 *   <YourContent />
 * </SlidePanel>
 * ```
 * 
 * When to use:
 * - Filters and settings
 * - Quick view panels (kennels, check-in/out, etc.)
 * - Contextual actions that don't need full page
 * - Keep users on their current page while showing additional info
 * 
 * When NOT to use:
 * - Use Modal for confirmations, alerts, and centered dialogs
 * - Use full page navigation for complete workflows
 */
const SlidePanel = ({ open, onClose, title, children, className, width = 'w-full md:w-1/2 lg:w-2/5' }) => {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop - clicking closes the panel */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div
        className={cn(
          'relative ml-auto h-full bg-white dark:bg-surface-primary shadow-2xl flex flex-col animate-slide-in-right',
          width,
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">{title}</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default SlidePanel;

