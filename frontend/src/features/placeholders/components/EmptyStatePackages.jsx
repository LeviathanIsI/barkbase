import { Package, Plus, TrendingUp, CreditCard, Gift, Crown, Tag, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const EmptyStatePackages = ({ onCreatePackage, onBrowseTemplates }) => {
  const packageTypes = [
    {
      icon: Calendar,
      title: 'MULTI-VISIT PACKAGES',
      description: 'Bundle multiple visits at a discount',
      example: '"10-Day Boarding Pass" - Save $50',
      color: 'blue'
    },
    {
      icon: CreditCard,
      title: 'PUNCH CARDS',
      description: 'Fixed number of visits, use anytime',
      example: '"5-Visit Daycare Card" - $200 (save $25)',
      color: 'green'
    },
    {
      icon: TrendingUp,
      title: 'RECURRING MEMBERSHIPS',
      description: 'Monthly subscription with included services',
      example: '"Unlimited Daycare" - $399/month',
      color: 'purple'
    },
    {
      icon: Crown,
      title: 'VIP MEMBERSHIPS',
      description: 'Priority booking + perks + discounts',
      example: '"VIP Club" - $49/month (10% off everything)',
      color: 'yellow'
    },
    {
      icon: Gift,
      title: 'GIFT CERTIFICATES',
      description: 'Prepaid credit customers can redeem',
      example: '"$100 Gift Card" - Great for holidays',
      color: 'pink'
    },
    {
      icon: Tag,
      title: 'PROMOTIONAL BUNDLES',
      description: 'Limited-time offers to drive bookings',
      example: '"New Customer Special" - First 3 days 50% off',
      color: 'orange'
    }
  ];

  const quickStartTemplates = [
    {
      id: 'boarding-10day',
      icon: Calendar,
      title: '10-Day Boarding Package',
      description: 'Pay for 10 days, save 10%',
      type: 'multi-visit'
    },
    {
      id: 'daycare-5visit',
      icon: CreditCard,
      title: '5-Visit Daycare Punch Card',
      description: 'Buy 5 visits, get 15% off',
      type: 'punch-card'
    },
    {
      id: 'unlimited-daycare',
      icon: TrendingUp,
      title: 'Monthly Unlimited Daycare',
      description: 'Unlimited visits for one monthly fee',
      type: 'recurring'
    },
    {
      icon: Crown,
      title: 'VIP Membership',
      description: 'Priority booking + 10% off all services',
      type: 'vip'
    }
  ];

  const realExamples = [
    {
      name: 'Weekend Warrior Package',
      price: '$399',
      description: '4 weekend daycare visits + 2 bath & brush sessions',
      result: '67% of customers upgraded to this package'
    },
    {
      name: 'Frequent Flyer Club',
      price: '$89/month',
      description: '10% off all services + priority booking during holidays',
      result: '240 members = $21,360/month recurring revenue'
    },
    {
      name: 'Puppy Starter Pack',
      price: '$299',
      description: '5 daycare visits + behavioral consultation + welcome kit',
      result: '85% of new puppy owners purchase this'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Why Packages Matter */}
      <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              WHY PACKAGES & MEMBERSHIPS MATTER
            </h2>
            <p className="text-gray-700">
              Transform one-time customers into loyal, recurring revenue
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Revenue Impact */}
          <div className="bg-white rounded-lg p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-4">REVENUE IMPACT</h3>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">Facilities using packages see:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-800"><strong>35%</strong> higher customer lifetime value</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-800"><strong>28%</strong> increase in booking frequency</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-800"><strong>42%</strong> better customer retention</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-800">Predictable recurring revenue</span>
                </div>
              </div>
            </div>
          </div>

          {/* Package Benefits */}
          <div className="bg-white rounded-lg p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-4">AVERAGE PACKAGE BENEFITS</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-gray-800">Customers save <strong>15-25%</strong> vs individual bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-gray-800">You get paid <strong>upfront</strong> for future services</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-gray-800">Reduces booking friction (already paid)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-gray-800">Creates customer commitment and loyalty</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Package Types */}
      <Card className="p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">PACKAGE TYPES YOU CAN CREATE</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packageTypes.map((type, index) => {
            const Icon = type.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600',
              green: 'bg-green-100 text-green-600',
              purple: 'bg-purple-100 text-purple-600',
              yellow: 'bg-yellow-100 text-yellow-600',
              pink: 'bg-pink-100 text-pink-600',
              orange: 'bg-orange-100 text-orange-600'
            };
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[type.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{type.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{type.description}</p>
                <p className="text-xs text-gray-500 italic">{type.example}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Get Started */}
      <Card className="p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">GET STARTED</h2>
        <p className="text-gray-600 mb-6">
          No packages yet. Create your first package to start increasing customer loyalty and lifetime value!
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Start Templates */}
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-blue-900">QUICK START TEMPLATES</h3>
            </div>
            <p className="text-sm text-blue-800 mb-4">
              Pre-built packages you can customize:
            </p>
            <div className="space-y-3 mb-4">
              {quickStartTemplates.map((template, index) => {
                const Icon = template.icon;
                return (
                  <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm">{template.title}</h4>
                        <p className="text-xs text-gray-600">{template.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button className="w-full" onClick={onBrowseTemplates}>
              View All Templates (12)
            </Button>
          </div>

          {/* Build from Scratch */}
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">BUILD FROM SCRATCH</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Create a completely custom package
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Perfect for: Unique offerings, complex structures
            </p>
            <Button variant="outline" className="w-full" onClick={onCreatePackage}>
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Package
            </Button>
          </div>
        </div>
      </Card>

      {/* Real Examples */}
      <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          REAL EXAMPLES FROM OTHER FACILITIES
        </h2>
        <p className="text-sm text-gray-600 mb-6">See what's working for facilities like yours</p>
        <div className="space-y-4">
          {realExamples.map((example, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{example.name}</span>
                    <Badge variant="success" className="text-xs">{example.price}</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{example.description}</p>
                  <p className="text-xs text-green-700 font-medium">
                    Result: {example.result}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4">
          View More Success Stories
        </Button>
      </Card>

      {/* Help Section */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Need help getting started? Check out our{' '}
          <a href="#" className="text-blue-600 hover:underline">documentation</a>
          {' '}or{' '}
          <a href="#" className="text-blue-600 hover:underline">contact support</a>
          {' '}for personalized guidance.
        </p>
      </div>
    </div>
  );
};

export default EmptyStatePackages;

