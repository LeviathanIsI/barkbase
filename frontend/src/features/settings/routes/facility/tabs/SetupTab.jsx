import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Sparkles, Upload, Download, RotateCcw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant';

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

  const handleStartWizard = () => {
    setShowWizard(true);
    // TODO: Implement setup wizard
  };

  const handleExportSettings = () => {
    // TODO: Implement export functionality
  };

  const handleImportSettings = () => {
    // TODO: Implement import functionality
  };

  const handleResetSettings = () => {
    // TODO: Implement reset functionality
    setShowResetConfirm(false);
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
      case 'capacitySet': return 'Capacity limits not set';
      case 'locationsAdded': return 'No locations added';
      case 'amenitiesConfigured': return 'Amenities configured';
      case 'rulesIncomplete': return 'Booking rules incomplete';
      default: return key;
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Quick Setup Wizard"
        description="First time setup to automatically configure your facility."
      >
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Welcome to BarkBase!</h3>
          <p className="text-gray-600 mb-6">
            Answer a few questions to automatically configure your facility settings.
          </p>
          <Button onClick={handleStartWizard} className="flex items-center gap-2 mx-auto">
            <Sparkles className="w-4 h-4" />
            Start Setup Wizard
          </Button>
          <p className="text-sm text-gray-500 mt-3">
            Or manually configure each tab using the sections above.
          </p>
        </div>
      </Card>

      <Card
        title="Configuration Management"
        description="Import, export, or reset your facility configuration."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium">Export Settings</h4>
              <p className="text-sm text-gray-600">Download your current facility configuration as JSON</p>
            </div>
            <Button onClick={handleExportSettings} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Config
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium">Import Settings</h4>
              <p className="text-sm text-gray-600">Upload a previously saved configuration</p>
            </div>
            <Button onClick={handleImportSettings} variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Choose File
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-medium text-red-900">Reset to Defaults</h4>
              <p className="text-sm text-red-700">Reset all facility settings to default values (requires confirmation)</p>
            </div>
            <Button
              onClick={() => setShowResetConfirm(true)}
              variant="outline"
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
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
            <span className="text-sm text-gray-600">{calculateProgress()}% complete</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>

          <div className="space-y-3 mt-6">
            {Object.entries(setupProgress).map(([key, completed]) => (
              <div key={key} className="flex items-center gap-3">
                {getStatusIcon(completed)}
                <span className={`text-sm ${completed ? 'text-green-700' : 'text-red-700'}`}>
                  {completed ? '✅' : '⚠️'} {getStatusText(key)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button className="w-full">
              Complete Setup
            </Button>
          </div>
        </div>
      </Card>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-red-900">Reset Facility Settings</h3>
            </div>

            <p className="text-gray-700 mb-6">
              This will reset all facility settings to their default values. This action cannot be undone.
              Are you sure you want to continue?
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleResetSettings} className="bg-red-600 hover:bg-red-700">
                Reset Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Wizard Modal (Placeholder) */}
      {showWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">Facility Setup Wizard</h3>
            <p className="text-gray-600 mb-6">
              This wizard will guide you through setting up your facility. Feature coming soon!
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setShowWizard(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
