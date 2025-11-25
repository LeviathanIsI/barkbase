/**
 * Breadcrumbs Component
 * Token-based breadcrumb navigation with responsive behavior
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/cn';

const Breadcrumbs = ({ items = [], className, showHome = false }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center', className)}
    >
      <ol className="flex items-center gap-[var(--bb-space-1)] flex-wrap">
        {/* Optional Home icon */}
        {showHome && (
          <>
            <li className="flex items-center">
              <Link
                to="/"
                className="text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)] transition-colors"
                aria-label="Home"
              >
                <Home className="h-3.5 w-3.5" />
              </Link>
            </li>
            <li className="flex items-center text-[var(--bb-color-text-muted)]" aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
          </>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <React.Fragment key={item.href || item.label}>
              <li 
                className={cn(
                  'flex items-center',
                  // Hide middle items on mobile, show only first and last
                  !isFirst && !isLast && 'hidden sm:flex'
                )}
              >
                {isLast ? (
                  // Current page - not a link
                  <span
                    className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] max-w-[200px] truncate"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  // Link to previous pages
                  <Link
                    to={item.href}
                    className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)] transition-colors max-w-[150px] truncate"
                  >
                    {item.label}
                  </Link>
                )}
              </li>

              {/* Separator */}
              {!isLast && (
                <li 
                  className={cn(
                    'flex items-center text-[var(--bb-color-text-muted)]',
                    // Hide separator before hidden items on mobile
                    index > 0 && index < items.length - 2 && 'hidden sm:flex'
                  )}
                  aria-hidden="true"
                >
                  <ChevronRight className="h-3 w-3" />
                </li>
              )}

              {/* Mobile ellipsis for collapsed items */}
              {isFirst && items.length > 2 && (
                <li className="flex items-center sm:hidden text-[var(--bb-color-text-muted)]">
                  <span className="text-[var(--bb-font-size-xs)] px-[var(--bb-space-1)]">...</span>
                  <ChevronRight className="h-3 w-3" />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export { Breadcrumbs };
export default Breadcrumbs;

