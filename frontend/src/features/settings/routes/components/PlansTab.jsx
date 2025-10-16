import { useState } from 'react';
import { Check, X, Star, Zap, Users, Phone, Download, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function PlansTab() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      name: 'FREE',
      price: '$0',
      period: '',
      badge: 'Current Plan',
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
      buttonText: 'Current',
      buttonVariant: 'outline',
      popular: false
    },
    {
      name: 'PRO',
      price: '$79-$149',
      period: '/month',
      badge: 'Most Popular',
      badgeVariant: 'primary',
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
      buttonText: 'Start 14-Day Free Trial',
      buttonVariant: 'default',
      popular: true
    },
    {
      name: 'ENTERPRISE',
      price: '$399+',
      period: '/month',
      badge: null,
      badgeVariant: null,
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
      buttonText: 'Contact Sales',
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
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
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
      return <span className="font-medium text-gray-900">{value}</span>;
    }
    return <span className="text-gray-700">{value}</span>;
  };

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
                  {plan.popular && <Star className="w-3 h-3 mr-1" />}
                  {plan.badge}
                </Badge>
              </div>
            )}

            <div className="pt-6 text-center">
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                {plan.period && <span className="text-gray-600">{plan.period}</span>}
                {plan.name === 'PRO' && (
                  <div className="text-xs text-gray-500 mt-1">
                    (based on booking volume)
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-3">{plan.description}</p>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Includes:</h4>
                <ul className="space-y-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      {feature.substring(2)}
                    </li>
                  ))}
                </ul>
              </div>

              {plan.missing.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Missing:</h4>
                  <ul className="space-y-1">
                    {plan.missing.map((missing, index) => (
                      <li key={index} className="text-sm text-gray-500 flex items-center gap-2">
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
                onClick={() => plan.name !== 'FREE' && handleUpgrade(plan)}
                disabled={plan.name === 'FREE'}
              >
                {plan.buttonText}
              </Button>
              {plan.name === 'ENTERPRISE' && (
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
              <tr className="border-b border-gray-200">
                {comparisonData.headers.map((header, index) => (
                  <th
                    key={index}
                    className={`text-left py-3 px-4 font-medium ${
                      index === 0 ? 'w-1/3' : 'w-1/6 text-center'
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={`border-b border-gray-100 ${row[1] === '' ? 'bg-gray-50' : ''}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`py-3 px-4 ${
                        cellIndex === 0
                          ? 'font-medium text-gray-900'
                          : 'text-center'
                      } ${
                        cell === '' ? 'font-semibold text-gray-900 bg-gray-50' : ''
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
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Upgrade to {selectedPlan.name} Plan
                </h2>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Billing Options */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">SELECT BILLING CYCLE</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div>
                      <div className="font-medium">Monthly - $149/month</div>
                      <div className="text-sm text-gray-600">Bill monthly, cancel anytime</div>
                    </div>
                    <input type="radio" name="billing" value="monthly" className="w-4 h-4 text-blue-600" />
                  </label>
                  <label className="flex items-center justify-between p-4 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 bg-blue-50">
                    <div>
                      <div className="font-medium">Annual - $79/month ($948/year)</div>
                      <div className="text-sm text-blue-600 flex items-center gap-1">
                        💰 Save $852/year (47% off)
                      </div>
                      <div className="text-sm text-gray-600">Bill annually, 14-day money-back guarantee</div>
                    </div>
                    <input type="radio" name="billing" value="annual" defaultChecked className="w-4 h-4 text-blue-600" />
                  </label>
                </div>
              </div>

              {/* What You'll Get */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Your upgrade includes:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    All Free features
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    Integrated payment processing
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    SMS notifications
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    Email + workflow automation
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    2,500 bookings/month
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    Priority support (24h response)
                  </li>
                </ul>
              </div>

              {/* Billing Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">BILLING SUMMARY</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Pro Plan (Annual)</span>
                    <span>$948.00/year</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Prorated credit (12 days)</span>
                    <span>-$31.60</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-2 border-t border-gray-200">
                    <span>Due today:</span>
                    <span>$916.40</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Payment method:</span>
                  <button className="text-blue-600 text-sm">Change</button>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">VISA</span>
                  </div>
                  <span>Visa ending in 4242</span>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm">I agree to the Terms of Service</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                🔒 Secure payment • 14-day money-back guarantee
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowUpgradeModal(false)}>
                  Complete Upgrade
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
