import { Lightbulb, TrendingUp, DollarSign, Package, Target, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';

const SmartRecommendations = ({ services }) => {
  const recommendations = [
    {
      id: 'weekend-pricing',
      type: 'high-impact',
      icon: TrendingUp,
      title: 'Add Weekend Premium Pricing',
      description: 'Friday-Sunday slots book at 98% capacity while weekdays average 67%. Add $10 weekend surcharge.',
      impact: '+$1,200/month',
      timeToImplement: '5 minutes',
      risk: 'Low',
      action: 'Implement Now'
    },
    {
      id: 'daycare-packages',
      type: 'medium-impact',
      icon: Package,
      title: 'Create Daycare Package Deals',
      description: '67% of your daycare customers visit 8+ times per month. Create 10-pack and 20-pack deals.',
      impact: '+$850/month',
      timeToImplement: '10 minutes',
      risk: 'Low',
      action: 'Create Packages'
    },
    {
      id: 'bath-addon-visibility',
      type: 'quick-win',
      icon: Target,
      title: 'Increase "Bath & Brush" Add-on Visibility',
      description: 'Only 12% of boarding customers add a bath, but 67% who see it accept. Make it default-selected.',
      impact: '+$400/month',
      timeToImplement: '2 minutes',
      risk: 'Low',
      action: 'Enable Default Selection'
    },
    {
      id: 'grooming-surge-pricing',
      type: 'advanced',
      icon: Zap,
      title: 'Implement Grooming Surge Pricing',
      description: 'Grooming books out 2 weeks in advance. Consider 15% premium for same-week appointments.',
      impact: '+$600/month',
      timeToImplement: '15 minutes',
      risk: 'Medium',
      action: 'Setup Dynamic Pricing'
    }
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'high-impact':
        return 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-surface-primary';
      case 'medium-impact':
        return 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-surface-primary';
      case 'quick-win':
        return 'border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-surface-primary';
      case 'advanced':
        return 'border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-surface-primary';
      default:
        return 'border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'high-impact':
        return 'HIGH IMPACT';
      case 'medium-impact':
        return 'MEDIUM IMPACT';
      case 'quick-win':
        return 'QUICK WIN';
      case 'advanced':
        return 'ADVANCED';
      default:
        return '';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600 dark:text-text-secondary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Lightbulb className="w-6 h-6 text-yellow-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Smart Recommendations</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const Icon = rec.icon;
          return (
            <div key={rec.id} className={`border rounded-lg p-6 ${getTypeColor(rec.type)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-600 dark:text-text-secondary" />
                  <span className="text-xs font-bold text-gray-700 dark:text-text-primary">
                    {getTypeLabel(rec.type)}
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-2">{rec.title}</h3>
              <p className="text-sm text-gray-700 dark:text-text-primary mb-4">{rec.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-text-secondary">Estimated impact:</span>
                  <span className="font-medium text-green-600">{rec.impact}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-text-secondary">Implementation time:</span>
                  <span className="font-medium">{rec.timeToImplement}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-text-secondary">Risk:</span>
                  <span className={`font-medium ${getRiskColor(rec.risk)}`}>{rec.risk}</span>
                </div>
              </div>

              <Button size="sm" className="w-full">
                {rec.action}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-6">
        <Button variant="outline">
          View All Recommendations
        </Button>
      </div>
    </div>
  );
};

export default SmartRecommendations;
