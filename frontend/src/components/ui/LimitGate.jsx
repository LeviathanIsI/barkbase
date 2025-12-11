import { useFeatureAccess } from '@/lib/featureGuard';
import LimitReachedBanner from './LimitReachedBanner';

/**
 * LimitGate - Conditionally renders children based on numeric limits
 *
 * Use this for features with numeric limits like:
 * - seats (team members)
 * - locations
 * - activePets
 * - bookingsPerMonth
 *
 * @param {string} feature - The feature key to check (must be a numeric limit feature)
 * @param {number} currentCount - Current usage count (optional - will use tenant usage if not provided)
 * @param {React.ReactNode} children - Content to render if within limit
 * @param {function} onLimitReached - Optional callback when limit is reached
 * @param {boolean} showBanner - Whether to show LimitReachedBanner when limit reached (default: true)
 * @param {React.ReactNode} fallback - Optional custom fallback content
 */
const LimitGate = ({
  feature,
  currentCount: providedCount,
  children,
  onLimitReached,
  showBanner = true,
  fallback = null,
}) => {
  const {
    tier,
    isWithinLimit,
    getLimit,
    getCurrentUsage,
    getUpgradeTierForLimit,
  } = useFeatureAccess();

  // Use provided count or get from tenant usage
  const currentCount = providedCount ?? getCurrentUsage(feature);
  const limit = getLimit(feature);
  const upgradeTo = getUpgradeTierForLimit(feature);

  // If within limit, render children
  if (isWithinLimit(feature, currentCount)) {
    return children;
  }

  // Limit reached - call callback if provided
  if (onLimitReached) {
    onLimitReached();
  }

  // Show banner or fallback
  if (showBanner && limit !== null) {
    return (
      <LimitReachedBanner
        feature={feature}
        currentCount={currentCount}
        limit={limit}
        tier={tier}
        upgradeTo={upgradeTo}
      />
    );
  }

  return fallback;
};

/**
 * useLimitGate - Hook version for programmatic limit checks
 */
export const useLimitGate = (feature, providedCount) => {
  const {
    tier,
    isWithinLimit,
    getLimit,
    getCurrentUsage,
    getUpgradeTierForLimit,
    getUsagePercentage,
  } = useFeatureAccess();

  const currentCount = providedCount ?? getCurrentUsage(feature);
  const limit = getLimit(feature);

  return {
    isWithinLimit: isWithinLimit(feature, currentCount),
    currentCount,
    limit,
    tier,
    upgradeTo: getUpgradeTierForLimit(feature),
    percentage: limit ? Math.min(100, Math.round((currentCount / limit) * 100)) : 0,
    isUnlimited: limit === null,
    isAtLimit: limit !== null && currentCount >= limit,
    isNearLimit: limit !== null && currentCount >= limit * 0.8,
  };
};

export default LimitGate;
