import { Plus, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const EmptyStatePets = ({ onAddPet, onImport }) => {
  const benefits = [
    {
      icon: CheckCircle,
      title: 'Complete Pet Profiles',
      description: 'Track medical history, vaccinations, dietary needs, and behavioral notes all in one place'
    },
    {
      icon: AlertCircle,
      title: 'Automated Reminders',
      description: 'Never miss vaccination expiration dates with automatic alerts and owner notifications'
    },
    {
      icon: FileText,
      title: 'Seamless Booking',
      description: 'Pre-filled pet information speeds up check-in and ensures staff have all care details'
    }
  ];

  const quickStartSteps = [
    { step: 1, title: 'Add Basic Info', description: 'Name, breed, age, and owner' },
    { step: 2, title: 'Upload Records', description: 'Vaccination and medical documents' },
    { step: 3, title: 'Set Preferences', description: 'Dietary needs and special care notes' },
    { step: 4, title: 'Ready to Book', description: 'Start scheduling stays and services' }
  ];

  return (
    <div className="space-y-8">
      {/* Why Pet Profiles Matter */}
      <Card className="p-8 bg-gray-50 dark:bg-surface-secondary border-gray-200 dark:border-surface-border">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">
              Why Detailed Pet Profiles Matter
            </h2>
            <p className="text-gray-700 dark:text-text-primary">
              Complete pet profiles ensure safety, streamline operations, and build trust with pet parents
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-1">{benefit.title}</h3>
                    <p className="text-sm text-gray-700 dark:text-text-primary">{benefit.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Get Started */}
      <Card className="p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary mb-2">Get Started</h2>
        <p className="text-gray-600 dark:text-text-secondary mb-6">
          No pets yet. Add your first pet profile to start managing your facility.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Add */}
          <div className="border-2 border-gray-200 dark:border-surface-border rounded-lg p-6 bg-gray-50 dark:bg-surface-secondary">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-text-primary">QUICK ADD</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-text-primary mb-4">
              Add a single pet manually with a guided form
            </p>

            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-900 dark:text-text-primary text-sm">Quick Start Guide:</h4>
              {quickStartSteps.map((item) => (
                <div key={item.step} className="bg-white dark:bg-surface-primary rounded-lg p-3 border border-gray-200 dark:border-surface-border">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">{item.step}</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-text-primary text-sm">{item.title}</h5>
                      <p className="text-xs text-gray-600 dark:text-text-secondary">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={onAddPet}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Pet
            </Button>
          </div>

          {/* Bulk Import */}
          <div className="border-2 border-gray-200 dark:border-surface-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-text-primary">BULK IMPORT</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
              Import multiple pets at once from a spreadsheet or your previous system
            </p>

            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-gray-900 dark:text-text-primary text-sm">Import from:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span>CSV/Excel Spreadsheet</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span>Previous kennel software</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span>Vet practice management system</span>
                </div>
              </div>
            </div>

            <Button variant="secondary" className="w-full mb-2" onClick={onImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import Pets
            </Button>
            <Button variant="secondary" className="w-full" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
      </Card>

      {/* Best Practices */}
      <Card className="p-8 bg-gray-50 dark:bg-surface-secondary border-gray-200 dark:border-surface-border">
        <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary mb-4">
          Best Practices for Pet Profiles
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary">Always Include:</h3>
            <ul className="space-y-1 text-gray-700 dark:text-text-primary">
              <li>• Up-to-date vaccination records with expiration dates</li>
              <li>• Emergency vet contact information</li>
              <li>• Dietary restrictions and feeding instructions</li>
              <li>• Behavioral notes (reactive, shy, friendly, etc.)</li>
              <li>• Medication requirements with dosage</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary">Pro Tips:</h3>
            <ul className="space-y-1 text-gray-700 dark:text-text-primary">
              <li>• Upload clear photos for easy identification</li>
              <li>• Keep microchip numbers and registration current</li>
              <li>• Document special care requirements in detail</li>
              <li>• Note any previous incidents or health issues</li>
              <li>• Update profiles after each visit with new observations</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Help Section */}
      <div className="text-center pt-4 border-t border-gray-200 dark:border-surface-border">
        <p className="text-sm text-gray-500 dark:text-text-secondary">
          Need help setting up pet profiles?{' '}
          <a href="#" className="text-primary-600 hover:underline">Watch tutorial</a>
          {' '}or{' '}
          <a href="#" className="text-primary-600 hover:underline">contact support</a>
          {' '}for personalized guidance.
        </p>
      </div>
    </div>
  );
};

export default EmptyStatePets;

