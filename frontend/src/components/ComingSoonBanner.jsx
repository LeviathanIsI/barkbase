/**
 * Coming Soon Banner Component
 *
 * Displays a user-friendly banner for features that are not yet fully implemented.
 * Use this to gracefully handle stubbed backend endpoints.
 *
 * @example
 * <ComingSoonBanner
 *   feature="Pet Creation"
 *   description="Creating new pets will be available soon."
 * />
 */

import React from 'react';

/**
 * Inline banner for features that are coming soon
 */
export const ComingSoonBanner = ({
  feature = 'This feature',
  description = 'is coming soon to Barkbase.',
  variant = 'info', // 'info' | 'warning' | 'muted'
  className = '',
}) => {
  const baseClasses = 'rounded-lg px-4 py-3 text-sm flex items-center gap-2';

  const variantClasses = {
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    muted: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <svg
        className="h-5 w-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>
        <strong>{feature}</strong> {description}
      </span>
    </div>
  );
};

/**
 * Disabled action button wrapper for stubbed features
 */
export const ComingSoonButton = ({
  children,
  feature = 'This action',
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      disabled
      title={`${feature} is coming soon`}
      className={`
        opacity-50 cursor-not-allowed
        inline-flex items-center gap-1.5
        ${className}
      `}
      {...props}
    >
      {children}
      <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
        Soon
      </span>
    </button>
  );
};

/**
 * Tooltip wrapper for stubbed actions
 */
export const ComingSoonTooltip = ({ children, feature = 'This feature' }) => {
  return (
    <div className="relative group inline-block">
      <div className="opacity-50 cursor-not-allowed">{children}</div>
      <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap -top-8 left-1/2 transform -translate-x-1/2">
        {feature} coming soon
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

/**
 * Read-only mode wrapper
 * Shows content as read-only with optional message
 */
export const ReadOnlyMode = ({
  children,
  message = 'Currently in read-only mode. Editing will be available soon.',
  showMessage = true,
}) => {
  return (
    <div className="relative">
      {showMessage && (
        <ComingSoonBanner
          feature="Editing"
          description="is currently read-only. Changes will be available soon."
          variant="muted"
          className="mb-4"
        />
      )}
      <div className="pointer-events-none opacity-90">{children}</div>
    </div>
  );
};

/**
 * List of stubbed endpoints in the backend
 * Use this to check if an action should be disabled
 *
 * NOTE: The following features are now fully implemented with DB-backed endpoints:
 * - segments (GET/POST/PUT/DELETE /api/v1/segments)
 * - conversations/messaging (GET /api/v1/messages/conversations)
 * - expiringVaccinations (GET /api/v1/entity/pets/vaccinations/expiring)
 * - owners (GET/POST/PUT/DELETE /api/v1/entity/owners)
 * - pets (GET/POST/PUT/DELETE /api/v1/entity/pets)
 * - staff (GET/POST/PUT/DELETE /api/v1/entity/staff)
 * - facilities/kennels (GET/POST/PUT/DELETE /api/v1/entity/facilities)
 * - tenants (GET/POST/PUT/DELETE /api/v1/entity/tenants)
 * - bookings (GET/POST/PUT/DELETE /api/v1/operations/bookings)
 * - tasks (GET/POST/PUT/DELETE /api/v1/operations/tasks)
 * - invoices (GET/POST/PUT/DELETE /api/v1/financial/invoices)
 * - payments (GET/POST /api/v1/financial/payments)
 *
 * NOTE: Runs/RunTemplates tables do not exist in the database schema yet.
 * The operations-service returns empty arrays gracefully for these.
 */
export const STUBBED_FEATURES = {
  // Subscriptions/billing (financial-service) - no tables yet
  subscriptions: true,
  paymentMethods: true,

  // Reports generation (analytics-service) - limited implementation
  exportReports: true,
  generateReports: true,

  // Runs/RunTemplates - tables not created yet
  runs: true,
  runTemplates: true,
};

/**
 * Check if a feature is stubbed
 */
export const isFeatureStubbed = (featureName) => {
  return STUBBED_FEATURES[featureName] === true;
};

export default ComingSoonBanner;
