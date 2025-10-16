import { useState } from 'react';
import { Package, Plus, BarChart3, Lightbulb } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyStatePackages from '../components/EmptyStatePackages';
import PackagesDashboard from '../components/PackagesDashboard';
import PackageWizard from '../components/PackageWizard';
import PackageTemplatesModal from '../components/PackageTemplatesModal';
import PackageAnalytics from '../components/PackageAnalytics';

const PackagesOverview = () => {
  const [hasPackages, setHasPackages] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [wizardTemplate, setWizardTemplate] = useState(null);

  const handleCreatePackage = () => {
    setWizardTemplate(null);
    setShowWizard(true);
  };

  const handleUseTemplate = (template) => {
    setWizardTemplate(template);
    setShowTemplates(false);
    setShowWizard(true);
  };

  const handleWizardComplete = (packageData) => {
    console.log('Package created:', packageData);
    setShowWizard(false);
    setHasPackages(true);
  };

  const handleBrowseTemplates = () => {
    setShowTemplates(true);
  };

  const handleShowAnalytics = () => {
    setShowAnalytics(true);
  };

  if (showAnalytics) {
    return (
      <div className="p-6">
        <PackageAnalytics onBack={() => setShowAnalytics(false)} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 mb-2">Home &gt; Records &gt; Packages & Memberships</div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              Packages & Memberships
            </h1>
            <p className="text-gray-600 mt-1">
              Increase revenue with packages, memberships, and loyalty plans
            </p>
          </div>
          {hasPackages && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleShowAnalytics}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Package Performance
              </Button>
              <Button variant="outline" onClick={handleBrowseTemplates}>
                <Lightbulb className="w-4 h-4 mr-2" />
                Ideas
              </Button>
              <Button onClick={handleCreatePackage}>
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!hasPackages ? (
        <EmptyStatePackages
          onCreatePackage={handleCreatePackage}
          onBrowseTemplates={handleBrowseTemplates}
        />
      ) : (
        <PackagesDashboard
          onCreatePackage={handleCreatePackage}
          onShowAnalytics={handleShowAnalytics}
        />
      )}

      {/* Modals */}
      <PackageWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
        template={wizardTemplate}
      />

      <PackageTemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleUseTemplate}
      />
    </div>
  );
};

export default PackagesOverview;

