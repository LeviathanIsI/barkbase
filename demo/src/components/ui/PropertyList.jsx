import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Display property/value pairs in a vertical list
 * Used in sidebars to show record details
 *
 * @example
 * <PropertyList properties={[
 *   { label: 'Breed', value: 'Golden Retriever' },
 *   { label: 'Age', value: '3 years' },
 * ]} />
 */
export function PropertyList({ properties, className }) {
  return (
    <dl className={cn("space-y-4", className)}>
      {properties.map((prop, index) => (
        <div key={prop.label || index}>
          <dt className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
            {prop.label}
          </dt>
          <dd className="text-sm font-normal text-[var(--text-primary)]">
            {prop.value || prop.render || '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

PropertyList.displayName = 'PropertyList';
