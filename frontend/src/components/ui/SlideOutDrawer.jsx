import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

/**
 * SlideOutDrawer Component
 * Implements drawer-first navigation pattern to avoid page changes
 * Slides in from the right, can be resized, and keeps context visible
 */

const SlideOutDrawer = ({ 
  isOpen, 
  onClose, 
  title,
  subtitle,
  children,
  actions,
  size = 'md', // sm, md, lg, full
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

  // Size presets
  const sizeClasses = {
    sm: 'w-96',
    md: 'w-[600px]',
    lg: 'w-[800px]',
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
    const sizes = ['sm', 'md', 'lg', 'full'];
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

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      {showBackdrop && (
        <div 
          className={cn(
            "absolute inset-0 bg-black transition-opacity duration-300",
            isClosing ? "opacity-0" : "opacity-40"
          )}
          onClick={closeOnBackdropClick ? handleClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 bg-white dark:bg-surface-primary shadow-xl flex flex-col transition-transform duration-300",
          !width && sizeClasses[currentSize],
          isClosing ? "translate-x-full" : "translate-x-0",
          className
        )}
        style={width ? { width: `${width}px` } : undefined}
      >
        {/* Resize Handle */}
        {resizable && currentSize !== 'full' && (
          <div
            className={cn(
              "absolute left-0 inset-y-0 w-1 cursor-col-resize hover:bg-primary-400 transition-colors",
              isResizing && "bg-primary-500"
            )}
            onMouseDown={handleResizeStart}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 flex items-center justify-center">
              <div className="w-1 h-8 bg-gray-300 dark:bg-surface-border rounded-full" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b bg-white dark:bg-surface-primary",
          headerClassName
        )}>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">{title}</h2>
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center gap-1">
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
            <div className="flex items-center gap-2 mt-3">
              {actions}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-y-auto",
          contentClassName
        )}>
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="px-6 py-4 border-t bg-gray-50 dark:bg-surface-secondary">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized Drawer Variants

export const DetailDrawer = ({ record, ...props }) => {
  return (
    <SlideOutDrawer
      size="lg"
      title={props.title || `${record?.type || 'Record'} Details`}
      subtitle={props.subtitle || `ID: ${record?.id || 'Unknown'}`}
      headerClassName="bg-gray-50 dark:bg-surface-secondary"
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
          <p className="text-sm text-gray-500 dark:text-text-secondary">
            {isDirty && 'You have unsaved changes'}
          </p>
          <div className="flex items-center gap-2">
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
      <div className="divide-y">
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
                "w-full px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors flex items-center gap-3",
                action.variant === 'danger' && "text-error-600 hover:bg-error-50",
                action.disabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={action.disabled}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <div className="flex-1">
                <p className="font-medium">{action.label}</p>
                {action.description && (
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{action.description}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
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
      <div className="border-b bg-gray-50 dark:bg-surface-secondary">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary dark:text-text-primary"
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4 inline mr-1.5" />}
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </>
  );
};

export default SlideOutDrawer;


