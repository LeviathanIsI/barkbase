import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import { cn } from '@/lib/cn';

/**
 * Human-readable feature names for limit features
 */
const LIMIT_FEATURE_NAMES = {
  seats: 'team members',
  locations: 'locations',
  activePets: 'active pets',
  bookingsPerMonth: 'monthly bookings',
  invitesPerMonth: 'monthly invites',
  storageMb: 'storage',
  apiRps: 'API requests per second',
  webhooksDaily: 'daily webhooks',
};

/**
 * LimitReachedBanner - Shows when a usage limit has been reached
 *
 * @param {string} feature - The feature key that hit the limit
 * @param {number} currentCount - Current usage count
 * @param {number} limit - The plan limit
 * @param {string} tier - Current subscription tier
 * @param {string} upgradeTo - Tier needed for higher limit
 * @param {string} className - Optional className
 */
const LimitReachedBanner = ({
  feature,
  currentCount,
  limit,
  tier,
  upgradeTo,
  className,
}) => {
  const navigate = useNavigate();
  const featureName = LIMIT_FEATURE_NAMES[feature] || feature;

  const handleUpgrade = () => {
    navigate('/settings/billing');
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4',
        className
      )}
      style={{
        borderColor: 'var(--bb-color-status-warning)',
        backgroundColor: 'var(--bb-color-status-warning-soft)',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
          style={{ backgroundColor: 'var(--bb-color-status-warning-soft)' }}
        >
          <AlertTriangle className="h-5 w-5" style={{ color: 'var(--bb-color-status-warning)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className="font-semibold text-sm"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {limit === currentCount ? 'Limit Reached' : 'Approaching Limit'}
          </h4>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            You've used {currentCount} of {limit} {featureName} on the {tier} plan.
            {upgradeTo && ` Upgrade to ${upgradeTo} for more capacity.`}
          </p>

          {/* Usage Bar */}
          <div className="mt-3">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (currentCount / limit) * 100)}%`,
                  backgroundColor: currentCount >= limit
                    ? 'var(--bb-color-status-negative)'
                    : currentCount >= limit * 0.8
                      ? 'var(--bb-color-status-warning)'
                      : 'var(--bb-color-status-positive)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                {currentCount} used
              </span>
              <span className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                {limit} limit
              </span>
            </div>
          </div>
        </div>
        {upgradeTo && (
          <Button
            variant="default"
            size="sm"
            onClick={handleUpgrade}
            className="shrink-0"
            style={{
              backgroundColor: 'var(--bb-color-status-warning)',
              color: 'white',
            }}
          >
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Upgrade
          </Button>
        )}
      </div>
    </div>
  );
};

export default LimitReachedBanner;
