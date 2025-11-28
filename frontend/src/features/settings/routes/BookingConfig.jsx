import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Input from '@/components/ui/Input';
import SettingsPage from '../components/SettingsPage';
import { Calendar, Clock, DollarSign, Shield, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

const BookingConfig = () => {
  const [settings, setSettings] = useState({
    requireDeposit: true,
    depositPercentage: 25,
    allowOnlineBooking: true,
    maxAdvanceBooking: 90,
    minAdvanceBooking: 24,
    requireVaccinations: true,
    allowWaitlist: true,
    cancellationHours: 48,
    checkInTime: '08:00',
    checkOutTime: '17:00',
    extendedHours: false,
    extendedCheckIn: '06:00',
    extendedCheckOut: '20:00'
  });

  const handleSave = async () => {
    try {
      await apiClient.put('/api/v1/settings/booking', settings);
      toast.success('Booking settings saved successfully!');
    } catch (error) {
      console.error('Error saving booking settings:', error);
      toast.error(error.message || 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPage 
      title="Booking Configuration" 
      description="Manage booking rules and policies"
    >
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
              checked={settings.allowOnlineBooking}
              onChange={(checked) => updateSetting('allowOnlineBooking', checked)}
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
                  onChange={(e) => updateSetting('depositPercentage', parseInt(e.target.value))}
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
              checked={settings.allowWaitlist}
              onChange={(checked) => updateSetting('allowWaitlist', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Booking Windows */}
      <Card 
        title="Booking Windows" 
        description="Control when bookings can be made"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="inline-block w-4 h-4 mr-2" />
              Maximum Advance Booking
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.maxAdvanceBooking}
                onChange={(e) => updateSetting('maxAdvanceBooking', parseInt(e.target.value))}
                min="1"
                className="w-20 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
              />
              <span className="text-sm text-gray-600 dark:text-text-secondary">days</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock className="inline-block w-4 h-4 mr-2" />
              Minimum Advance Booking
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.minAdvanceBooking}
                onChange={(e) => updateSetting('minAdvanceBooking', parseInt(e.target.value))}
                min="0"
                className="w-20 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
              />
              <span className="text-sm text-gray-600 dark:text-text-secondary">hours</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Shield className="inline-block w-4 h-4 mr-2" />
              Cancellation Window
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.cancellationHours}
                onChange={(e) => updateSetting('cancellationHours', parseInt(e.target.value))}
                min="0"
                className="w-20 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
              />
              <span className="text-sm text-gray-600 dark:text-text-secondary">hours before check-in</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Operating Hours */}
      <Card 
        title="Operating Hours" 
        description="Set your check-in and check-out times"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Standard Check-In Time
              </label>
              <input
                type="time"
                value={settings.checkInTime}
                onChange={(e) => updateSetting('checkInTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Standard Check-Out Time
              </label>
              <input
                type="time"
                value={settings.checkOutTime}
                onChange={(e) => updateSetting('checkOutTime', e.target.value)}
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
              checked={settings.extendedHours}
              onChange={(checked) => updateSetting('extendedHours', checked)}
            />
          </div>

          {settings.extendedHours && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Extended Check-In Time
                </label>
                <input
                  type="time"
                  value={settings.extendedCheckIn}
                  onChange={(e) => updateSetting('extendedCheckIn', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Extended Check-Out Time
                </label>
                <input
                  type="time"
                  value={settings.extendedCheckOut}
                  onChange={(e) => updateSetting('extendedCheckOut', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSave}>
            <Settings className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default BookingConfig;