/**
 * StatusPill Component
 * Semantic status indicator that wraps Badge with status-to-variant mapping
 * Maintains backward compatibility with existing usage patterns
 */

import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

/**
 * Maps status strings to Badge variants
 * Supports common booking, payment, task, and general status values
 */
const STATUS_TO_VARIANT = {
  // Success states
  active: 'success',
  confirmed: 'success',
  completed: 'success',
  paid: 'success',
  approved: 'success',
  'checked-in': 'success',
  'checked_in': 'success',
  checkedin: 'success',
  success: 'success',
  valid: 'success',
  'up-to-date': 'success',
  uptodate: 'success',
  current: 'success',

  // Warning states
  pending: 'warning',
  scheduled: 'warning',
  processing: 'warning',
  'in-progress': 'warning',
  'in_progress': 'warning',
  inprogress: 'warning',
  warning: 'warning',
  'due-soon': 'warning',
  duesoon: 'warning',
  expiring: 'warning',
  overdue: 'warning',
  unpaid: 'warning',
  
  // Danger states
  cancelled: 'danger',
  canceled: 'danger',
  failed: 'danger',
  error: 'danger',
  rejected: 'danger',
  expired: 'danger',
  invalid: 'danger',
  danger: 'danger',
  refunded: 'danger',
  'no-show': 'danger',
  noshow: 'danger',

  // Info states
  info: 'info',
  'checked-out': 'info',
  'checked_out': 'info',
  checkedout: 'info',
  booked: 'info',
  reserved: 'info',

  // Neutral states
  inactive: 'neutral',
  archived: 'neutral',
  draft: 'neutral',
  unknown: 'neutral',
  neutral: 'neutral',
  default: 'neutral',
};

/**
 * Formats status text for display
 * Converts snake_case and kebab-case to Title Case
 */
const formatStatusText = (status) => {
  if (!status) return '';
  return status
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Semantic status pill with automatic color mapping.
 * 
 * @param {Object} props
 * @param {string} props.status - The status value (e.g., 'pending', 'active', 'cancelled')
 * @param {string} props.intent - Override the variant directly (e.g., 'success', 'warning', 'danger')
 * @param {string} props.variant - Direct variant override (alias for intent)
 * @param {React.ReactNode} props.children - Custom content (overrides status text)
 * @param {string} props.className - Additional CSS classes
 */
export default function StatusPill({
  status,
  intent,
  variant: variantProp,
  children,
  className,
  ...props
}) {
  // Determine the variant: direct prop > intent > status mapping > neutral
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '-');
  const mappedVariant = STATUS_TO_VARIANT[normalizedStatus] || 'neutral';
  const variant = variantProp || intent || mappedVariant;

  // Determine display text
  const displayText = children ?? formatStatusText(status);

  return (
    <Badge
      variant={variant}
      className={cn('capitalize', className)}
      {...props}
    >
      {displayText}
    </Badge>
  );
}

// Named export for convenience
export { StatusPill };
