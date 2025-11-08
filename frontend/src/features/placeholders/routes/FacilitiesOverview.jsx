import { useState, useEffect } from 'react';
import { Building, Plus, Settings, BarChart3, FileText, Upload, Download, Eye, Map, Wrench, Shield, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import SetupWizard from '../components/SetupWizard';
import PopulatedFacilitiesView from '../components/PopulatedFacilitiesView';
import VisualLayoutView from '../components/VisualLayoutView';
import CapacityAnalytics from '../components/CapacityAnalytics';
import RunDetailModal from '../components/RunDetailModal';
import FacilityActionsPanel from '../components/FacilityActionsPanel';
import AIFeaturesPanel from '../components/AIFeaturesPanel';
import ComplianceMonitoring from '../components/ComplianceMonitoring';
import MaintenanceTracking from '../components/MaintenanceTracking';

const FacilitiesOverview = () => {
  const [isSetup, setIsSetup] = useState(false); // Change to true to see populated view
  const [currentView, setCurrentView] = useState('overview'); // overview, layout, analytics, ai, compliance, maintenance
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showRunDetail, setShowRunDetail] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [facilitiesData, setFacilitiesData] = useState(null);

  // Set document title
  useEffect(() => {
    document.title = 'Facilities & Runs | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  // Mock facilities data after setup
  const mockFacilitiesData = {
    facilityName: 'Happy Paws Boarding & Daycare',
    services: ['boarding', 'daycare', 'grooming'],
    species: ['dogs', 'cats'],
    size: 'medium',
    buildings: [
      {
        id: 'building-a',
        name: 'Building A',
        type: 'indoor',
        runs: [
          { id: 'k-1', name: 'K-1', type: 'small', size: '4x4', status: 'occupied', pet: 'Max', petBreed: 'Golden Retriever' },
          { id: 'k-2', name: 'K-2', type: 'small', size: '4x4', status: 'available' },
          { id: 'k-3', name: 'K-3', type: 'small', size: '4x4', status: 'occupied', pet: 'Bella', petBreed: 'Labrador' },
          { id: 'k-6', name: 'K-6', type: 'medium', size: '5x6', status: 'occupied', pet: 'Charlie', petBreed: 'Beagle' },
          { id: 'k-7', name: 'K-7', type: 'medium', size: '5x6', status: 'available' },
          { id: 'k-10', name: 'K-10', type: 'large', size: '8x10', status: 'occupied', pet: 'Max', petBreed: 'Golden Retriever' },
          { id: 'k-11', name: 'K-11', type: 'large', size: '8x10', status: 'maintenance' },
          { id: 'suite-1', name: 'SUITE-1', type: 'luxury', size: '12x12', status: 'occupied', pet: 'Duke', petBreed: 'Terrier' }
        ]
      },
      {
        id: 'outdoor',
        name: 'Outdoor Runs',
        type: 'outdoor',
        runs: [
          { id: 'out-1', name: 'OUT-1', type: 'xl-outdoor', size: '15x10', status: 'occupied', pet: 'Rocky', petBreed: 'German Shepherd' }
        ]
      }
    ],
    daycareAreas: [
      {
        id: 'small-dogs',
        name: 'Small Dogs Play Area',
        maxCapacity: 10,
        currentCount: 6,
        staffAssigned: 'Jenny Martinez',
        pets: ['Daisy', 'Peanut', 'Muffin', 'Coco', 'Bella', 'Tiny']
      },
      {
        id: 'medium-dogs',
        name: 'Medium Dogs Play Area',
        maxCapacity: 15,
        currentCount: 12,
        staffAssigned: 'Mike Thompson',
        pets: ['Charlie', 'Max', 'Lucy']
      },
      {
        id: 'large-dogs',
        name: 'Large Dogs Play Area',
        maxCapacity: 12,
        currentCount: 6,
        staffAssigned: 'Sarah Lee',
        pets: ['Buddy', 'Duke', 'Rocky', 'Zeus', 'Bear', 'Tank']
      }
    ],
    catAreas: [
      { id: 'cat-1', name: 'CAT-1', type: 'cat-condo', status: 'occupied', pet: 'Luna', petBreed: 'Siamese' }
    ]
  };

  const handleSetupComplete = (data) => {
    setFacilitiesData(data);
    setIsSetup(true);
    setShowSetupWizard(false);
    setCurrentView('overview');
  };

  const handleRunClick = (run) => {
    setSelectedRun(run);
    setShowRunDetail(true);
  };

  if (!isSetup) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          breadcrumb="Home > Records > Facilities & Runs"
          title="Facilities & Runs"
          subtitle="Configure your facility for intelligent capacity management"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSetupWizard(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Start Setup
              </Button>
            </div>
          }
        />

        {/* Setup Options */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Quick Setup Wizard */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowSetupWizard(true)}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Quick Setup Wizard</h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Recommended • 10 minutes</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-text-primary mb-4">
              Step-by-step guided setup for your facility. Perfect for first-time setup.
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              What we'll configure: facility info, kennels, daycare, pricing
            </div>
          </Card>

          {/* Advanced Setup */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Advanced Setup</h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Complex facilities • 20-30 minutes</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-text-primary mb-4">
              Manual configuration for multi-building facilities with custom rules.
            </p>
            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
              Additional features: visual layout designer, custom capacity rules
            </div>
          </Card>

          {/* Use Template */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Use Template</h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Common layouts • 5 minutes</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-text-primary mb-4">
              Start with pre-built facility layouts for common configurations.
            </p>
            <div className="text-sm text-green-600 font-medium">
              Templates: small/medium/large facilities, daycare-only, boutique
            </div>
          </Card>
        </div>

        {/* Import Options */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Or Import from Existing System</h3>
          <p className="text-gray-600 dark:text-text-secondary mb-6">
            Switching from another kennel software? Import your facility layout to get started quickly.
          </p>

          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import from Gingr
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import from PetExec
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import from Kennel Connection
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
          </div>
        </Card>

        {/* Benefits */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-surface-primary dark:to-surface-primary border-blue-200 dark:border-blue-900/30">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">Why This Matters</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">Automatic Overbooking Prevention</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Smart capacity tracking prevents double-bookings</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">Real-time Capacity Tracking</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Live occupancy across all kennels and play areas</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">Revenue Optimization</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Identify underutilized spaces and pricing opportunities</div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-100 dark:bg-surface-secondary rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Setup time: 10-15 minutes</span>
            </div>
          </div>
        </Card>

        {/* Setup Wizard Modal */}
        <SetupWizard
          isOpen={showSetupWizard}
          onClose={() => setShowSetupWizard(false)}
          onComplete={handleSetupComplete}
        />
      </div>
    );
  }

  // Populated facilities view
  return (
    <div className="space-y-6">
      {/* Page Header with View Toggle */}
      <PageHeader
        breadcrumb="Home > Records > Facilities & Runs"
        title="Facilities & Runs"
        subtitle="Manage your facility layout, capacity, and operations"
        actions={
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-surface-secondary rounded-lg p-1">
              <Button
                variant={currentView === 'overview' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('overview')}
                className="px-3"
              >
                <Building className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={currentView === 'layout' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('layout')}
                className="px-3"
              >
                <Map className="h-4 w-4 mr-2" />
                Layout
              </Button>
              <Button
                variant={currentView === 'analytics' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('analytics')}
                className="px-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant={currentView === 'ai' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('ai')}
                className="px-3"
              >
                <Zap className="h-4 w-4 mr-2" />
                AI Features
              </Button>
              <Button
                variant={currentView === 'compliance' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('compliance')}
                className="px-3"
              >
                <Shield className="h-4 w-4 mr-2" />
                Compliance
              </Button>
              <Button
                variant={currentView === 'maintenance' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('maintenance')}
                className="px-3"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Maintenance
              </Button>
            </div>

            {/* Action Buttons */}
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        }
      />

      {/* Main Content Area */}
      {currentView === 'overview' && (
        <PopulatedFacilitiesView
          facilitiesData={mockFacilitiesData}
          onRunClick={handleRunClick}
        />
      )}

      {currentView === 'layout' && (
        <VisualLayoutView
          facilitiesData={mockFacilitiesData}
          onRunClick={handleRunClick}
        />
      )}

      {currentView === 'analytics' && (
        <CapacityAnalytics facilitiesData={mockFacilitiesData} />
      )}

      {currentView === 'ai' && (
        <AIFeaturesPanel facilitiesData={mockFacilitiesData} />
      )}

      {currentView === 'compliance' && (
        <ComplianceMonitoring facilitiesData={mockFacilitiesData} />
      )}

      {currentView === 'maintenance' && (
        <MaintenanceTracking facilitiesData={mockFacilitiesData} />
      )}

      {/* Facility Actions Panel */}
      <FacilityActionsPanel />

      {/* Run Detail Modal */}
      <RunDetailModal
        run={selectedRun}
        isOpen={showRunDetail}
        onClose={() => setShowRunDetail(false)}
      />
    </div>
  );
};

export default FacilitiesOverview;
