import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

/**
 * SlideOutDrawer Component
 * Implements drawer-first navigation pattern to avoid page changes
 * Slides in from the right, can be resized, and keeps context visible
 * Uses token-based styling for consistent theming
 */

const SlideOutDrawer = ({ 
  isOpen, 
  onClose, 
  title,
  subtitle,
  children,
  actions,
  size = 'md', // sm, md, lg, xl, full
  resizable = true,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  showBackdrop = true,
  className,
  headerClassName,
  contentClassName,
  footerContent,
  onSizeChange
}) => {
  const [currentSize, setCurrentSize] = useState(size);
  const [isClosing, setIsClosing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(null);

  // Size presets - use max-w to ensure drawer stays within viewport
  const sizeClasses = {
    sm: 'w-96 max-w-[calc(100vw-1rem)]',
    md: 'w-[600px] max-w-[calc(100vw-1rem)]',
    lg: 'w-[800px] max-w-[calc(100vw-1rem)]',
    xl: 'w-[1000px] max-w-[calc(100vw-1rem)]',
    full: 'w-screen'
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
    const nextSize = sizes[nextIndex];

    setCurrentSize(nextSize);
    onSizeChange?.(nextSize);
  };

  const handleResizeStart = (e) => {
    if (!resizable || currentSize === 'full') return;
    
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = e.currentTarget.parentElement.offsetWidth;

    const handleMouseMove = (e) => {
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(384, Math.min(window.innerWidth - 100, startWidth + deltaX)); // min 384px (sm), max screen - 100px
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
            "absolute inset-0 bg-[var(--bb-color-overlay-scrim)] backdrop-blur-sm transition-opacity duration-300",
            isClosing ? "opacity-0" : "opacity-100"
          )}
          onClick={closeOnBackdropClick ? handleClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Slide out drawer'}
        className={cn(
          "absolute top-0 bottom-0 right-0 flex flex-col transition-transform duration-300 overflow-hidden box-border",
          "bg-[var(--bb-color-bg-surface)] border-l border-[var(--bb-color-border-subtle)]",
          "shadow-[var(--bb-elevation-card)]",
          !width && sizeClasses[currentSize],
          isClosing ? "translate-x-full" : "translate-x-0",
          className
        )}
        style={width ? { width: `${width}px`, maxWidth: 'calc(100vw - 0.5rem)' } : undefined}
      >
        {/* Resize Handle */}
        {resizable && currentSize !== 'full' && (
          <div
            className={cn(
              "absolute left-0 inset-y-0 w-1 cursor-col-resize hover:bg-[var(--bb-color-accent)] transition-colors",
              isResizing && "bg-[var(--bb-color-accent)]"
            )}
            onMouseDown={handleResizeStart}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 flex items-center justify-center">
              <div className="w-1 h-8 bg-[var(--bb-color-border-subtle)] rounded-full" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className={cn(
          "flex-shrink-0 px-[var(--bb-space-6)] py-[var(--bb-space-4)] border-b border-[var(--bb-color-border-subtle)]",
          "bg-[var(--bb-color-bg-surface)]",
          headerClassName
        )}>
          <div className="flex items-start justify-between gap-[var(--bb-space-4)]">
            <div className="flex-1 pr-[var(--bb-space-4)] min-w-0">
              <h2 className="text-[var(--bb-font-size-xl)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">{title}</h2>
              {subtitle && (
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mt-[var(--bb-space-1)]">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-[var(--bb-space-1)]">
              {/* Size Toggle */}
              {resizable && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSizeToggle}
                  className="h-8 w-8"
                >
                  {currentSize === 'full' ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Header Actions */}
          {actions && (
            <div className="flex items-center gap-[var(--bb-space-2)] mt-[var(--bb-space-3)]">
              {actions}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden min-w-0 [&>*]:max-w-full",
          contentClassName
        )}>
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="flex-shrink-0 px-[var(--bb-space-6)] py-[var(--bb-space-4)] border-t border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

// Specialized Drawer Variants

export const DetailDrawer = ({ record, ...props }) => {
  return (
    <SlideOutDrawer
      size="lg"
      title={props.title || `${record?.type || 'Record'} Details`}
      subtitle={props.subtitle || `ID: ${record?.id || 'Unknown'}`}
      headerClassName="bg-[var(--bb-color-bg-elevated)]"
      {...props}
    />
  );
};

export const EditDrawer = ({ onSave, onCancel, isDirty = false, ...props }) => {
  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onCancel?.();
        props.onClose();
      }
    } else {
      onCancel?.();
      props.onClose();
    }
  };

  return (
    <SlideOutDrawer
      {...props}
      onClose={handleClose}
      footerContent={
        <div className="flex items-center justify-between">
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            {isDirty && 'You have unsaved changes'}
          </p>
          <div className="flex items-center gap-[var(--bb-space-2)]">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </div>
      }
    />
  );
};

export const QuickActionDrawer = ({ actions = [], ...props }) => {
  return (
    <SlideOutDrawer
      size="sm"
      {...props}
      contentClassName="p-0"
    >
      <div className="divide-y divide-[var(--bb-color-border-subtle)]">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                props.onClose();
              }}
              className={cn(
                "w-full px-[var(--bb-space-6)] py-[var(--bb-space-4)] text-left",
                "hover:bg-[var(--bb-color-bg-elevated)] transition-colors",
                "flex items-center gap-[var(--bb-space-3)]",
                action.variant === 'danger' && "text-[var(--bb-color-status-negative)] hover:bg-[var(--bb-color-status-negative-soft)]",
                action.disabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={action.disabled}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <div className="flex-1">
                <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">{action.label}</p>
                {action.description && (
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{action.description}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--bb-color-text-subtle)]" />
            </button>
          );
        })}
      </div>
    </SlideOutDrawer>
  );
};

// Tab Panel for complex drawers
export const DrawerTabPanel = ({ tabs, activeTab, onTabChange, children }) => {
  return (
    <>
      <div className="border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "px-[var(--bb-space-4)] py-[var(--bb-space-3)] text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-[var(--bb-color-accent)] text-[var(--bb-color-accent)]"
                  : "border-transparent text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]"
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4 inline mr-[var(--bb-space-1)]" />}
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-[var(--bb-space-2)] text-[var(--bb-font-size-xs)]">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="p-[var(--bb-space-6)]">
        {children}
      </div>
    </>
  );
};

export default SlideOutDrawer;
