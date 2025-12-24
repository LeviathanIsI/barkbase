import { FolderOpen, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

const GroupsTab = () => {
  const suggestedGroups = [
    {
      name: 'Basic Information',
      description: '(name, breed, age, weight)',
      icon: '📋'
    },
    {
      name: 'Medical & Health',
      description: '(medications, conditions, vet info)',
      icon: '💊'
    },
    {
      name: 'Behavior & Temperament',
      description: '(flags, training level, quirks)',
      icon: '🎯'
    },
    {
      name: 'Food & Diet',
      description: '(dietary restrictions, feeding schedule)',
      icon: '🍖'
    },
    {
      name: 'Emergency Contacts',
      description: '(backup contacts, authorization)',
      icon: '📞'
    },
    {
      name: 'Preferences',
      description: '(run type, daycare group, special requests)',
      icon: '🏠'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-surface-primary rounded-lg border border-gray-200 dark:border-surface-border p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">Property Groups</h2>
          <p className="text-gray-600 dark:text-text-secondary mb-4">
            Organize properties into collapsible sections
          </p>
          <p className="text-sm text-gray-500 dark:text-text-secondary">
            Example: Group all medical fields together
          </p>
        </div>

        <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-green-900 mb-4">SUGGESTED GROUPS:</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedGroups.map((group, index) => (
              <div key={index} className="bg-white dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-4 text-center hover:shadow-sm transition-shadow">
                <div className="text-2xl mb-2">{group.icon}</div>
                <h4 className="font-medium text-green-800 mb-1">{group.name}</h4>
                <p className="text-sm text-green-700">{group.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Property Group
          </Button>

          <p className="text-sm text-gray-500 dark:text-text-secondary">
            Groups help organize related fields into sections on forms and profiles, making them easier to navigate.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GroupsTab;
