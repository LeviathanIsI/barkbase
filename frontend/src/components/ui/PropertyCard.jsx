/**
 * PropertyCard Component
 * Collapsible card for displaying properties in the left sidebar of detail pages
 * Supports persistence of collapsed state via localStorage
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, Mail, Phone, ExternalLink, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';
import toast from 'react-hot-toast';

/**
 * PropertyCard - Collapsible section for property groups
 * @param {string} title - Section title
 * @param {string} storageKey - Key for persisting collapsed state (optional)
 * @param {boolean} defaultOpen - Default collapsed state
 * @param {React.ReactNode} children - Content to render inside
 * @param {React.ReactNode} icon - Optional icon component
 */
export function PropertyCard({
  title,
  storageKey,
  defaultOpen = true,
  children,
  icon: Icon,
  className
}) {
  const [isOpen, setIsOpen] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`propertyCard_${storageKey}`);
      return stored !== null ? stored === 'true' : defaultOpen;
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`propertyCard_${storageKey}`, String(isOpen));
    }
  }, [isOpen, storageKey]);

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        className
      )}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)'
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bb-color-bg-elevated)]"
      >
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className="w-4 h-4 flex-shrink-0"
              style={{ color: 'var(--bb-color-text-muted)' }}
            />
          )}
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {title}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          style={{ color: 'var(--bb-color-text-muted)' }}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * PropertyList - Display property/value pairs
 * @param {Array} properties - Array of { label, value, type?, href?, copyable? }
 */
export function PropertyList({ properties, className }) {
  const tz = useTimezoneUtils();
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const renderValue = (prop) => {
    const { value, type, href, copyable } = prop;

    if (!value && value !== 0 && value !== false) {
      return (
        <span style={{ color: 'var(--bb-color-text-muted)' }}>
          &mdash;
        </span>
      );
    }

    // Email type
    if (type === 'email') {
      return (
        <div className="flex items-center gap-1.5 group">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--bb-color-text-muted)' }} />
          <a
            href={`mailto:${value}`}
            className="text-sm hover:underline truncate"
            style={{ color: 'var(--bb-color-accent)' }}
          >
            {value}
          </a>
          {copyable !== false && (
            <button
              onClick={() => copyToClipboard(value)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Copy"
            >
              <Copy className="w-3 h-3" style={{ color: 'var(--bb-color-text-muted)' }} />
            </button>
          )}
        </div>
      );
    }

    // Phone type
    if (type === 'phone') {
      return (
        <div className="flex items-center gap-1.5 group">
          <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--bb-color-text-muted)' }} />
          <a
            href={`tel:${value}`}
            className="text-sm hover:underline"
            style={{ color: 'var(--bb-color-accent)' }}
          >
            {value}
          </a>
          {copyable !== false && (
            <button
              onClick={() => copyToClipboard(value)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Copy"
            >
              <Copy className="w-3 h-3" style={{ color: 'var(--bb-color-text-muted)' }} />
            </button>
          )}
        </div>
      );
    }

    // Link type
    if (type === 'link' && href) {
      return (
        <a
          href={href}
          className="text-sm hover:underline inline-flex items-center gap-1"
          style={{ color: 'var(--bb-color-accent)' }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {value}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    }

    // Boolean type
    if (type === 'boolean' || typeof value === 'boolean') {
      return (
        <span
          className="text-sm"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {value ? 'Yes' : 'No'}
        </span>
      );
    }

    // Date type
    if (type === 'date' && value) {
      const formatted = tz.formatShortDate(value);
      return (
        <span
          className="text-sm"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {formatted}
        </span>
      );
    }

    // Currency type
    if (type === 'currency') {
      const formatted = typeof value === 'number'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)
        : value;
      return (
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {formatted}
        </span>
      );
    }

    // Badge type
    if (type === 'badge') {
      const variants = {
        success: 'var(--bb-color-status-positive)',
        warning: 'var(--bb-color-status-caution)',
        danger: 'var(--bb-color-status-negative)',
        info: 'var(--bb-color-info)',
        neutral: 'var(--bb-color-text-muted)',
      };
      const bgVariants = {
        success: 'var(--bb-color-status-positive-soft)',
        warning: 'var(--bb-color-status-caution-soft)',
        danger: 'var(--bb-color-status-negative-soft)',
        info: 'var(--bb-color-info-soft)',
        neutral: 'var(--bb-color-bg-elevated)',
      };
      const variant = prop.variant || 'neutral';
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            color: variants[variant],
            backgroundColor: bgVariants[variant]
          }}
        >
          {value}
        </span>
      );
    }

    // Default text
    return (
      <span
        className="text-sm"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {value}
      </span>
    );
  };

  return (
    <dl className={cn("space-y-3", className)}>
      {properties.map((prop, index) => (
        <div key={prop.label || index}>
          <dt
            className="text-xs font-medium uppercase tracking-wide mb-0.5"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {prop.label}
          </dt>
          <dd className="min-w-0">
            {renderValue(prop)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

PropertyCard.displayName = 'PropertyCard';
PropertyList.displayName = 'PropertyList';

export default PropertyCard;
