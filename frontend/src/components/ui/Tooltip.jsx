import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';

/**
 * Tooltip - Simple tooltip component
 *
 * @param {React.ReactNode} content - Content to show in tooltip
 * @param {React.ReactNode} children - Trigger element
 * @param {string} side - Position of tooltip: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 * @param {number} delay - Delay before showing tooltip in ms (default: 200)
 * @param {string} className - Optional className for tooltip content
 */
const Tooltip = ({
  content,
  children,
  side = 'top',
  delay = 200,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--bb-color-bg-elevated)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--bb-color-bg-elevated)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--bb-color-bg-elevated)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--bb-color-bg-elevated)] border-y-transparent border-l-transparent',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && content && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-xs font-medium rounded-lg shadow-lg whitespace-nowrap',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            positionClasses[side],
            className
          )}
          style={{
            backgroundColor: 'var(--bb-color-bg-elevated)',
            color: 'var(--bb-color-text-primary)',
            border: '1px solid var(--bb-color-border-subtle)',
          }}
          role="tooltip"
        >
          {content}
          <span
            className={cn(
              'absolute border-4',
              arrowClasses[side]
            )}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
