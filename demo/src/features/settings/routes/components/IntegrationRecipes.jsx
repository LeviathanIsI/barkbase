import { Zap, Mail, CreditCard, Phone, Calendar, Camera } from 'lucide-react';
import Button from '@/components/ui/Button';

const IntegrationRecipes = () => {
  const recipes = [
    {
      icon: Mail,
      title: 'Send welcome email to new customers',
      description: 'Uses: Mailchimp',
      trigger: 'Customer created',
      action: 'Add to "New Customers" list + send welcome email',
      actionType: 'enable'
    },
    {
      icon: CreditCard,
      title: 'Create invoice immediately on booking',
      description: 'Uses: QuickBooks Online',
      trigger: 'Booking confirmed',
      action: 'Create invoice + send to customer',
      actionType: 'enable'
    },
    {
      icon: Phone,
      title: 'Notify team on Slack for new bookings',
      description: 'Uses: Slack',
      trigger: 'New booking created',
      action: 'Post message to #bookings channel',
      actionType: 'enable'
    },
    {
      icon: Camera,
      title: 'Auto-verify vaccinations from vet',
      description: 'Uses: VetVerify',
      trigger: 'Pet added or vaccination expiring',
      action: 'Pull latest records from vet clinic',
      actionType: 'enable'
    },
    {
      icon: Calendar,
      title: 'Sync bookings to Google Calendar',
      description: 'Uses: Google Calendar',
      trigger: 'Booking created/updated',
      action: 'Create/update calendar event',
      actionType: 'enable'
    }
  ];

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-6 h-6 text-yellow-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Popular Automation Recipes</h2>
          <p className="text-sm text-gray-600 dark:text-text-secondary">Pre-built workflows you can enable with one click</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {recipes.map((recipe, index) => {
          const Icon = recipe.icon;
          return (
            <div key={index} className="border border-gray-200 dark:border-surface-border rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-text-primary text-sm">{recipe.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-text-secondary mt-1">{recipe.description}</p>
                </div>
              </div>

              <div className="text-xs text-gray-600 dark:text-text-secondary space-y-1 mb-4">
                <div><strong>Trigger:</strong> {recipe.trigger}</div>
                <div><strong>Action:</strong> {recipe.action}</div>
              </div>

              <Button size="sm" className="w-full">
                {recipe.actionType === 'enable' ? 'Enable Recipe' : 'Configure'}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <Button variant="outline">
          Browse All Recipes (27)
        </Button>
      </div>
    </div>
  );
};

export default IntegrationRecipes;
