import { GitBranch, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

const ConditionalLogicTab = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-surface-primary rounded-lg border border-gray-200 dark:border-surface-border p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">Conditional Logic</h2>
          <p className="text-gray-600 dark:text-text-secondary mb-4">
            Show/hide fields based on other selections
          </p>
          <p className="text-sm text-gray-500 dark:text-text-secondary">
            Example: Only show "Crate Size" if pet is crate-trained
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">COMMON USE CASES:</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Show "Medication Instructions" only if "Requires Medication" is checked</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Show "Separation Anxiety Notes" only if behavioral flag includes "Anxious"</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Show "Suite Preference" only if booking type is "Boarding"</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Show "Pick-up Authorization" only if owner is different from booking contact</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Benefits:</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Reduce form clutter and confusion</li>
                <li>• Prevent irrelevant questions</li>
                <li>• Improve completion rates</li>
                <li>• Ensure all necessary information is collected</li>
                <li>• Professional, guided user experience</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Conditional Rule
          </Button>

          <p className="text-sm text-gray-500 dark:text-text-secondary">
            Need help setting up conditional logic?{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Watch our tutorial</a>
            {' '}or{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">contact support</a>
            {' '}for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConditionalLogicTab;
