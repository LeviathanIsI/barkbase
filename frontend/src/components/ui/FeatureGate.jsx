import { useFeatureAccess } from '@/lib/featureGuard';
import UpgradeBanner from './UpgradeBanner';

/**
 * Human-readable feature names for display in upgrade banners
 */
const FEATURE_NAMES = {
  // Boolean features
  billingPortal: 'Billing Portal',
  auditLog: 'Audit Log',
  auditLogAccess: 'Audit Log Access',
  advancedReports: 'Advanced Reports',
  realtime: 'Real-time Updates',
  socketsRealtime: 'Live Sync',
  waitlistPromotion: 'Waitlist Promotion',
  noShowWorkflow: 'No-Show Workflow',
  paymentsIntegrated: 'Integrated Payments',
  paymentsDeposits: 'Deposit Collection',
  paymentsRefunds: 'Refund Processing',
  portalSelfService: 'Customer Self-Service Portal',
  portalCardOnFile: 'Card on File',
  portalDepositRules: 'Deposit Rules',
  exportsJson: 'JSON Exports',
  api: 'API Access',
  apiKeys: 'API Keys',
  webhooks: 'Webhooks',
  automationsEmail: 'Email Automations',
  automationsSms: 'SMS Automations',
  whiteLabel: 'White Label Branding',
  sso: 'Single Sign-On (SSO)',
  scim: 'SCIM Provisioning',
  customRoles: 'Custom Roles',
  dataResidency: 'Data Residency',
  backups: 'Automated Backups',
  sandboxTenant: 'Sandbox Environment',
  sla: 'SLA Guarantee',
  supportEmail: 'Email Support',
  supportChat: 'Chat Support',
  supportPriority: 'Priority Support',
  // Numeric features
  seats: 'Team Members',
  locations: 'Locations',
  activePets: 'Active Pets',
  bookingsPerMonth: 'Monthly Bookings',
  invitesPerMonth: 'Monthly Invites',
  storageMb: 'Storage',
  apiRps: 'API Rate Limit',
  webhooksDaily: 'Daily Webhooks',
};

/**
 * FeatureGate - Conditionally renders children based on feature access
 *
 * @param {string} feature - The feature key to check
 * @param {React.ReactNode} children - Content to render if feature is enabled
 * @param {React.ReactNode} fallback - Optional content to render if feature is disabled
 * @param {boolean} showUpgradeBanner - Whether to show upgrade banner when feature is disabled (default: true)
 * @param {string} className - Optional className for wrapper
 */
const FeatureGate = ({
  feature,
  children,
  fallback = null,
  showUpgradeBanner = true,
  className = ''
}) => {
  const { hasFeature, getUpgradeTier } = useFeatureAccess();

  // If feature is enabled, render children
  if (hasFeature(feature)) {
    return children;
  }

  // If feature is disabled and we should show upgrade banner
  if (showUpgradeBanner) {
    const upgradeTo = getUpgradeTier(feature);
    const featureName = FEATURE_NAMES[feature] || feature;

    return (
      <div className={className}>
        <UpgradeBanner
          requiredPlan={upgradeTo || 'PRO'}
          feature={featureName}
        />
      </div>
    );
  }

  // Return fallback if provided, otherwise null
  return fallback;
};

/**
 * useFeatureGate - Hook version for programmatic access checks
 */
export const useFeatureGate = (feature) => {
  const { hasFeature, getUpgradeTier } = useFeatureAccess();

  return {
    isEnabled: hasFeature(feature),
    upgradeTo: getUpgradeTier(feature),
    featureName: FEATURE_NAMES[feature] || feature,
  };
};

export { FEATURE_NAMES };
export default FeatureGate;
