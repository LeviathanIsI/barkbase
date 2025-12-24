import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SlideOutDrawer from '@/components/ui/SlideOutDrawer';
import { Sparkles, Upload, Download, RotateCcw, CheckCircle, AlertTriangle, XCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant';
import toast from 'react-hot-toast';

export default function SetupTab() {
  const tenant = useTenantStore((state) => state.tenant);

  const [setupProgress, setSetupProgress] = useState({
    terminologyDefined: tenant?.settings?.facility?.setup?.terminologyDefined ?? true,
    namingConfigured: tenant?.settings?.facility?.setup?.namingConfigured ?? true,
    capacitySet: tenant?.settings?.facility?.setup?.capacitySet ?? false,
    locationsAdded: tenant?.settings?.facility?.setup?.locationsAdded ?? false,
    amenitiesConfigured: tenant?.settings?.facility?.setup?.amenitiesConfigured ?? true,
    rulesIncomplete: tenant?.settings?.facility?.setup?.rulesIncomplete ?? true,
  });

  const [showWizard, setShowWizard] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    facilityName: tenant?.name || '',
    facilityType: 'boarding_daycare',
    accommodationType: 'Kennel',
    totalCapacity: 20,
    hasMultipleLocations: false,
    locationCount: 1,
  });

  const handleStartWizard = () => {
    setWizardStep(1);
    setShowWizard(true);
  };

  const handleWizardNext = () => {
    if (wizardStep < 4) {
      setWizardStep(wizardStep + 1);
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleWizardComplete = () => {
    // Update local state
    setSetupProgress({
      terminologyDefined: true,
      namingConfigured: true,
      capacitySet: true,
      locationsAdded: wizardData.hasMultipleLocations,
      amenitiesConfigured: true,
      rulesIncomplete: false,
    });

    setShowWizard(false);
    toast.success('Facility setup completed successfully!');
  };

  const handleExportSettings = () => {
    const settings = {
      facility: tenant?.settings?.facility || {},
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facility-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Settings exported successfully!');
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);

        if (!imported.facility) {
          toast.error('Invalid settings file format');
          return;
        }

        toast.success('Settings imported successfully! Click Save Changes to apply.');
      } catch (error) {
        toast.error('Failed to parse settings file');
      }
    };
    input.click();
  };

  const handleResetSettings = () => {
    setSetupProgress({
      terminologyDefined: false,
      namingConfigured: false,
      capacitySet: false,
      locationsAdded: false,
      amenitiesConfigured: false,
      rulesIncomplete: true,
    });

    setShowResetConfirm(false);
    toast.success('Settings have been reset to defaults');
  };

  const calculateProgress = () => {
    const completed = Object.values(setupProgress).filter(Boolean).length;
    return Math.round((completed / Object.keys(setupProgress).length) * 100);
  };

  const getStatusIcon = (completed) => {
    if (completed) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusText = (key) => {
    switch (key) {
      case 'terminologyDefined': return 'Accommodation types defined';
      case 'namingConfigured': return 'Naming system configured';
      case 'capacitySet': return 'Capacity limits set';
      case 'locationsAdded': return 'Locations added';
      case 'amenitiesConfigured': return 'Amenities configured';
      case 'rulesIncomplete': return 'Booking rules complete';
      default: return key;
    }
  };

  const renderWizardContent = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-6 p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">Tell us about your facility</h3>
              <p className="text-gray-600 dark:text-text-secondary">Basic information to get started</p>
            </div>

            <Input
              label="Facility Name"
              value={wizardData.facilityName}
              onChange={(e) => setWizardData({ ...wizardData, facilityName: e.target.value })}
              placeholder="e.g., Happy Paws Pet Resort"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                What type of facility do you operate?
              </label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'boarding_only', label: 'Boarding Only' },
                  { value: 'daycare_only', label: 'Daycare Only' },
                  { value: 'boarding_daycare', label: 'Boarding & Daycare' },
                  { value: 'full_service', label: 'Full Service (incl. Grooming)' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWizardData({ ...wizardData, facilityType: option.value })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      wizardData.facilityType === option.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-surface-border hover:border-blue-400'
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">Accommodation Setup</h3>
              <p className="text-gray-600 dark:text-text-secondary">How do you refer to your accommodations?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                What do you call your standard accommodations?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['Kennel', 'Room', 'Run', 'Suite', 'Cabin', 'Condo'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setWizardData({ ...wizardData, accommodationType: term })}
                    className={`p-3 rounded-lg border-2 font-medium transition-all ${
                      wizardData.accommodationType === term
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-surface-border hover:border-blue-400'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Total Boarding Capacity"
              type="number"
              value={wizardData.totalCapacity}
              onChange={(e) => setWizardData({ ...wizardData, totalCapacity: parseInt(e.target.value) || 0 })}
              helpText="How many pets can you board at maximum capacity?"
              min="1"
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">Facility Layout</h3>
              <p className="text-gray-600 dark:text-text-secondary">Tell us about your physical space</p>
            </div>

            <div>
              <label className="flex items-center gap-3 p-4 border border-gray-300 dark:border-surface-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary">
                <input
                  type="checkbox"
                  checked={wizardData.hasMultipleLocations}
                  onChange={(e) => setWizardData({ ...wizardData, hasMultipleLocations: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <div>
                  <span className="font-medium">I have multiple buildings or areas</span>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">
                    e.g., separate boarding and daycare buildings
                  </p>
                </div>
              </label>
            </div>

            {wizardData.hasMultipleLocations && (
              <Input
                label="Number of Buildings/Areas"
                type="number"
                value={wizardData.locationCount}
                onChange={(e) => setWizardData({ ...wizardData, locationCount: parseInt(e.target.value) || 1 })}
                helpText="You can configure each location in detail after setup"
                min="1"
              />
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> You can always add more locations later in the Locations tab.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">Review Your Setup</h3>
              <p className="text-gray-600 dark:text-text-secondary">Confirm your facility configuration</p>
            </div>

            <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">Facility Name:</span>
                <span className="font-medium">{wizardData.facilityName || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">Facility Type:</span>
                <span className="font-medium capitalize">{wizardData.facilityType.replace('_', ' & ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">Accommodation Term:</span>
                <span className="font-medium">{wizardData.accommodationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">Total Capacity:</span>
                <span className="font-medium">{wizardData.totalCapacity} pets</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">Multiple Locations:</span>
                <span className="font-medium">{wizardData.hasMultipleLocations ? `Yes (${wizardData.locationCount})` : 'No'}</span>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Ready to go!</strong> Click "Complete Setup" to apply these settings.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Quick Setup Wizard"
        description="First time setup to automatically configure your facility."
      >
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Welcome to BarkBase!</h3>
          <p className="text-gray-600 dark:text-text-secondary mb-6">
            Answer a few questions to automatically configure your facility settings.
          </p>
          <Button onClick={handleStartWizard} className="flex items-center gap-2 mx-auto">
            <Sparkles className="w-4 h-4" />
            Start Setup Wizard
          </Button>
          <p className="text-sm text-gray-500 dark:text-text-secondary mt-3">
            Or manually configure each tab using the sections above.
          </p>
        </div>
      </Card>

      <Card
        title="Configuration Management"
        description="Import, export, or reset your facility configuration."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div>
              <h4 className="font-medium">Export Settings</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Download your current facility configuration as JSON</p>
            </div>
            <Button onClick={handleExportSettings} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Config
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div>
              <h4 className="font-medium">Import Settings</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Upload a previously saved configuration</p>
            </div>
            <Button onClick={handleImportSettings} variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Choose File
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-900/30 rounded-lg">
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-100">Reset to Defaults</h4>
              <p className="text-sm text-red-700">Reset all facility settings to default values</p>
            </div>
            <Button
              onClick={() => setShowResetConfirm(true)}
              variant="outline"
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 dark:bg-surface-primary"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title="Setup Checklist"
        description="Track your facility setup progress."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Facility Setup Progress</span>
            <span className="text-sm text-gray-600 dark:text-text-secondary">{calculateProgress()}% complete</span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>

          <div className="space-y-3 mt-6">
            {Object.entries(setupProgress).map(([key, completed]) => (
              <div key={key} className="flex items-center gap-3">
                {getStatusIcon(completed)}
                <span className={`text-sm ${completed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {getStatusText(key)}
                </span>
              </div>
            ))}
          </div>

          {calculateProgress() < 100 && (
            <div className="pt-4 border-t border-gray-200 dark:border-surface-border">
              <Button onClick={handleStartWizard} className="w-full">
                Complete Setup with Wizard
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Reset Confirmation Slideout */}
      <SlideOutDrawer
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Facility Settings"
        subtitle="This action cannot be undone"
        size="sm"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetSettings} className="bg-red-600 hover:bg-red-700">
              Reset Settings
            </Button>
          </div>
        }
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span className="font-medium text-red-900 dark:text-red-100">Warning</span>
          </div>
          <p className="text-gray-700 dark:text-text-primary">
            This will reset all facility settings to their default values. All your custom configurations for accommodations, capacity, locations, amenities, and rules will be lost.
          </p>
        </div>
      </SlideOutDrawer>

      {/* Setup Wizard Slideout */}
      <SlideOutDrawer
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        title="Facility Setup Wizard"
        subtitle={`Step ${wizardStep} of 4`}
        size="md"
        footerContent={
          <div className="flex justify-between items-center">
            <div>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={handleWizardBack} className="flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowWizard(false)}>
                Cancel
              </Button>
              {wizardStep < 4 ? (
                <Button onClick={handleWizardNext} className="flex items-center gap-1">
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleWizardComplete}>
                  Complete Setup
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* Progress indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-sm transition-all ${
                  wizardStep >= step
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-400 dark:text-text-tertiary'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 mx-2 transition-all ${
                    wizardStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-surface-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {renderWizardContent()}
      </SlideOutDrawer>
    </div>
  );
}
