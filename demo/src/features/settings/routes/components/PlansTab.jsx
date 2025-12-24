import { useState } from 'react';
import { Check, X, Star, Zap, Users, Phone, Download, ExternalLink, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useSubscriptionQuery, useBillingUsageQuery, useUpgradePlanMutation } from '@/features/settings/api';

export default function PlansTab() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('annual');
  
  // Get current plan and usage data
  const { data: subscriptionData, isLoading: subLoading } = useSubscriptionQuery();
  const { data: usageData, isLoading: usageLoading } = useBillingUsageQuery();
  const upgradeMutation = useUpgradePlanMutation();
  
  const currentPlan = usageData?.plan || subscriptionData?.currentPlan?.plan || 'FREE';
  const isLoading = subLoading || usageLoading;

  const plans = [
    {
      id: 'FREE',
      name: 'FREE',
      price: '$0',
      monthlyPrice: 0,
      annualPrice: 0,
      period: '',
      badge: currentPlan === 'FREE' ? 'Current Plan' : null,
      badgeVariant: 'success',
      description: 'Perfect for: Just starting out, < 5 pets/day',
      features: [
        '✓ 1 location, 2 seats',
        '✓ 150 bookings/month',
        '✓ 100 active pets',
        '✓ Email support'
      ],
      missing: [
        '❌ No payment processing',
        '❌ No SMS notifications',
        '❌ No automation',
        '❌ No API access'
      ],
      buttonText: currentPlan === 'FREE' ? 'Current' : 'Downgrade',
      buttonVariant: 'outline',
      popular: false
    },
    {
      id: 'PRO',
      name: 'PRO',
      price: '$89',
      monthlyPrice: 89,
      annualPrice: 69,
      period: '/month',
      badge: currentPlan === 'PRO' ? 'Current Plan' : 'Most Popular',
      badgeVariant: currentPlan === 'PRO' ? 'success' : 'primary',
      description: 'Perfect for: Growing businesses, 5-20 pets/day',
      features: [
        '✓ 3 locations, 5 seats',
        '✓ 2,500 bookings/month',
        '✓ Integrated payments & refunds',
        '✓ SMS + email automation',
        '✓ Waitlist & workflows',
        '✓ API access (100/day)',
        '✓ Priority support (24h response)'
      ],
      missing: [],
      buttonText: currentPlan === 'PRO' ? 'Current' : 'Start 14-Day Free Trial',
      buttonVariant: currentPlan === 'PRO' ? 'outline' : 'default',
      popular: currentPlan !== 'PRO'
    },
    {
      id: 'ENTERPRISE',
      name: 'ENTERPRISE',
      price: '$199',
      monthlyPrice: 199,
      annualPrice: 149,
      period: '/month',
      badge: currentPlan === 'ENTERPRISE' ? 'Current Plan' : null,
      badgeVariant: 'success',
      description: 'Perfect for: Multi-location operations, franchises',
      features: [
        '✓ Unlimited locations & seats',
        '✓ Unlimited bookings',
        '✓ SSO + custom RBAC',
        '✓ White-label portal',
        '✓ 365-day audit trails',
        '✓ Dedicated account manager',
        '✓ Custom integrations',
        '✓ SLA guarantees'
      ],
      missing: [],
      buttonText: currentPlan === 'ENTERPRISE' ? 'Current' : 'Contact Sales',
      buttonVariant: 'outline',
      popular: false
    }
  ];

  // Feature comparison data
  const comparisonData = {
    headers: ['Feature', 'Free', 'Pro', 'Enterprise'],
    rows: [
      ['Locations', '1', '3', 'Unlimited'],
      ['Team seats', '2', '5', 'Unlimited'],
      ['Bookings/month', '150', '2,500', 'Unlimited'],
      ['Active pets', '100', 'Unlimited', 'Unlimited'],
      ['Storage', '100MB', '1GB', '10GB+'],

      ['PAYMENTS', '', '', ''],
      ['Accept cards', false, true, true],
      ['Refund management', false, true, true],
      ['Split payments', false, false, true],

      ['AUTOMATION', '', '', ''],
      ['Email automation', false, true, true],
      ['SMS automation', false, true, true],
      ['Waitlist', false, true, true],
      ['No-show workflows', false, true, true],

      ['CUSTOMIZATION', '', '', ''],
      ['Theme colors', false, true, true],
      ['Custom branding', false, false, true],
      ['White-label portal', false, false, true],
      ['Custom domains', false, false, true],

      ['INTEGRATIONS', '', '', ''],
      ['API access', false, '100/day', 'Unlimited'],
      ['Webhooks', false, true, true],
      ['QuickBooks', false, true, true],
      ['Zapier', false, true, true],

      ['SUPPORT', '', '', ''],
      ['Channel', 'Email', 'Email+Chat', 'Priority+Phone'],
      ['Response time', '48h', '24h', '4h'],
      ['Onboarding', 'Self', 'Guided', 'Dedicated'],
      ['Account manager', false, false, true]
    ]
  };

  const handleUpgrade = (plan) => {
    if (plan.id === currentPlan) return;
    if (plan.id === 'ENTERPRISE') {
      // For enterprise, open a contact form or redirect
      window.open('mailto:sales@barkbase.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }
    setSelectedPlan(plan);
    setBillingCycle('annual'); // Default to annual for best value
    setShowUpgradeModal(true);
  };

  const handleCompleteUpgrade = async () => {
    if (!selectedPlan) return;
    
    try {
      await upgradeMutation.mutateAsync({
        plan: selectedPlan.id,
        billingCycle: billingCycle,
      });
      
      setShowUpgradeModal(false);
      setSelectedPlan(null);
      
      // In production, this would redirect to Stripe checkout
      // For now, show success message
      alert(`Successfully initiated upgrade to ${selectedPlan.name}! In production, you would be redirected to complete payment.`);
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to process upgrade. Please try again or contact support.');
    }
  };

  const renderComparisonCell = (value) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-600 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-red-400 mx-auto" />
      );
    }
    if (value === '') {
      return <span className="font-medium text-gray-900 dark:text-text-primary">{value}</span>;
    }
    return <span className="text-gray-700 dark:text-text-primary">{value}</span>;
  };

  const getSelectedPrice = () => {
    if (!selectedPlan) return 0;
    return billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
  };

  const getAnnualTotal = () => {
    if (!selectedPlan) return 0;
    return selectedPlan.annualPrice * 12;
  };

  const getSavings = () => {
    if (!selectedPlan) return 0;
    const monthlyTotal = selectedPlan.monthlyPrice * 12;
    const annualTotal = selectedPlan.annualPrice * 12;
    return monthlyTotal - annualTotal;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${plan.popular ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge variant={plan.badgeVariant} className="px-3 py-1">
                  {plan.popular && plan.id !== currentPlan && <Star className="w-3 h-3 mr-1" />}
                  {plan.badge}
                </Badge>
              </div>
            )}

            <div className="pt-6 text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-text-primary">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-text-primary">{plan.price}</span>
                {plan.period && <span className="text-gray-600 dark:text-text-secondary">{plan.period}</span>}
              </div>
              <p className="text-sm text-gray-600 dark:text-text-secondary mt-3">{plan.description}</p>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">Includes:</h4>
                <ul className="space-y-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-text-primary flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      {feature.substring(2)}
                    </li>
                  ))}
                </ul>
              </div>

              {plan.missing.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">Missing:</h4>
                  <ul className="space-y-1">
                    {plan.missing.map((missing, index) => (
                      <li key={index} className="text-sm text-gray-500 dark:text-text-secondary flex items-center gap-2">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        {missing.substring(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button
                className="w-full"
                variant={plan.buttonVariant}
                onClick={() => handleUpgrade(plan)}
                disabled={plan.id === currentPlan}
              >
                {plan.buttonText}
              </Button>
              {plan.id === 'ENTERPRISE' && plan.id !== currentPlan && (
                <Button variant="outline" className="w-full mt-2">
                  Schedule Demo
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Feature Comparison */}
      <Card title="DETAILED FEATURE COMPARISON">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-surface-border">
                {comparisonData.headers.map((header, index) => (
                  <th
                    key={index}
                    className={`text-left py-3 px-4 font-medium ${
                      index === 0 ? 'w-1/3' : 'w-1/6 text-center'
                    } ${
                      header === currentPlan ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {header}
                    {header === currentPlan && (
                      <Badge variant="success" className="ml-2 text-xs">Current</Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={`border-b border-gray-100 dark:border-surface-border ${row[1] === '' ? 'bg-gray-50 dark:bg-surface-secondary' : ''}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`py-3 px-4 ${
                        cellIndex === 0
                          ? 'font-medium text-gray-900 dark:text-text-primary'
                          : 'text-center'
                      } ${
                        cell === '' ? 'font-semibold text-gray-900 dark:text-text-primary bg-gray-50 dark:bg-surface-secondary' : ''
                      } ${
                        comparisonData.headers[cellIndex] === currentPlan ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
                      }`}
                    >
                      {cellIndex === 0 ? (
                        cell
                      ) : (
                        renderComparisonCell(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Comparison
          </Button>
          <Button variant="outline">
            <ExternalLink className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </Card>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-surface-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
                  Upgrade to {selectedPlan.name} Plan
                </h2>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Billing Options */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4">SELECT BILLING CYCLE</h3>
                <div className="space-y-3">
                  <label 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary ${
                      billingCycle === 'monthly' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                        : 'border-gray-200 dark:border-surface-border'
                    }`}
                  >
                    <div>
                      <div className="font-medium">Monthly - ${selectedPlan.monthlyPrice}/month</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">Bill monthly, cancel anytime</div>
                    </div>
                    <input 
                      type="radio" 
                      name="billing" 
                      value="monthly" 
                      checked={billingCycle === 'monthly'}
                      onChange={() => setBillingCycle('monthly')}
                      className="w-4 h-4 text-blue-600" 
                    />
                  </label>
                  <label 
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-surface-secondary ${
                      billingCycle === 'annual' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                        : 'border-gray-200 dark:border-surface-border'
                    }`}
                  >
                    <div>
                      <div className="font-medium">Annual - ${selectedPlan.annualPrice}/month (${getAnnualTotal()}/year)</div>
                      <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                        💰 Save ${getSavings()}/year ({Math.round((getSavings() / (selectedPlan.monthlyPrice * 12)) * 100)}% off)
                      </div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">Bill annually, 14-day money-back guarantee</div>
                    </div>
                    <input 
                      type="radio" 
                      name="billing" 
                      value="annual" 
                      checked={billingCycle === 'annual'}
                      onChange={() => setBillingCycle('annual')}
                      className="w-4 h-4 text-blue-600" 
                    />
                  </label>
                </div>
              </div>

              {/* What You'll Get */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Your upgrade includes:</h3>
                <ul className="space-y-2">
                  {selectedPlan.features.slice(0, 6).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      {feature.substring(2)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Billing Summary */}
              <div className="bg-gray-50 dark:bg-surface-secondary p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">BILLING SUMMARY</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{selectedPlan.name} Plan ({billingCycle === 'annual' ? 'Annual' : 'Monthly'})</span>
                    <span>
                      {billingCycle === 'annual' 
                        ? `$${getAnnualTotal()}/year` 
                        : `$${selectedPlan.monthlyPrice}/month`
                      }
                    </span>
                  </div>
                  {billingCycle === 'annual' && (
                    <div className="flex justify-between text-green-600">
                      <span>Annual savings</span>
                      <span>-${getSavings()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-lg pt-2 border-t border-gray-200 dark:border-surface-border">
                    <span>Due today:</span>
                    <span>
                      {billingCycle === 'annual' 
                        ? `$${getAnnualTotal()}` 
                        : `$${selectedPlan.monthlyPrice}`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Trial Notice */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">14-Day Free Trial</p>
                    <p>You won't be charged until your trial ends. Cancel anytime.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary">
              <div className="text-xs text-gray-500 dark:text-text-secondary">
                🔒 Secure payment • 14-day money-back guarantee
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCompleteUpgrade}
                  disabled={upgradeMutation.isPending}
                >
                  {upgradeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Start Free Trial'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
