/**
 * LaunchChecklist Component
 * Pre-launch verification checklist for facility setup
 */

import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const CHECKLIST_CATEGORIES = [
  {
    id: 'business',
    name: 'Business Setup',
    items: [
      {
        id: 'business-info',
        label: 'Business name and contact information',
        description: 'Add your facility name, address, phone, and email',
        path: '/settings/business',
        check: (data) => data?.tenant?.name && data?.tenant?.phone,
      },
      {
        id: 'logo',
        label: 'Upload company logo',
        description: 'Add your logo for invoices and customer communications',
        path: '/settings/branding',
        check: (data) => !!data?.tenant?.logo_url,
      },
      {
        id: 'timezone',
        label: 'Set timezone and locale',
        description: 'Configure your timezone and date/time formats',
        path: '/settings/general',
        check: (data) => !!data?.tenant?.settings?.timezone,
      },
    ],
  },
  {
    id: 'services',
    name: 'Services & Pricing',
    items: [
      {
        id: 'services-setup',
        label: 'Configure at least one service',
        description: 'Set up boarding, daycare, grooming, or other services',
        path: '/settings/services',
        check: (data) => data?.services?.length > 0,
      },
      {
        id: 'pricing',
        label: 'Set service pricing',
        description: 'Add pricing for all your services',
        path: '/settings/services',
        check: (data) => data?.services?.every(s => s.base_price > 0),
      },
      {
        id: 'tax-rate',
        label: 'Configure tax settings',
        description: 'Set your tax rate if applicable',
        path: '/settings/invoicing',
        check: (data) => data?.tenant?.settings?.taxRate !== undefined,
      },
    ],
  },
  {
    id: 'facility',
    name: 'Facility Configuration',
    items: [
      {
        id: 'locations',
        label: 'Add at least one location',
        description: 'Set up your facility locations',
        path: '/settings/facility/locations',
        check: (data) => data?.locations?.length > 0,
      },
      {
        id: 'runs',
        label: 'Configure runs/kennels',
        description: 'Set up your boarding runs or kennels',
        path: '/settings/facility/runs',
        check: (data) => data?.runs?.length > 0,
      },
      {
        id: 'operating-hours',
        label: 'Set operating hours',
        description: 'Define your check-in and check-out times',
        path: '/settings/booking',
        check: (data) => data?.tenant?.settings?.checkInTime && data?.tenant?.settings?.checkOutTime,
      },
    ],
  },
  {
    id: 'team',
    name: 'Team & Security',
    items: [
      {
        id: 'team-members',
        label: 'Invite team members',
        description: 'Add staff who will use the system',
        path: '/settings/team',
        check: (data) => data?.users?.length > 1,
        optional: true,
      },
      {
        id: 'roles',
        label: 'Configure user roles',
        description: 'Set up permissions for different staff roles',
        path: '/settings/team',
        check: (data) => data?.roles?.length > 0,
        optional: true,
      },
    ],
  },
  {
    id: 'billing',
    name: 'Billing & Payments',
    items: [
      {
        id: 'payment-processor',
        label: 'Connect payment processor',
        description: 'Set up Stripe or another payment provider',
        path: '/settings/payment-processing',
        check: (data) => !!data?.tenant?.stripe_account_id,
        optional: true,
      },
      {
        id: 'invoice-settings',
        label: 'Configure invoice settings',
        description: 'Set up invoice numbering and terms',
        path: '/settings/invoicing',
        check: (data) => !!data?.tenant?.settings?.invoicePrefix,
      },
    ],
  },
  {
    id: 'communications',
    name: 'Communications',
    items: [
      {
        id: 'email-templates',
        label: 'Review email templates',
        description: 'Customize confirmation and reminder emails',
        path: '/settings/email',
        check: () => true, // Default templates exist
        optional: true,
      },
      {
        id: 'sms',
        label: 'Set up SMS notifications',
        description: 'Configure text message reminders',
        path: '/settings/sms',
        check: (data) => !!data?.tenant?.twilio_account_sid,
        optional: true,
      },
    ],
  },
];

function ChecklistItem({ item, status, onNavigate }) {
  const isComplete = status === 'complete';
  const isWarning = status === 'warning';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        'hover:bg-[var(--bb-color-bg-elevated)] cursor-pointer'
      )}
      onClick={() => onNavigate(item.path)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.path)}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isComplete ? (
          <CheckCircleSolidIcon className="h-5 w-5 text-[var(--bb-color-status-positive)]" />
        ) : isWarning ? (
          <ExclamationTriangleIcon className="h-5 w-5 text-[var(--bb-color-status-warning)]" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-[var(--bb-color-border-subtle)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              isComplete
                ? 'text-[var(--bb-color-text-muted)] line-through'
                : 'text-[var(--bb-color-text-primary)]'
            )}
          >
            {item.label}
          </span>
          {item.optional && (
            <span className="text-xs text-[var(--bb-color-text-muted)] bg-[var(--bb-color-bg-elevated)] px-1.5 py-0.5 rounded">
              Optional
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--bb-color-text-muted)] mt-0.5">
          {item.description}
        </p>
      </div>

      <ChevronRightIcon className="h-4 w-4 text-[var(--bb-color-text-muted)] flex-shrink-0" />
    </div>
  );
}

function ChecklistCategory({ category, itemStatuses, onNavigate }) {
  const completedCount = category.items.filter(
    (item) => itemStatuses[item.id] === 'complete'
  ).length;
  const totalRequired = category.items.filter((item) => !item.optional).length;
  const completedRequired = category.items.filter(
    (item) => !item.optional && itemStatuses[item.id] === 'complete'
  ).length;

  const isComplete = completedRequired === totalRequired;

  return (
    <div className="border-b border-[var(--bb-color-border-subtle)] last:border-b-0">
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bb-color-bg-elevated)]">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircleIcon className="h-5 w-5 text-[var(--bb-color-status-positive)]" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-[var(--bb-color-border-subtle)]" />
          )}
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            {category.name}
          </h3>
        </div>
        <span className="text-xs text-[var(--bb-color-text-muted)]">
          {completedCount}/{category.items.length}
        </span>
      </div>

      <div className="px-2 py-2">
        {category.items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            status={itemStatuses[item.id]}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export function LaunchChecklist({ data, onNavigate, onRefresh, isLoading }) {
  const [itemStatuses, setItemStatuses] = useState({});

  useEffect(() => {
    if (!data) return;

    const statuses = {};
    CHECKLIST_CATEGORIES.forEach((category) => {
      category.items.forEach((item) => {
        try {
          const isComplete = item.check(data);
          statuses[item.id] = isComplete ? 'complete' : item.optional ? 'warning' : 'incomplete';
        } catch {
          statuses[item.id] = 'incomplete';
        }
      });
    });
    setItemStatuses(statuses);
  }, [data]);

  const totalItems = CHECKLIST_CATEGORIES.flatMap((c) => c.items).length;
  const completedItems = Object.values(itemStatuses).filter(
    (s) => s === 'complete'
  ).length;
  const requiredItems = CHECKLIST_CATEGORIES.flatMap((c) =>
    c.items.filter((i) => !i.optional)
  ).length;
  const completedRequired = CHECKLIST_CATEGORIES.flatMap((c) =>
    c.items.filter((i) => !i.optional && itemStatuses[i.id] === 'complete')
  ).length;

  const progressPercent = Math.round((completedItems / totalItems) * 100);
  const isLaunchReady = completedRequired === requiredItems;

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--bb-color-border-subtle)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--bb-color-text-primary)]">
              Launch Checklist
            </h2>
            <p className="text-sm text-[var(--bb-color-text-muted)]">
              Complete these items before going live
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <ArrowPathIcon
              className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--bb-color-text-muted)]">
              {completedItems} of {totalItems} complete
            </span>
            <span
              className={cn(
                'font-medium',
                isLaunchReady
                  ? 'text-[var(--bb-color-status-positive)]'
                  : 'text-[var(--bb-color-text-primary)]'
              )}
            >
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 bg-[var(--bb-color-bg-elevated)] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isLaunchReady
                  ? 'bg-[var(--bb-color-status-positive)]'
                  : 'bg-[var(--bb-color-accent)]'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {isLaunchReady && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--bb-color-status-positive-soft)] border border-[var(--bb-color-status-positive)]">
            <div className="flex items-center gap-2">
              <CheckCircleSolidIcon className="h-5 w-5 text-[var(--bb-color-status-positive)]" />
              <span className="text-sm font-medium text-[var(--bb-color-status-positive-text)]">
                All required items complete - You're ready to launch!
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {CHECKLIST_CATEGORIES.map((category) => (
          <ChecklistCategory
            key={category.id}
            category={category}
            itemStatuses={itemStatuses}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </Card>
  );
}

export default LaunchChecklist;
