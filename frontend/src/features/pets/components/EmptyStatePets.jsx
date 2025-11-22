import { Plus, Upload, PawPrint } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const EmptyStatePets = ({ onAddPet, onImport }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full p-8 text-center bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg">
        {/* Icon */}
        <div className="w-16 h-16 bg-gray-100 dark:bg-dark-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
          <PawPrint className="w-8 h-8 text-gray-400" />
        </div>
        
        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
          No pets yet
        </h2>
        
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-6">
          Add your first pet profile to start managing stays, vaccinations, and care notes.
        </p>
        
        {/* Primary CTA */}
        <Button 
          variant="primary" 
          onClick={onAddPet}
          className="mb-3"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add First Pet
        </Button>
        
        {/* Secondary action - only show if import handler exists */}
        {onImport && (
          <div>
            <button
              onClick={onImport}
              className="text-sm text-primary-600 dark:text-primary-500 hover:underline"
            >
              Import from spreadsheet
            </button>
          </div>
        )}
      </Card>
    </div>
  );
  
  /* PRESERVED FOR REFERENCE - Original marketing content removed from UI
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
  
  Best practices content also removed...
  */
};

export default EmptyStatePets;

