import { useState } from 'react';
import { Brain, RefreshCw, Check, X, AlertTriangle, TrendingUp, Move } from 'lucide-react';
import Button from '@/components/ui/Button';

const SmartSchedulingAssistant = () => {
  const [recommendations, setRecommendations] = useState([
    {
      id: 1,
      type: 'optimization',
      icon: Move,
      priority: 'high',
      title: '🔄 OPTIMIZE RUN ASSIGNMENTS',
      description: 'Moving Rocky (K-1) to Outdoor-1 frees up large indoor run for incoming Great Dane on Friday',
      impact: 'Avoid double-booking large runs',
      actions: ['Apply Change', 'Dismiss'],
      applied: false,
      dismissed: false
    },
    {
      id: 2,
      type: 'revenue',
      icon: TrendingUp,
      priority: 'medium',
      title: '💰 REVENUE OPPORTUNITY',
      description: 'Thursday has 2 open slots - consider last-minute discount 20% off = likely +$80 revenue vs empty kennels',
      impact: 'Potential $80 additional revenue',
      actions: ['Create Promotion', 'Dismiss'],
      applied: false,
      dismissed: false
    },
    {
      id: 3,
      type: 'conflict',
      icon: AlertTriangle,
      priority: 'high',
      title: '⚠️ CONFLICT WARNING',
      description: 'Bella and Luna are both dog-reactive and scheduled for overlapping daycare time on Wednesday',
      impact: 'Potential behavioral issues',
      actions: ['Adjust Schedule', 'Contact Owner', 'View Details'],
      applied: false,
      dismissed: false
    },
    {
      id: 4,
      type: 'balancing',
      icon: RefreshCw,
      priority: 'low',
      title: '📊 CAPACITY BALANCING',
      description: 'Your weekend is 95% booked but Mon-Wed is only 68% - consider midweek promotion or adjust pricing',
      impact: 'Better capacity utilization',
      actions: ['View Strategy', 'Dismiss'],
      applied: false,
      dismissed: false
    }
  ]);

  const handleAction = (recId, action) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === recId
          ? {
              ...rec,
              applied: action === 'apply' || action === 'create' || action === 'adjust' || action === 'view',
              dismissed: action === 'dismiss'
            }
          : rec
      )
    );
  };

  const activeRecommendations = recommendations.filter(rec => !rec.applied && !rec.dismissed);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-surface-primary';
      case 'medium': return 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-surface-primary';
      default: return 'border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-surface-primary';
    }
  };

  if (activeRecommendations.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Check className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">All Set! 🎉</h3>
            <p className="text-sm text-green-700">No scheduling optimizations needed at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">🤖 SMART SCHEDULING ASSISTANT</h3>
          <p className="text-sm text-gray-600 dark:text-text-secondary">AI-powered suggestions to optimize your schedule</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-text-primary">Active Recommendations:</h4>

        {activeRecommendations.map((rec) => {
          const Icon = rec.icon;
          return (
            <div key={rec.id} className={`border-l-4 rounded-r-lg p-4 ${getPriorityColor(rec.priority)}`}>
              <div className="flex items-start gap-4">
                <Icon className={`w-5 h-5 flex-shrink-0 mt-1 ${
                  rec.priority === 'high' ? 'text-red-600' :
                  rec.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600 dark:text-blue-400'
                }`} />

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-1">{rec.title}</h4>
                  <p className="text-sm text-gray-700 dark:text-text-primary mb-2">{rec.description}</p>
                  <div className="text-xs text-gray-600 dark:text-text-secondary mb-3">
                    <strong>Impact:</strong> {rec.impact}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {rec.actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action === 'Dismiss' ? 'outline' : 'default'}
                        onClick={() => handleAction(rec.id, action.toLowerCase().replace(' ', ''))}
                        className="text-xs"
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-surface-border">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600 dark:text-text-secondary">
            <span>Last analyzed: 5 minutes ago</span>
            <span className="mx-2">•</span>
            <span>{activeRecommendations.length} recommendations pending</span>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Applied Actions Summary */}
      {recommendations.some(rec => rec.applied) && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <Check className="w-4 h-4" />
            <span>
              {recommendations.filter(rec => rec.applied).length} optimizations applied this session
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSchedulingAssistant;
