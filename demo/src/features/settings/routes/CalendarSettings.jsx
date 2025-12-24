import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import StyledSelect from '@/components/ui/StyledSelect';
import {
  Settings,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCalendarSettingsQuery, useUpdateCalendarSettingsMutation } from '../api';

const COLOR_OPTIONS = [
  { value: '#22c55e', label: 'Green' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#ef4444', label: 'Red' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#f97316', label: 'Orange' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#ec4899', label: 'Pink' },
];

const ColorPicker = ({ value, onChange, label }) => {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded border border-gray-300 dark:border-surface-border"
          style={{ backgroundColor: value }}
        />
        <div className="min-w-[100px]">
          <StyledSelect
            options={COLOR_OPTIONS}
            value={value}
            onChange={(opt) => onChange(opt?.value || value)}
            isClearable={false}
            isSearchable={false}
          />
        </div>
      </div>
    </div>
  );
};

const CalendarSettings = () => {
  const { data, isLoading, error } = useCalendarSettingsQuery();
  const updateMutation = useUpdateCalendarSettingsMutation();

  const [settings, setSettings] = useState({
    // Default View
    defaultView: 'month',
    weekStartsOn: 'sunday',
    showWeekends: true,
    showCanceled: true,
    showCompleted: false,
    // Working Hours
    businessHoursStart: '07:00',
    businessHoursEnd: '19:00',
    greyOutNonWorking: true,
    showHoursIndicator: true,
    // Colors
    colorBy: 'status',
    statusColors: {
      confirmed: '#22c55e',
      pending: '#eab308',
      checked_in: '#3b82f6',
      checked_out: '#6b7280',
      cancelled: '#ef4444',
    },
    serviceColors: {
      boarding: '#3b82f6',
      daycare: '#22c55e',
      grooming: '#a855f7',
    },
    // Display
    showPetName: true,
    showOwnerName: true,
    showServiceType: true,
    showPetPhoto: false,
    showTimes: true,
    showNotesPreview: false,
    timeSlotMinutes: 30,
    // Capacity
    showCapacityBar: true,
    capacityWarningThreshold: 80,
    blockAtFullCapacity: true,
  });

  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(settings);
      toast.success('Calendar settings saved successfully!');
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast.error(error?.response?.data?.message || 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateStatusColor = (status, color) => {
    setSettings((prev) => ({
      ...prev,
      statusColors: { ...prev.statusColors, [status]: color },
    }));
  };

  const updateServiceColor = (service, color) => {
    setSettings((prev) => ({
      ...prev,
      serviceColors: { ...prev.serviceColors, [service]: color },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load calendar settings. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Default View & Working Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Default View */}
        <Card title="Default View" description="Choose how the calendar displays">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Default Calendar View</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                  { value: 'timeline', label: 'Timeline' },
                ].map((view) => (
                  <button
                    key={view.value}
                    onClick={() => updateSetting('defaultView', view.value)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      settings.defaultView === view.value
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary hover:bg-gray-200 dark:hover:bg-surface-tertiary'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <StyledSelect
                label="Week Starts On"
                options={[
                  { value: 'sunday', label: 'Sunday' },
                  { value: 'monday', label: 'Monday' },
                ]}
                value={settings.weekStartsOn}
                onChange={(opt) => updateSetting('weekStartsOn', opt?.value || 'sunday')}
                isClearable={false}
                isSearchable={false}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Show weekends</span>
                <Switch
                  checked={settings.showWeekends}
                  onChange={(checked) => updateSetting('showWeekends', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Show canceled bookings</span>
                <Switch
                  checked={settings.showCanceled}
                  onChange={(checked) => updateSetting('showCanceled', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Show completed bookings</span>
                <Switch
                  checked={settings.showCompleted}
                  onChange={(checked) => updateSetting('showCompleted', checked)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Working Hours */}
        <Card title="Working Hours" description="Grey out non-working hours">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Hours Start</label>
                <input
                  type="time"
                  value={settings.businessHoursStart}
                  onChange={(e) => updateSetting('businessHoursStart', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End</label>
                <input
                  type="time"
                  value={settings.businessHoursEnd}
                  onChange={(e) => updateSetting('businessHoursEnd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Grey out hours outside business hours</span>
                <Switch
                  checked={settings.greyOutNonWorking}
                  onChange={(checked) => updateSetting('greyOutNonWorking', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Show business hours indicator</span>
                <Switch
                  checked={settings.showHoursIndicator}
                  onChange={(checked) => updateSetting('showHoursIndicator', checked)}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Booking Colors & Display Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Colors */}
        <Card title="Booking Colors" description="Color-code bookings by type/status">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Color bookings by</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'status', label: 'Status' },
                  { value: 'service', label: 'Service Type' },
                  { value: 'pet_size', label: 'Pet Size' },
                  { value: 'staff', label: 'Staff' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSetting('colorBy', option.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      settings.colorBy === option.value
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary hover:bg-gray-200 dark:hover:bg-surface-tertiary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {settings.colorBy === 'status' && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Status Colors</h4>
                <div className="space-y-1">
                  <ColorPicker
                    label="Confirmed"
                    value={settings.statusColors.confirmed}
                    onChange={(color) => updateStatusColor('confirmed', color)}
                  />
                  <ColorPicker
                    label="Pending"
                    value={settings.statusColors.pending}
                    onChange={(color) => updateStatusColor('pending', color)}
                  />
                  <ColorPicker
                    label="Checked In"
                    value={settings.statusColors.checked_in}
                    onChange={(color) => updateStatusColor('checked_in', color)}
                  />
                  <ColorPicker
                    label="Checked Out"
                    value={settings.statusColors.checked_out}
                    onChange={(color) => updateStatusColor('checked_out', color)}
                  />
                  <ColorPicker
                    label="Cancelled"
                    value={settings.statusColors.cancelled}
                    onChange={(color) => updateStatusColor('cancelled', color)}
                  />
                </div>
              </div>
            )}

            {settings.colorBy === 'service' && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Service Colors</h4>
                <div className="space-y-1">
                  <ColorPicker
                    label="Boarding"
                    value={settings.serviceColors.boarding}
                    onChange={(color) => updateServiceColor('boarding', color)}
                  />
                  <ColorPicker
                    label="Daycare"
                    value={settings.serviceColors.daycare}
                    onChange={(color) => updateServiceColor('daycare', color)}
                  />
                  <ColorPicker
                    label="Grooming"
                    value={settings.serviceColors.grooming}
                    onChange={(color) => updateServiceColor('grooming', color)}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Display Options */}
        <Card title="Display Options" description="Choose what info to show on cards">
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium">Show on calendar cards</label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pet name</span>
                <Switch
                  checked={settings.showPetName}
                  onChange={(checked) => updateSetting('showPetName', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Owner name</span>
                <Switch
                  checked={settings.showOwnerName}
                  onChange={(checked) => updateSetting('showOwnerName', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Service type</span>
                <Switch
                  checked={settings.showServiceType}
                  onChange={(checked) => updateSetting('showServiceType', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pet photo</span>
                <Switch
                  checked={settings.showPetPhoto}
                  onChange={(checked) => updateSetting('showPetPhoto', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Check-in/out times</span>
                <Switch
                  checked={settings.showTimes}
                  onChange={(checked) => updateSetting('showTimes', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Notes preview</span>
                <Switch
                  checked={settings.showNotesPreview}
                  onChange={(checked) => updateSetting('showNotesPreview', checked)}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <StyledSelect
                label="Time slot duration"
                options={[
                  { value: 15, label: '15 minutes' },
                  { value: 30, label: '30 minutes' },
                  { value: 60, label: '1 hour' },
                ]}
                value={settings.timeSlotMinutes}
                onChange={(opt) => updateSetting('timeSlotMinutes', opt?.value || 30)}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: Capacity Indicators (Full Width) */}
      <Card title="Capacity Indicators" description="Configure capacity warnings and limits">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">Show daily capacity bar</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Display occupancy progress bar</p>
              </div>
              <Switch
                checked={settings.showCapacityBar}
                onChange={(checked) => updateSetting('showCapacityBar', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">Block bookings at 100% capacity</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Prevent overbooking when full</p>
              </div>
              <Switch
                checked={settings.blockAtFullCapacity}
                onChange={(checked) => updateSetting('blockAtFullCapacity', checked)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Capacity warning threshold</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.capacityWarningThreshold}
                onChange={(e) => updateSetting('capacityWarningThreshold', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
                className="w-20 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
              />
              <span className="text-sm text-gray-600 dark:text-text-secondary">%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Settings className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default CalendarSettings;
