import { CheckCircle, X, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function SubscriptionTab() {
  // Subscription data (wire to billing API)
  const currentPlan = {
    name: 'FREE',
    description: 'Community support tier',
    usage: {
      bookings: { used: 0, limit: 150 },
      activePets: 45,
      storage: { used: 25, limit: 100 }, // MB
      seats: { used: 0, limit: 2 }
    }
  };

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

  const upgradeRecommendation = {
    plan: 'PRO',
    reason: 'Based on your usage, we recommend Pro Plan',
    details: [
      'You have 47 bookings this month (Free plan caps at 150)',
      'You could save 2 hours/day with automated workflows',
      'Integrated payments would eliminate manual entry',
      'Your customers want SMS updates (not just email)'
    ],
    price: { monthly: 149, annual: 79 },
    savings: 'Save $852/year (47% off)'
  };

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 'unlimited') return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{currentPlan.name} PLAN</h2>
            <p className="text-gray-600">{currentPlan.description}</p>
          </div>
          <Button>
            <Zap className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {currentPlan.usage.bookings.used} / {currentPlan.usage.bookings.limit}
            </div>
            <div className="text-sm text-gray-600">Bookings this month</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentPlan.usage.bookings.used, currentPlan.usage.bookings.limit))}`}
                style={{ width: `${getUsagePercentage(currentPlan.usage.bookings.used, currentPlan.usage.bookings.limit)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Reset date: Feb 1, 2025
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {currentPlan.usage.activePets}
            </div>
            <div className="text-sm text-gray-600">Active pets</div>
            <div className="text-xs text-gray-500 mt-3">
              No monthly reset
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {currentPlan.usage.storage.used} MB / {currentPlan.usage.storage.limit} MB
            </div>
            <div className="text-sm text-gray-600">Storage used</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentPlan.usage.storage.used, currentPlan.usage.storage.limit))}`}
                style={{ width: `${getUsagePercentage(currentPlan.usage.storage.used, currentPlan.usage.storage.limit)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Photos: 18 MB | Documents: 7 MB
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {currentPlan.usage.seats.used} / {currentPlan.usage.seats.limit}
            </div>
            <div className="text-sm text-gray-600">Team seats</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentPlan.usage.seats.used, currentPlan.usage.seats.limit))}`}
                style={{ width: `${getUsagePercentage(currentPlan.usage.seats.used, currentPlan.usage.seats.limit)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Team members with system access
            </div>
          </div>
        </div>

        {/* Usage Warnings */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Usage Warnings</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You're at 0% of booking capacity - plenty of room!</li>
            <li>• Storage: 75 MB remaining</li>
          </ul>
        </div>
      </Card>

      {/* What's Included vs Missing */}
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
                  <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                  <div className="text-xs text-gray-600">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            Compare All Plans →
          </Button>
        </Card>
      </div>

      {/* Upgrade Recommendation */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-start gap-4">
          <TrendingUp className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              💡 RECOMMENDED FOR YOU
            </h3>
            <p className="text-purple-800 font-medium mb-3">
              Upgrade to {upgradeRecommendation.plan} Plan
            </p>
            <p className="text-sm text-purple-700 mb-4">
              {upgradeRecommendation.reason}
            </p>
            <ul className="text-sm text-purple-700 space-y-1 mb-4">
              {upgradeRecommendation.details.map((detail, index) => (
                <li key={index}>• {detail}</li>
              ))}
            </ul>
            <div className="flex items-center gap-4">
              <div className="text-lg font-bold text-purple-900">
                ${upgradeRecommendation.price.monthly}/month
              </div>
              <Badge variant="success" className="bg-green-100 text-green-800">
                {upgradeRecommendation.savings}
              </Badge>
            </div>
            <div className="flex gap-3 mt-4">
              <Button className="bg-purple-600 hover:bg-purple-700">
                See What You'll Get
              </Button>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
