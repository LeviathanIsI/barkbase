import { BookOpen, Plus, Upload, Play, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';

const ActionableEmptyState = ({
  category,
  onBrowseTemplates,
  onCreateService,
  onImportServices,
  onWatchTutorial
}) => {
  const getCategoryInfo = (cat) => {
    switch (cat) {
      case 'boarding':
        return {
          title: '🏨 Boarding Services',
          description: 'Overnight accommodations for pets',
          examples: [
            'Standard boarding (size-based pricing)',
            'Suite/premium boarding (luxury amenities)',
            'Cat boarding (separate facilities)',
            'Extended stay discounts (7+ nights)'
          ]
        };
      case 'daycare':
        return {
          title: '🎾 Daycare Services',
          description: 'Daily care and play for pets',
          examples: [
            'Full day daycare (9am-6pm)',
            'Half day daycare (morning/afternoon)',
            'Daycare packages (5, 10, 20 day passes)',
            'Unlimited monthly memberships'
          ]
        };
      case 'grooming':
        return {
          title: '✂️ Grooming Services',
          description: 'Professional pet grooming and spa',
          examples: [
            'Bath & brush (size-based pricing)',
            'Full groom with haircut',
            'Breed-specific grooming styles',
            'Add-on services (nail trim, teeth brushing)'
          ]
        };
      case 'training':
        return {
          title: '🎯 Training Services',
          description: 'Professional pet training programs',
          examples: [
            'Private training sessions',
            'Group training classes',
            'Board and train programs',
            'Behavior modification'
          ]
        };
      case 'add-ons':
        return {
          title: '⭐ Add-on Services',
          description: 'Optional extras for existing services',
          examples: [
            'Extra playtime sessions',
            'Daily photo updates',
            'Webcam access',
            'Medication administration'
          ]
        };
      case 'memberships':
        return {
          title: '🌟 Membership Plans',
          description: 'Recurring revenue through subscriptions',
          examples: [
            'Unlimited daycare memberships',
            'VIP all-access plans',
            'Senior pet discounts',
            'Loyalty rewards programs'
          ]
        };
      default:
        return {
          title: '🏨 Pet Care Services',
          description: 'Professional pet care offerings',
          examples: [
            'Boarding accommodations',
            'Daycare and play services',
            'Grooming and spa treatments',
            'Training and behavior programs'
          ]
        };
    }
  };

  const categoryInfo = getCategoryInfo(category);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No services configured yet</h2>
          <p className="text-gray-600 mb-6">
            Services are the core of your business - boarding, daycare, grooming, and any other offerings you provide.
          </p>
        </div>

        {/* Quick Start Options */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-4 text-center">QUICK START OPTIONS:</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-800">Use Industry Templates</h4>
                  <p className="text-sm text-blue-700">Start with pre-configured services for {categoryInfo.description.toLowerCase()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-800">Create First Service</h4>
                  <p className="text-sm text-green-700">Build your service catalog from scratch</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-purple-800">Import from Spreadsheet</h4>
                  <p className="text-sm text-purple-700">Upload your existing pricing (CSV/Excel)</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-orange-800">Watch Tutorial (3:45)</h4>
                  <p className="text-sm text-orange-700">Learn how to set up services and pricing</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button onClick={onBrowseTemplates} className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Browse Templates
          </Button>
          <Button variant="outline" onClick={onCreateService} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create First Service
          </Button>
          <Button variant="outline" onClick={onImportServices} className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Services
          </Button>
          <Button variant="outline" onClick={onWatchTutorial} className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Watch Tutorial
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help getting started? Check out our{' '}
            <a href="#" className="text-blue-600 hover:underline">documentation</a>
            {' '}or{' '}
            <a href="#" className="text-blue-600 hover:underline">contact support</a>
            {' '}for personalized guidance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActionableEmptyState;
