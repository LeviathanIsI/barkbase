import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Step 1: Facility Basics
const Step1FacilityBasics = ({ data, onUpdate, onNext }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-2">Facility Information</h3>
      <p className="text-gray-600 dark:text-text-secondary">Let's start with basic information about your facility.</p>
    </div>

    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
          Facility Name
        </label>
        <input
          type="text"
          value={data.facilityName || ''}
          onChange={(e) => onUpdate({ facilityName: e.target.value })}
          placeholder="Happy Paws Boarding & Daycare"
          className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
          Facility Size
        </label>
        <select
          value={data.facilitySize || 'medium'}
          onChange={(e) => onUpdate({ facilitySize: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="small">Small (1-15 accommodations)</option>
          <option value="medium">Medium (16-40 accommodations)</option>
          <option value="large">Large (41-80 accommodations)</option>
          <option value="xl">Extra Large (80+ accommodations)</option>
        </select>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-3">
        Facility Type (You can offer multiple services)
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          { key: 'boarding', label: 'Boarding (overnight stays)', desc: 'Perfect for vacations, business trips' },
          { key: 'daycare', label: 'Daycare (daytime only)', desc: 'Regular socialization, work days' },
          { key: 'grooming', label: 'Grooming', desc: 'Bath, haircut, nail trim' },
          { key: 'training', label: 'Training', desc: 'Obedience classes, behavior training' }
        ].map(service => (
          <label key={service.key} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-surface-border rounded-lg hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={data.services?.includes(service.key) || false}
              onChange={(e) => {
                const services = data.services || [];
                if (e.target.checked) {
                  onUpdate({ services: [...services, service.key] });
                } else {
                  onUpdate({ services: services.filter(s => s !== service.key) });
                }
              }}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-text-primary">{service.label}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">{service.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-3">
        Primary Species (Check all that apply)
      </label>
      <div className="grid gap-2 md:grid-cols-3">
        {[
          { key: 'dogs', label: 'Dogs' },
          { key: 'cats', label: 'Cats' },
          { key: 'small_animals', label: 'Small animals (rabbits, guinea pigs, etc.)' },
          { key: 'birds', label: 'Birds' },
          { key: 'reptiles', label: 'Reptiles' }
        ].map(species => (
          <label key={species.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.species?.includes(species.key) || false}
              onChange={(e) => {
                const speciesList = data.species || [];
                if (e.target.checked) {
                  onUpdate({ species: [...speciesList, species.key] });
                } else {
                  onUpdate({ species: speciesList.filter(s => s !== species.key) });
                }
              }}
            />
            <span className="text-sm">{species.label}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
        <Check className="w-5 h-5" />
        <span className="font-medium">This information helps customers know when they can drop off and pick up their pets</span>
      </div>
    </div>
  </div>
);

// Step 2: Hours of Operation
const Step2Hours = ({ data, onUpdate, onNext, onBack }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-2">Hours of Operation</h3>
      <p className="text-gray-600 dark:text-text-secondary">Set your operating hours for check-ins and check-outs.</p>
    </div>

    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Check-in Hours</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-700 dark:text-text-primary mb-1">Weekdays</label>
            <div className="flex gap-2">
              <input
                type="time"
                value={data.checkInHours?.weekdays?.start || '08:00'}
                onChange={(e) => onUpdate({
                  checkInHours: {
                    ...data.checkInHours,
                    weekdays: { ...data.checkInHours?.weekdays, start: e.target.value }
                  }
                })}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              />
              <span className="self-center text-gray-500 dark:text-text-secondary">to</span>
              <input
                type="time"
                value={data.checkInHours?.weekdays?.end || '20:00'}
                onChange={(e) => onUpdate({
                  checkInHours: {
                    ...data.checkInHours,
                    weekdays: { ...data.checkInHours?.weekdays, end: e.target.value }
                  }
                })}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-text-primary mb-1">Weekends</label>
            <div className="flex gap-2">
              <input
                type="time"
                value={data.checkInHours?.weekends?.start || '09:00'}
                onChange={(e) => onUpdate({
                  checkInHours: {
                    ...data.checkInHours,
                    weekends: { ...data.checkInHours?.weekends, start: e.target.value }
                  }
                })}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              />
              <span className="self-center text-gray-500 dark:text-text-secondary">to</span>
              <input
                type="time"
                value={data.checkInHours?.weekends?.end || '18:00'}
                onChange={(e) => onUpdate({
                  checkInHours: {
                    ...data.checkInHours,
                    weekends: { ...data.checkInHours?.weekends, end: e.target.value }
                  }
                })}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Check-out Hours</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-700 dark:text-text-primary mb-1">Weekdays</label>
            <div className="flex gap-2">
              <input
                type="time"
                value={data.checkOutHours?.weekdays?.start || '08:00'}
                onChange={(e) => onUpdate({
                  checkOutHours: {
                    ...data.checkOutHours,
                    weekdays: { ...data.checkOutHours?.weekdays, start: e.target.value }
                  }
                })}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              />
              <span className="self-center text-gray-500 dark:text-text-secondary">to</span>
              <input
                type="time"
                value={data.checkOutHours?.weekdays?.end || '12:00'}
                onChange={(e) => onUpdate({
                  checkOutHours: {
                    ...data.checkOutHours,
                    weekdays: { ...data.checkOutHours?.weekdays, end: e.target.value }
                  }
                })}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-text-primary mb-1">Weekends</label>
            <div className="flex gap-2">
              <input
                type="time"
                value={data.checkOutHours?.weekends?.start || '09:00'}
                onChange={(e) => onUpdate({
                  checkOutHours: {
                    ...data.checkOutHours,
                    weekends: { ...data.checkOutHours?.weekends, start: e.target.value }
                  }
                })}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              />
              <span className="self-center text-gray-500 dark:text-text-secondary">to</span>
              <input
                type="time"
                value={data.checkOutHours?.weekends?.end || '12:00'}
                onChange={(e) => onUpdate({
                  checkOutHours: {
                    ...data.checkOutHours,
                    weekends: { ...data.checkOutHours?.weekends, end: e.target.value }
                  }
                })}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.sameHoursEveryDay || false}
            onChange={(e) => onUpdate({ sameHoursEveryDay: e.target.checked })}
          />
          <span className="text-sm text-gray-700 dark:text-text-primary">Same hours every day (override above)</span>
        </label>
      </div>
    </div>
  </div>
);

// Step 3: Kennel Configuration
const Step3Kennels = ({ data, onUpdate, onNext, onBack }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-2">Kennel Configuration</h3>
      <p className="text-gray-600 dark:text-text-secondary">Configure your boarding kennels/runs/suites.</p>
    </div>

    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-900 dark:text-text-primary mb-4">Boarding Kennels (For Dogs)</h4>
        <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">How many boarding kennels do you have?</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { key: 'smallKennels', label: 'Small Kennels', desc: 'up to 25 lbs', examples: 'Chihuahua, Yorkie' },
            { key: 'mediumKennels', label: 'Medium Kennels', desc: '25-60 lbs', examples: 'Beagle, Cocker' },
            { key: 'largeKennels', label: 'Large Kennels', desc: '60-90 lbs', examples: 'Lab, Golden' },
            { key: 'xlKennels', label: 'X-Large Kennels', desc: '90+ lbs', examples: 'Great Dane, Mastiff' }
          ].map(kennel => (
            <div key={kennel.key} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
              <h5 className="font-medium text-gray-900 dark:text-text-primary mb-2">{kennel.label}</h5>
              <p className="text-sm text-gray-600 dark:text-text-secondary mb-1">{kennel.desc}</p>
              <p className="text-xs text-gray-500 dark:text-text-secondary mb-3">Examples: {kennel.examples}</p>
              <input
                type="number"
                min="0"
                value={data.kennels?.[kennel.key] || 0}
                onChange={(e) => onUpdate({
                  kennels: {
                    ...data.kennels,
                    [kennel.key]: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-center"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">Quantity</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-2">Luxury Suites</h5>
          <p className="text-sm text-gray-600 dark:text-text-secondary mb-3">Premium accommodations with extra amenities</p>
          <input
            type="number"
            min="0"
            value={data.kennels?.luxurySuites || 0}
            onChange={(e) => onUpdate({
              kennels: {
                ...data.kennels,
                luxurySuites: parseInt(e.target.value) || 0
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-center"
            placeholder="0"
          />
          <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">Suites</p>
        </div>

        <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-2">Outdoor Runs</h5>
          <p className="text-sm text-gray-600 dark:text-text-secondary mb-3">Weather-dependent outdoor kennels</p>
          <input
            type="number"
            min="0"
            value={data.kennels?.outdoorRuns || 0}
            onChange={(e) => onUpdate({
              kennels: {
                ...data.kennels,
                outdoorRuns: parseInt(e.target.value) || 0
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-center"
            placeholder="0"
          />
          <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">Runs</p>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Cat Boarding (Optional)</h4>
        <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">Do you board cats separately?</p>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm text-gray-700 dark:text-text-primary mb-1">Cat Condos</label>
            <input
              type="number"
              min="0"
              value={data.kennels?.catCondos || 0}
              onChange={(e) => onUpdate({
                kennels: {
                  ...data.kennels,
                  catCondos: parseInt(e.target.value) || 0
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-center"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-text-primary mb-1">Max cats per area</label>
            <input
              type="number"
              min="1"
              value={data.kennels?.maxCatsPerArea || 8}
              onChange={(e) => onUpdate({
                kennels: {
                  ...data.kennels,
                  maxCatsPerArea: parseInt(e.target.value) || 8
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-center"
            />
          </div>
        </div>
      </div>
    </div>

    <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
        <Check className="w-5 h-5" />
        <span className="font-medium">We'll use these numbers to prevent overbooking and optimize your facility utilization</span>
      </div>
    </div>
  </div>
);

const SetupWizard = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState({
    facilityName: '',
    services: ['boarding', 'daycare'],
    species: ['dogs'],
    facilitySize: 'medium',
    checkInHours: {
      weekdays: { start: '08:00', end: '20:00' },
      weekends: { start: '09:00', end: '18:00' }
    },
    checkOutHours: {
      weekdays: { start: '08:00', end: '12:00' },
      weekends: { start: '09:00', end: '12:00' }
    },
    sameHoursEveryDay: false,
    kennels: {
      smallKennels: 5,
      mediumKennels: 8,
      largeKennels: 6,
      xlKennels: 3,
      luxurySuites: 2,
      outdoorRuns: 4,
      catCondos: 6,
      maxCatsPerArea: 8
    }
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(setupData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (updates) => {
    setSetupData(prev => ({ ...prev, ...updates }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Quick Setup Wizard</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-text-primary">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-500 dark:text-text-secondary">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <Step1FacilityBasics data={setupData} onUpdate={updateData} onNext={handleNext} />
          )}
          {currentStep === 2 && (
            <Step2Hours data={setupData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 3 && (
            <Step3Kennels data={setupData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Cancel Setup
          </Button>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button onClick={handleNext}>
            {currentStep === totalSteps ? 'Complete Setup' : 'Next'}
            {currentStep < totalSteps && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
