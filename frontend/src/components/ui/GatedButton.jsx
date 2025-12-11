import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import Tooltip from './Tooltip';
import { useFeatureAccess } from '@/lib/featureGuard';
import { FEATURE_NAMES } from './FeatureGate';
import { cn } from '@/lib/cn';

/**
 * GatedButton - A button that shows as disabled with upgrade tooltip when feature is not available
 *
 * @param {string} feature - The feature key to check
 * @param {React.ReactNode} children - Button content
 * @param {string} tooltipSide - Tooltip position (default: 'top')
 * @param {boolean} showLockIcon - Whether to show lock icon when disabled (default: true)
 * @param {function} onClick - Click handler (only fires if feature is enabled)
 * @param {...any} props - All other props passed to Button
 */
const GatedButton = ({
  feature,
  children,
  tooltipSide = 'top',
  showLockIcon = true,
  onClick,
  className,
  ...props
}) => {
  const navigate = useNavigate();
  const { hasFeature, getUpgradeTier } = useFeatureAccess();

  // If feature is enabled, render normal button
  if (hasFeature(feature)) {
    return (
      <Button onClick={onClick} className={className} {...props}>
        {children}
      </Button>
    );
  }

  // Feature is disabled - show locked button with tooltip
  const upgradeTo = getUpgradeTier(feature);
  const featureName = FEATURE_NAMES[feature] || feature;

  const handleLockedClick = () => {
    // Navigate to billing page when locked button is clicked
    navigate('/settings/billing');
  };

  return (
    <Tooltip
      content={
        <div className="text-center">
          <p className="font-medium">Requires {upgradeTo} Plan</p>
          <p className="text-xs opacity-80">Click to upgrade and unlock {featureName}</p>
        </div>
      }
      side={tooltipSide}
    >
      <Button
        {...props}
        onClick={handleLockedClick}
        className={cn(
          'opacity-60 cursor-pointer',
          className
        )}
      >
        {showLockIcon && <Lock className="h-4 w-4 mr-2" />}
        {children}
      </Button>
    </Tooltip>
  );
};

export default GatedButton;
