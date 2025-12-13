import { useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import AccommodationsTab from './tabs/AccommodationsTab';
import CapacityTab from './tabs/CapacityTab';
import LocationsTab from './tabs/LocationsTab';
import AmenitiesTab from './tabs/AmenitiesTab';
import RulesTab from './tabs/RulesTab';
import SetupTab from './tabs/SetupTab';
import RunTemplatesTab from './tabs/RunTemplatesTab';
import { useUpdateFacilitySettingsMutation } from '@/features/facilities/api';

const TABS = [
  { id: 'accommodations', label: 'Accommodations' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'locations', label: 'Locations' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'run-templates', label: 'Run Templates' },
  { id: 'rules', label: 'Rules' },
  { id: 'setup', label: 'Setup' },
];

export default function FacilitySettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'accommodations';
  const updateSettings = useUpdateFacilitySettingsMutation();

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ tab: activeTab });
      toast.success('Facility settings saved');
    } catch (error) {
      console.error('Failed to save facility settings:', error);
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Button - aligned right */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="border-b border-border w-full justify-start gap-6 bg-transparent px-0 mb-6">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-0 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="accommodations">
          <AccommodationsTab />
        </TabsContent>
        <TabsContent value="capacity">
          <CapacityTab />
        </TabsContent>
        <TabsContent value="locations">
          <LocationsTab />
        </TabsContent>
        <TabsContent value="amenities">
          <AmenitiesTab />
        </TabsContent>
        <TabsContent value="run-templates">
          <RunTemplatesTab />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="setup">
          <SetupTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
