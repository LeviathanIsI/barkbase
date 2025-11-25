import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

const IntegrationSetupModal = ({ isOpen, onClose, integration }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen || !integration) return null;

  const steps = integration.setupSteps || ['authorize', 'configure', 'complete'];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
              Connect {integration.name}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-surface-border text-gray-600 dark:text-text-secondary'
                  }`}>
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-surface-border'}`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary mt-2">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">{integration.icon}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">
              {currentStep === 0 ? 'Authorize Connection' : currentStep === 1 ? 'Configure Settings' : 'Setup Complete'}
            </h3>
            <p className="text-gray-600 dark:text-text-secondary">
              {currentStep === 0
                ? `Grant BarkBase access to your ${integration.name} account`
                : currentStep === 1
                ? 'Configure sync settings and mappings'
                : 'Your integration is now active and syncing'
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[var(--bb-space-3)] p-[var(--bb-space-6)] border-t border-[var(--bb-color-border-subtle)]">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetupModal;
