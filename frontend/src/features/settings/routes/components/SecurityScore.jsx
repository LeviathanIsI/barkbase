import { Shield, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const SecurityScore = () => {
  const securityScore = 60; // Mock score
  const maxScore = 100;

  const recommendations = [
    {
      id: '2fa',
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security',
      points: 30,
      completed: false,
      action: 'Enable Now',
      icon: Shield,
      priority: 'high'
    },
    {
      id: 'backup-payment',
      title: 'Add Backup Payment Method',
      description: 'Prevent service interruptions',
      points: 5,
      completed: false,
      action: 'Add Card',
      icon: AlertTriangle,
      priority: 'medium'
    },
    {
      id: 'strong-password',
      title: 'Strong password',
      description: 'Your password meets all requirements',
      points: 10,
      completed: true,
      icon: CheckCircle,
      priority: 'completed'
    },
    {
      id: 'recent-login',
      title: 'Recent login activity',
      description: 'Last login: Today',
      points: 5,
      completed: true,
      icon: CheckCircle,
      priority: 'completed'
    },
    {
      id: 'multiple-sessions',
      title: 'Multiple active sessions',
      description: 'Consider signing out unused devices',
      points: 5,
      completed: false,
      action: 'Review Sessions',
      icon: AlertTriangle,
      priority: 'low'
    },
    {
      id: 'notifications',
      title: 'Security notifications enabled',
      description: "You'll be alerted of suspicious activity",
      points: 5,
      completed: true,
      icon: CheckCircle,
      priority: 'completed'
    }
  ];

  const getScoreColor = (score) => {
    if (score < 40) return 'text-red-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getScoreLabel = (score) => {
    if (score < 40) return 'Poor';
    if (score < 70) return 'Fair';
    return 'Good';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-surface-primary';
      case 'medium': return 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-surface-primary';
      case 'low': return 'border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-surface-primary';
      default: return 'border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-surface-primary';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
      case 'medium':
      case 'low':
        return AlertTriangle;
      default:
        return CheckCircle;
    }
  };

  return (
    <Card className="bg-primary-50 dark:bg-surface-primary border-blue-200 dark:border-blue-900/30">
      <div className="flex items-center gap-4 mb-6">
        <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        <div>
          <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Security Score</h2>
          <p className="text-blue-700 dark:text-blue-300">See how well your account is protected</p>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-primary rounded-lg p-6 border border-blue-200 dark:border-blue-900/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-text-primary">
              {securityScore}/{maxScore}
            </div>
            <div className={`text-lg font-medium ${getScoreColor(securityScore)}`}>
              {getScoreLabel(securityScore)}
            </div>
          </div>
          <div className="w-32 h-8 bg-gray-200 dark:bg-surface-border rounded-full overflow-hidden">
            <div
              className={`h-full ${securityScore < 40 ? 'bg-red-50 dark:bg-red-950/20' : securityScore < 70 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-green-50 dark:bg-green-950/20'}`}
              style={{ width: `${(securityScore / maxScore) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-gray-600 dark:text-text-secondary">
          You're doing well, but there's room for improvement.
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Recommendations</h3>
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const Icon = rec.icon;
            const PriorityIcon = getPriorityIcon(rec.priority);

            return (
              <div
                key={rec.id}
                className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-gray-600 dark:text-text-secondary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-text-primary">{rec.title}</h4>
                      {rec.points && !rec.completed && (
                        <Badge variant="primary" className="text-xs">
                          +{rec.points} points
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-text-secondary mb-3">{rec.description}</p>
                    {!rec.completed && rec.action && (
                      <Button size="sm" variant="outline">
                        {rec.action}
                      </Button>
                    )}
                  </div>
                  {rec.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <PriorityIcon className="w-5 h-5 text-gray-500 dark:text-text-secondary flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default SecurityScore;
