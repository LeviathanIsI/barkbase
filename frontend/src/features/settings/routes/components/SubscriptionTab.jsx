import { useState } from 'react';
import { CheckCircle, X, Zap, TrendingUp, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useSubscriptionQuery, useBillingUsageQuery, useUpgradePlanMutation } from '@/features/settings/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function SubscriptionTab() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { data: subscriptionData, isLoading: subLoading } = useSubscriptionQuery();
  const { data: usageData, isLoading: usageLoading } = useBillingUsageQuery();
  const upgradeMutation = useUpgradePlanMutation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isLoading = subLoading || usageLoading;

  // Use API data
  const currentPlan = subscriptionData?.currentPlan;
  const usage = usageData?.usage;
  const insights = usageData?.insights;
  const plan = usageData?.plan || currentPlan?.plan || 'FREE';

  // Normalize plan name for display
  const planName = currentPlan?.planName || currentPlan?.plan || plan || 'FREE';
  const planDescription = currentPlan?.description || getPlanDescription(plan);

  const includedFeatures = [
    { name: 'Customer portal self-service', included: true },
    { name: 'Basic booking management', included: true },
    { name: 'Pet & owner profiles', included: true },
    { name: 'Calendar scheduling', included: true },
    { name: 'Email notifications', included: true },
  ];

  const missingFeatures = [
    { name: 'Integrated payment processing', description: 'Accept cards directly' },
    { name: 'Real-time staff sync', description: 'Team coordination tools' },
    { name: 'Waitlist & no-show workflows', description: 'Automated booking management' },
    { name: 'Email automations', description: 'Marketing and follow-up sequences' },
    { name: 'SMS notifications', description: 'Text message updates' },
    { name: 'Theme customization', description: 'Custom branding' },
    { name: 'API access', description: 'Third-party integrations' },
  ];

  // Generate dynamic upgrade recommendation based on REAL usage
  const getUpgradeRecommendation = () => {
    if (!usage) return null;

    const bookingsUsed = usage.bookings?.used || 0;
    const bookingsLimit = usage.bookings?.limit || 150;
    const seatsUsed = usage.seats?.used || 0;
    const seatsLimit = usage.seats?.limit || 2;
    const bookingPercentage = usage.bookings?.percentage || 0;
    const seatsPercentage = usage.seats?.percentage || 0;

    const reasons = [];

    // Check if approaching limits
    if (bookingPercentage >= 70) {
      reasons.push(`You have ${bookingsUsed} bookings this month (${bookingPercentage}% of ${bookingsLimit} limit)`);
    }
    if (seatsPercentage >= 80) {
      reasons.push(`You're using ${seatsUsed} of ${seatsLimit} team seats`);
    }
    if (bookingsUsed > 50) {
      reasons.push('You could save 2 hours/day with automated workflows');
    }
    reasons.push('Integrated payments would eliminate manual entry');
    reasons.push('Your customers would love SMS updates (not just email)');

    // Only show recommendation if there's a reason
    if (plan === 'FREE' && (bookingsUsed > 30 || seatsUsed >= 2)) {
      return {
        plan: 'PRO',
        reason: 'Based on your actual usage, we recommend Pro Plan',
        details: reasons.slice(0, 4),
        price: { monthly: 89, annual: 69 },
        savings: 'Save $240/year with annual billing',
      };
    }

    return null;
  };

  const upgradeRecommendation = getUpgradeRecommendation();

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageBarColor = (percentage) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUsageWarnings = () => {
    if (!usage) return [];
    const warnings = [];
    const { bookings, storage, seats } = usage;

    if (bookings?.percentage >= 80) {
      warnings.push(`You're at ${bookings.percentage}% of booking capacity - consider upgrading soon`);
    } else if (bookings?.percentage < 50) {
      warnings.push(`You're at ${bookings.percentage}% of booking capacity - plenty of room!`);
    }

    if (storage?.used && storage?.limit) {
      const remaining = storage.limit - storage.used;
      warnings.push(`Storage: ${remaining} MB remaining`);
    }

    if (seats?.percentage >= 100) {
      warnings.push('You\'ve reached your team seat limit - upgrade to add more members');
    }

    return warnings;
  };

  const handleUpgrade = () => {
    setSearchParams({ tab: 'plans' });
  };

  const handleStartTrial = async () => {
    try {
      await upgradeMutation.mutateAsync({ plan: 'PRO', billingCycle: 'annual' });
      // In production, this would redirect to Stripe checkout
      alert('Trial started! In production, you would be redirected to complete payment.');
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading subscription...</span>
      </div>
    );
  }

  // Use real usage data from the dedicated endpoint, or fall back to subscription data
  const displayUsage = usage || currentPlan?.usage || {
    bookings: { used: 0, limit: 150, percentage: 0 },
    activePets: { used: 0, limit: 100, percentage: 0 },
    storage: { used: 0, limit: 100, percentage: 0, details: { photos: 0, documents: 0 } },
    seats: { used: 0, limit: 2, percentage: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">{planName} PLAN</h2>
            <p className="text-gray-600 dark:text-text-secondary">{planDescription}</p>
          </div>
          <Button onClick={handleUpgrade}>
            <Zap className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </div>

        {/* Usage Stats - Uses REAL data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary">
              {displayUsage.bookings?.used ?? 0} / {displayUsage.bookings?.limit === -1 ? '∞' : displayUsage.bookings?.limit ?? 150}
            </div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Bookings this month</div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${getUsageBarColor(displayUsage.bookings?.percentage || 0)}`}
                style={{ width: `${displayUsage.bookings?.percentage || 0}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-text-secondary mt-1">
              Reset: {usageData?.usage?.resetDate || 'Next month'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary">
              {displayUsage.activePets?.used ?? displayUsage.activePets ?? 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Active pets</div>
            <div className="text-xs text-gray-500 dark:text-text-secondary mt-3">
              No monthly reset
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary">
              {displayUsage.storage?.used ?? 0} MB / {displayUsage.storage?.limit === -1 ? '∞' : displayUsage.storage?.limit ?? 100} MB
            </div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Storage used</div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${getUsageBarColor(displayUsage.storage?.percentage || 0)}`}
                style={{ width: `${displayUsage.storage?.percentage || 0}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-text-secondary mt-1">
              Photos: {displayUsage.storage?.details?.photos ?? 0} MB | Documents: {displayUsage.storage?.details?.documents ?? 0} MB
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary">
              {displayUsage.seats?.used ?? 0} / {displayUsage.seats?.limit === -1 ? '∞' : displayUsage.seats?.limit ?? 2}
            </div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Team seats</div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${getUsageBarColor(displayUsage.seats?.percentage || 0)}`}
                style={{ width: `${displayUsage.seats?.percentage || 0}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-text-secondary mt-1">
              Team members with system access
            </div>
          </div>
        </div>

        {/* Usage Warnings - Dynamic based on real data */}
        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Usage Status</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            {getUsageWarnings().map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        </div>
      </Card>

      {/* What's Included vs Missing */}
      {plan === 'FREE' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="✅ INCLUDED IN FREE PLAN">
            <div className="space-y-3">
              {includedFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{feature.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="❌ WHAT YOU'RE MISSING">
            <div className="space-y-4">
              {missingFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-text-primary">{feature.name}</div>
                    <div className="text-xs text-gray-600 dark:text-text-secondary">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={handleUpgrade}>
              Compare All Plans →
            </Button>
          </Card>
        </div>
      )}

      {/* Upgrade Recommendation - Only shown when there's a real reason */}
      {upgradeRecommendation && plan === 'FREE' && (
        <Card className="bg-primary-50 dark:bg-surface-primary border-purple-200 dark:border-purple-900/30">
          <div className="flex items-start gap-4">
            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                💡 RECOMMENDED FOR YOU
              </h3>
              <p className="text-purple-800 dark:text-purple-200 font-medium mb-3">
                Upgrade to {upgradeRecommendation.plan} Plan
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                {upgradeRecommendation.reason}
              </p>
              <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1 mb-4">
                {upgradeRecommendation.details.map((detail, index) => (
                  <li key={index}>• {detail}</li>
                ))}
              </ul>
              <div className="flex items-center gap-4">
                <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                  ${upgradeRecommendation.price.monthly}/month
                </div>
                <Badge variant="success" className="bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200">
                  {upgradeRecommendation.savings}
                </Badge>
              </div>
              <div className="flex gap-3 mt-4">
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleUpgrade}>
                  See What You'll Get
                </Button>
                <Button
                  variant="outline"
                  className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:bg-surface-primary"
                  onClick={handleStartTrial}
                  disabled={upgradeMutation.isPending}
                >
                  {upgradeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function getPlanDescription(plan) {
  const descriptions = {
    FREE: 'Community support tier',
    PRO: 'Professional tier with advanced features',
    ENTERPRISE: 'Enterprise tier with unlimited access',
  };
  return descriptions[plan] || descriptions.FREE;
}
