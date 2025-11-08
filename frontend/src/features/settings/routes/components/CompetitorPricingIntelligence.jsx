import { Eye, MapPin, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

const CompetitorPricingIntelligence = ({ services }) => {
  // Mock competitor data
  const competitors = [
    { name: 'Happy Tails Kennel', distance: '2.3 miles', rating: 4.2, price: 42 },
    { name: 'Paws & Claws Resort', distance: '3.1 miles', rating: 4.5, price: 48 },
    { name: 'Doggy Paradise', distance: '4.7 miles', rating: 3.9, price: 35 },
    { name: 'Pet Palace Inn', distance: '5.2 miles', rating: 4.1, price: 52 }
  ];

  const yourPrice = 45;
  const marketAverage = 44;
  const marketLow = 35;
  const marketHigh = 52;

  const getPositionText = (yourPrice, marketAverage) => {
    const diff = ((yourPrice - marketAverage) / marketAverage) * 100;
    if (Math.abs(diff) < 5) return 'Competitive';
    if (diff > 0) return `${diff.toFixed(0)}% above market`;
    return `${Math.abs(diff).toFixed(0)}% below market`;
  };

  const position = getPositionText(yourPrice, marketAverage);

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Competitive Intelligence</h2>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Track competitor pricing in your area</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-text-secondary">Last updated: 2h ago</span>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Market Position Overview */}
      <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-text-primary mb-2">Market Position</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-text-primary">${marketLow}</div>
            <div className="text-xs text-gray-600 dark:text-text-secondary">Market Low</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${yourPrice}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Your Price</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-text-primary">${marketAverage}</div>
            <div className="text-xs text-gray-600 dark:text-text-secondary">Market Avg</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-text-primary">${marketHigh}</div>
            <div className="text-xs text-gray-600 dark:text-text-secondary">Market High</div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <span className="text-sm text-gray-700 dark:text-text-primary">
            Your Position: <span className="font-medium text-green-600">{position}</span>
          </span>
        </div>
      </div>

      {/* Price Comparison Chart */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4">Standard Boarding Comparison</h3>
        <div className="space-y-3">
          {competitors.map((competitor, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-secondary rounded">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white dark:bg-surface-primary rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-gray-400 dark:text-text-tertiary" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-text-primary">{competitor.name}</div>
                  <div className="text-xs text-gray-600 dark:text-text-secondary">{competitor.distance} • ⭐ {competitor.rating}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-text-primary">${competitor.price}</div>
                <div className="text-xs text-gray-600 dark:text-text-secondary">per night</div>
              </div>
            </div>
          ))}

          {/* Your position */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-surface-primary border-2 border-blue-200 dark:border-blue-900/30 rounded">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">YOU</span>
              </div>
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">BarkBase</div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Your facility</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-blue-900 dark:text-blue-100">${yourPrice}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">per night</div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900 mb-1">Market Insights</h4>
            <p className="text-sm text-green-800 mb-2">
              You're positioned competitively at 6% below market average. This gives you strong value positioning while maintaining healthy margins.
            </p>
            <p className="text-sm text-green-800">
              💡 Consider highlighting your quality amenities and service to justify the value proposition to price-sensitive customers.
            </p>
          </div>
        </div>
      </div>

      {/* Opportunities */}
      <div className="mt-4 p-4 bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">Pricing Opportunities</h4>
            <p className="text-sm text-yellow-800 mb-2">
              3 competitors offer 10-pack daycare discounts, but you don't. This could be a competitive advantage.
            </p>
            <Button variant="outline" size="sm" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:bg-surface-primary">
              Create 10-Pack Pricing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorPricingIntelligence;
