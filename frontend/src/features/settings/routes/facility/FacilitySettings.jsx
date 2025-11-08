import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Home, BarChart3, MapPin, Star, FileText, Settings, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AccommodationsTab from './tabs/AccommodationsTab';
import CapacityTab from './tabs/CapacityTab';
import LocationsTab from './tabs/LocationsTab';
import AmenitiesTab from './tabs/AmenitiesTab';
import RulesTab from './tabs/RulesTab';
import SetupTab from './tabs/SetupTab';
import RunTemplatesTab from './tabs/RunTemplatesTab';
import { useUpdateFacilitySettingsMutation } from '@/features/facilities/api';

const TABS = [
  { id: 'accommodations', label: 'Accommodations', icon: Home },
  { id: 'capacity', label: 'Capacity', icon: BarChart3 },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'amenities', label: 'Amenities', icon: Star },
  { id: 'run-templates', label: 'Run Templates', icon: Play },
  { id: 'rules', label: 'Rules', icon: FileText },
  { id: 'setup', label: 'Setup', icon: Settings },
];

export default function FacilitySettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'accommodations';
  const updateSettings = useUpdateFacilitySettingsMutation();

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ tab: activeTab });
      toast.success('Facility settings saved successfully');
    } catch (error) {
      console.error('Failed to save facility settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'accommodations':
        return <AccommodationsTab />;
      case 'capacity':
        return <CapacityTab />;
      case 'locations':
        return <LocationsTab />;
      case 'amenities':
        return <AmenitiesTab />;
      case 'run-templates':
        return <RunTemplatesTab />;
      case 'rules':
        return <RulesTab />;
      case 'setup':
        return <SetupTab />;
      default:
        return <AccommodationsTab />;
    }
  };

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 dark:text-text-secondary mb-2">Home &gt; Facility</div>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-text-primary">Facility</h1>
        <p className="text-gray-600 dark:text-text-secondary">Kennels, locations, and inventory</p>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-surface-border mb-6">
        <nav className="flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary hover:border-gray-300 dark:hover:border-surface-border'
                }
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-surface-primary rounded-lg shadow-sm p-6">
        {renderTabContent()}
      </div>

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 bg-white dark:bg-surface-primary border-t border-gray-200 dark:border-surface-border p-4 flex justify-end mt-6">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
