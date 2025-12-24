/**
 * Property Deletion Wizard
 * Multi-step guided deletion flow with impact analysis and confirmation
 * Steps: Impact Analysis → Cascade Strategy → Confirmation → Execution
 */

import React, { useState } from 'react';
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Textarea from '@/components/ui/Textarea';
import StyledSelect from '@/components/ui/StyledSelect';

const STEPS = [
  { id: 1, title: 'Impact Analysis', description: 'Review affected properties and assets' },
  { id: 2, title: 'Cascade Strategy', description: 'Choose how to handle dependencies' },
  { id: 3, title: 'Confirmation', description: 'Confirm deletion details' },
  { id: 4, title: 'Complete', description: 'Deletion complete' },
];

const CASCADE_STRATEGIES = [
  {
    value: 'cancel',
    label: 'Cancel if Dependencies Exist',
    description: 'Show dependencies and require manual resolution before deleting',
    recommended: true,
  },
  {
    value: 'cascade',
    label: 'Cascade Archive',
    description: 'Recursively archive all dependent properties (reversible)',
    warning: 'This will archive multiple properties',
  },
  {
    value: 'substitute',
    label: 'Substitute Property',
    description: 'Replace with another compatible property',
    requiresSelection: true,
  },
  {
    value: 'force',
    label: 'Force Delete with Broken Dependencies',
    description: 'Delete anyway and mark dependent properties as broken',
    danger: true,
  },
];

export const PropertyDeletionWizard = ({
  open,
  onClose,
  property,
  impactData,
  onDelete,
  compatibleProperties = [],
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [cascadeStrategy, setCascadeStrategy] = useState('cancel');
  const [replacementPropertyId, setReplacementPropertyId] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [countdown, setCountdown] = useState(5);

  if (!property) return null;

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      
      // Start countdown on confirmation step
      if (currentStep === 2) {
        startCountdown();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startCountdown = () => {
    let count = 5;
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(timer);
      }
    }, 1000);
  };

  const handleDelete = () => {
    onDelete({
      propertyId: property.propertyId,
      cascadeStrategy,
      replacementPropertyId: cascadeStrategy === 'substitute' ? replacementPropertyId : null,
      reason: deletionReason,
      confirmed: true,
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        if (cascadeStrategy === 'substitute') {
          return replacementPropertyId !== '';
        }
        return cascadeStrategy !== '';
      case 3:
        return confirmationText === property.propertyName && deletionReason.trim() !== '' && countdown === 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <span>Delete Property: {property.displayLabel}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 dark:text-text-secondary">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`${currentStep >= step.id ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}`}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="py-6 min-h-[300px]">
          {/* Step 1: Impact Analysis */}
          {currentStep === 1 && impactData && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-900">Impact Summary</div>
                    <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                      <li>• {impactData.impactSummary.affectedPropertiesCount} properties will be affected</li>
                      <li>• {impactData.impactSummary.criticalDependenciesCount} critical dependencies exist</li>
                      <li>• {impactData.impactSummary.recordsWithValuesCount.toLocaleString()} records have values</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700 dark:text-text-primary">
                <p>This property deletion will impact {impactData.impactSummary.affectedPropertiesCount} other properties in your system.</p>
                <p className="mt-2">Review the impact and choose an appropriate cascade strategy in the next step.</p>
              </div>
            </div>
          )}

          {/* Step 2: Cascade Strategy */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-sm text-gray-700 dark:text-text-primary mb-4">
                Choose how to handle properties that depend on this one:
              </div>

              <div className="space-y-3">
                {CASCADE_STRATEGIES.map((strategy) => (
                  <div
                    key={strategy.value}
                    className={`border rounded-lg p-4 cursor-pointer ${
                      cascadeStrategy === strategy.value ? 'border-blue-500 bg-blue-50 dark:bg-surface-primary' : 'border-gray-200 dark:border-surface-border'
                    } ${strategy.danger ? 'border-red-300' : ''}`}
                    onClick={() => setCascadeStrategy(strategy.value)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        checked={cascadeStrategy === strategy.value}
                        onChange={() => setCascadeStrategy(strategy.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label className="flex items-center space-x-2 cursor-pointer">
                          <span className="font-medium">{strategy.label}</span>
                          {strategy.recommended && (
                            <span className="text-xs bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                              Recommended
                            </span>
                          )}
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">{strategy.description}</p>
                        {strategy.warning && (
                          <p className="text-sm text-orange-600 mt-1">⚠️ {strategy.warning}</p>
                        )}
                      </div>
                    </div>

                    {strategy.requiresSelection && cascadeStrategy === strategy.value && (
                      <div className="mt-3 pl-7">
                        <Label className="text-sm">Select Replacement Property</Label>
                        <div className="mt-1">
                          <StyledSelect
                            options={[
                              { value: '', label: 'Choose a property...' },
                              ...compatibleProperties.map((prop) => ({
                                value: prop.propertyId,
                                label: `${prop.displayLabel} (${prop.propertyName})`,
                              })),
                            ]}
                            value={replacementPropertyId}
                            onChange={(opt) => setReplacementPropertyId(opt?.value || '')}
                            isClearable={false}
                            isSearchable={true}
                            menuPortalTarget={document.body}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-900 dark:text-red-100">
                    <div className="font-semibold">This action cannot be undone easily</div>
                    <p className="mt-1">The property will be soft-deleted and can be restored within 90 days.</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Type the property name to confirm</Label>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={property.propertyName}
                  className="mt-1 font-mono"
                />
                {confirmationText && confirmationText !== property.propertyName && (
                  <p className="text-xs text-red-600 mt-1">Property name does not match</p>
                )}
              </div>

              <div>
                <Label>Reason for deletion</Label>
                <Textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Explain why you're deleting this property..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {countdown > 0 && (
                <div className="text-center p-4 bg-gray-100 dark:bg-surface-secondary rounded-lg">
                  <div className="text-2xl font-bold text-gray-700 dark:text-text-primary">{countdown}</div>
                  <div className="text-sm text-gray-600 dark:text-text-secondary">Please wait before proceeding...</div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Property Deleted Successfully</h3>
              <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
                The property has been soft-deleted and can be restored within 90 days from the Archived tab.
              </p>
              <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 text-left text-sm">
                <div className="font-semibold mb-2">Next Steps:</div>
                <ul className="space-y-1 text-gray-700 dark:text-text-primary">
                  <li>• Review and update any affected workflows</li>
                  <li>• Check dependent properties for broken references</li>
                  <li>• Update documentation if needed</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {currentStep < 4 && (
          <div className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={currentStep === 1 ? onClose : handleBack}>
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            {currentStep < 3 && (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
              </Button>
            )}
            
            {currentStep === 3 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!canProceed()}
              >
                Delete Property
              </Button>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="border-t pt-4">
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDeletionWizard;

