import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import SlideOutDrawer from '@/components/ui/SlideOutDrawer';
import { Plus, Edit, X, MapPin } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant';

export default function LocationsTab() {
  const tenant = useTenantStore((state) => state.tenant);
  const [locations, setLocations] = useState(
    tenant?.settings?.facility?.locations || [
      {
        id: 1,
        name: 'Building A - Main Building',
        type: 'boarding',
        kennels: 20,
        suites: 5,
        notes: 'Main facility building'
      },
      {
        id: 2,
        name: 'Building B - Daycare Wing',
        type: 'daycare',
        daycareAreas: 2,
        notes: 'Dedicated daycare space'
      }
    ]
  );

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    type: 'boarding',
    accommodationCount: 1,
    notes: ''
  });

  const handleAddLocation = () => {
    setLocationForm({
      name: '',
      type: 'boarding',
      accommodationCount: 1,
      notes: ''
    });
    setEditingLocation(null);
    setShowDrawer(true);
  };

  const handleEditLocation = (location) => {
    setLocationForm({
      name: location.name,
      type: location.type,
      accommodationCount: location.kennels || location.suites || location.daycareAreas || 1,
      notes: location.notes || ''
    });
    setEditingLocation(location);
    setShowDrawer(true);
  };

  const handleDeleteLocation = (id) => {
    setLocations(prev => prev.filter(loc => loc.id !== id));
  };

  const handleSaveLocation = () => {
    if (editingLocation) {
      setLocations(prev => prev.map(loc =>
        loc.id === editingLocation.id
          ? {
              ...loc,
              name: locationForm.name,
              type: locationForm.type,
              ...(locationForm.type === 'boarding' ? {
                kennels: locationForm.accommodationCount,
                suites: 0
              } : locationForm.type === 'daycare' ? {
                daycareAreas: locationForm.accommodationCount
              } : {
                kennels: locationForm.accommodationCount,
                suites: 0
              }),
              notes: locationForm.notes
            }
          : loc
      ));
    } else {
      const newLocation = {
        id: Math.max(...locations.map(l => l.id), 0) + 1,
        name: locationForm.name,
        type: locationForm.type,
        ...(locationForm.type === 'boarding' ? {
          kennels: locationForm.accommodationCount,
          suites: 0
        } : locationForm.type === 'daycare' ? {
          daycareAreas: locationForm.accommodationCount
        } : {
          kennels: locationForm.accommodationCount,
          suites: 0
        }),
        notes: locationForm.notes
      };
      setLocations(prev => [...prev, newLocation]);
    }
    setShowDrawer(false);
  };

  const getLocationSummary = (location) => {
    if (location.type === 'boarding') {
      return `Kennels: ${location.kennels || 0} | Suites: ${location.suites || 0}`;
    } else if (location.type === 'daycare') {
      return `Daycare Areas: ${location.daycareAreas || 0}`;
    }
    return `Accommodations: ${location.kennels || location.daycareAreas || 0}`;
  };

  return (
    <div className="space-y-6">
      <Card
        title="Physical Facility Layout"
        description="Organize your accommodations into buildings or wings."
        actions={
          <Button onClick={handleAddLocation} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Building/Location
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((location) => (
            <div key={location.id} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 dark:text-text-tertiary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-text-primary">{location.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">{getLocationSummary(location)}</p>
                    {location.notes && (
                      <p className="text-xs text-gray-500 dark:text-text-tertiary mt-2">{location.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditLocation(location)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteLocation(location.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {locations.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-text-secondary">
              No locations added yet. Click "Add Building/Location" to get started.
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Location Slideout */}
      <SlideOutDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingLocation ? 'Edit Location' : 'Add Building/Location'}
        subtitle={editingLocation ? `Editing ${editingLocation.name}` : 'Configure a new building or area'}
        size="sm"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDrawer(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLocation}>
              {editingLocation ? 'Save Changes' : 'Add Location'}
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <Input
            label="Name"
            value={locationForm.name}
            onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Building A - Main Building"
          />

          <div>
            <StyledSelect
              label="Type"
              options={[
                { value: 'boarding', label: 'Boarding' },
                { value: 'daycare', label: 'Daycare' },
                { value: 'mixed', label: 'Mixed' },
                { value: 'grooming', label: 'Grooming' },
              ]}
              value={locationForm.type}
              onChange={(opt) => setLocationForm(prev => ({ ...prev, type: opt?.value || 'boarding' }))}
              isClearable={false}
              isSearchable={false}
              menuPortalTarget={document.body}
            />
          </div>

          <Input
            label="Number of Accommodations"
            type="number"
            value={locationForm.accommodationCount}
            onChange={(e) => setLocationForm(prev => ({ ...prev, accommodationCount: parseInt(e.target.value) || 1 }))}
            min="1"
          />

          <Input
            label="Notes"
            value={locationForm.notes}
            onChange={(e) => setLocationForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional notes about this location"
          />
        </div>
      </SlideOutDrawer>
    </div>
  );
}
