import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useUserProfileQuery, useUpdateUserProfileMutation } from '../api-user';
import SettingsPage from '../components/SettingsPage';

const Notifications = () => {
  const { data: profile, isLoading } = useUserProfileQuery();
  const updateProfile = useUpdateUserProfileMutation();

  const defaultPreferences = {
    email: true,
    sms: false,
    inApp: true,
    bookingReminders: true,
    vaccinationReminders: true,
  };

  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    if (profile?.preferences?.notifications) {
      setPreferences({ ...defaultPreferences, ...profile.preferences.notifications });
    }
  }, [profile]);

  const handleToggle = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        preferences: {
          ...profile?.preferences,
          notifications: preferences,
        },
      });
      toast.success('Notification preferences updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update preferences');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const Toggle = ({ enabled, onChange }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-border'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    
    <SettingsPage title="Notification Preferences" description="Control how and when you receive notifications">
      <Card title="Communication Channels" description="Choose how you want to be notified.">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-text">Email Notifications</p>
              <p className="text-sm text-muted">Receive notifications via email</p>
            </div>
            <Toggle enabled={preferences.email} onChange={() => handleToggle('email')} />
          </div>
          <div className="flex items-center justify-between border-t border-border/50 py-3">
            <div>
              <p className="font-medium text-text">SMS Notifications</p>
              <p className="text-sm text-muted">Receive text message alerts</p>
            </div>
            <Toggle enabled={preferences.sms} onChange={() => handleToggle('sms')} />
          </div>
          <div className="flex items-center justify-between border-t border-border/50 py-3">
            <div>
              <p className="font-medium text-text">In-App Notifications</p>
              <p className="text-sm text-muted">Show notifications in the app</p>
            </div>
            <Toggle enabled={preferences.inApp} onChange={() => handleToggle('inApp')} />
          </div>
        </div>
      </Card>

      <Card title="Activity Alerts" description="Manage specific event notifications.">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-text">Booking Reminders</p>
              <p className="text-sm text-muted">Get notified about upcoming bookings</p>
            </div>
            <Toggle
              enabled={preferences.bookingReminders}
              onChange={() => handleToggle('bookingReminders')}
            />
          </div>
          <div className="flex items-center justify-between border-t border-border/50 py-3">
            <div>
              <p className="font-medium text-text">Vaccination Reminders</p>
              <p className="text-sm text-muted">Alerts for expiring pet vaccinations</p>
            </div>
            <Toggle
              enabled={preferences.vaccinationReminders}
              onChange={() => handleToggle('vaccinationReminders')}
            />
          </div>
        </div>
      </Card>

      <div className="xl:col-span-2 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (profile?.preferences?.notifications) {
              setPreferences({ ...defaultPreferences, ...profile.preferences.notifications });
            } else {
              setPreferences(defaultPreferences);
            }
          }}
        >
          Reset
        </Button>
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </SettingsPage>
  );
};

export default Notifications;