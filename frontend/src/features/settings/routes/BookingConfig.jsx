import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import { Calendar, Clock, DollarSign, Shield, Settings, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBookingSettingsQuery, useUpdateBookingSettingsMutation } from '../api';

const BookingConfig = () => {
  const { data, isLoading, error } = useBookingSettingsQuery();
  const updateMutation = useUpdateBookingSettingsMutation();

  const [settings, setSettings] = useState({
    onlineBookingEnabled: true,
    requireDeposit: false,
    depositPercentage: 25,
    requireVaccinations: true,
    enableWaitlist: true,
    maxAdvanceDays: 90,
    minAdvanceHours: 24,
    cancellationWindowHours: 48,
    checkinTime: '08:00',
    checkoutTime: '17:00',
    extendedHoursEnabled: false,
    earlyDropoffTime: '06:00',
    latePickupTime: '20:00',
    earlyDropoffFeeCents: 0,
    latePickupFeeCents: 0,
  });

  // Sync settings from API response
  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(settings);
      toast.success('Booking settings saved successfully!');
    } catch (error) {
      console.error('Error saving booking settings:', error);
      toast.error(error?.response?.data?.message || 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
        Failed to load booking settings. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Booking Rules */}
          <Card
            title="Booking Rules"
            description="Set up your booking policies"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Online Booking</h4>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">Allow customers to book online</p>
                </div>
                <Switch
                  checked={settings.onlineBookingEnabled}
                  onChange={(checked) => updateSetting('onlineBookingEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Require Deposit</h4>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">Collect deposit for bookings</p>
                </div>
                <Switch
                  checked={settings.requireDeposit}
                  onChange={(checked) => updateSetting('requireDeposit', checked)}
                />
              </div>

              {settings.requireDeposit && (
                <div className="ml-8">
                  <label className="block text-sm font-medium mb-2">
                    Deposit Percentage
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.depositPercentage}
                      onChange={(e) => updateSetting('depositPercentage', parseInt(e.target.value) || 0)}
                      min="0"
                      max="100"
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                    />
                    <span className="text-sm text-gray-600 dark:text-text-secondary">%</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Vaccination Requirements</h4>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">Require up-to-date vaccinations</p>
                </div>
                <Switch
                  checked={settings.requireVaccinations}
                  onChange={(checked) => updateSetting('requireVaccinations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Enable Waitlist</h4>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">Allow waitlist when fully booked</p>
                </div>
                <Switch
                  checked={settings.enableWaitlist}
                  onChange={(checked) => updateSetting('enableWaitlist', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Operating Hours */}
          <Card
            title="Operating Hours"
            description="Set your check-in and check-out times"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Standard Check-In
                  </label>
                  <input
                    type="time"
                    value={settings.checkinTime}
                    onChange={(e) => updateSetting('checkinTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Standard Check-Out
                  </label>
                  <input
                    type="time"
                    value={settings.checkoutTime}
                    onChange={(e) => updateSetting('checkoutTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Extended Hours</h4>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">Allow early drop-off and late pickup</p>
                </div>
                <Switch
                  checked={settings.extendedHoursEnabled}
                  onChange={(checked) => updateSetting('extendedHoursEnabled', checked)}
                />
              </div>

              {settings.extendedHoursEnabled && (
                <div className="ml-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Early Drop-Off
                      </label>
                      <input
                        type="time"
                        value={settings.earlyDropoffTime}
                        onChange={(e) => updateSetting('earlyDropoffTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Late Pickup
                      </label>
                      <input
                        type="time"
                        value={settings.latePickupTime}
                        onChange={(e) => updateSetting('latePickupTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <DollarSign className="inline-block w-4 h-4 mr-1" />
                        Early Drop-Off Fee
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-text-secondary">$</span>
                        <input
                          type="number"
                          value={(settings.earlyDropoffFeeCents / 100).toFixed(2)}
                          onChange={(e) => updateSetting('earlyDropoffFeeCents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                          min="0"
                          step="0.01"
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <DollarSign className="inline-block w-4 h-4 mr-1" />
                        Late Pickup Fee
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-text-secondary">$</span>
                        <input
                          type="number"
                          value={(settings.latePickupFeeCents / 100).toFixed(2)}
                          onChange={(e) => updateSetting('latePickupFeeCents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                          min="0"
                          step="0.01"
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Booking Windows */}
          <Card
            title="Booking Windows"
            description="Control when bookings can be made"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Advance
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.maxAdvanceDays}
                      onChange={(e) => updateSetting('maxAdvanceDays', parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                    />
                    <span className="text-sm text-gray-600 dark:text-text-secondary">days</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Minimum Advance
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.minAdvanceHours}
                      onChange={(e) => updateSetting('minAdvanceHours', parseInt(e.target.value) || 0)}
                      min="0"
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                    />
                    <span className="text-sm text-gray-600 dark:text-text-secondary">hours</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Cancellation Window
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.cancellationWindowHours}
                    onChange={(e) => updateSetting('cancellationWindowHours', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                  />
                  <span className="text-sm text-gray-600 dark:text-text-secondary">hours before check-in</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Save Button - Full Width */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
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

export default BookingConfig;
