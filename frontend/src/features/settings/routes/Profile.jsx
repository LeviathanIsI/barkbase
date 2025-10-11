import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import { useUserProfileQuery, useUpdateUserProfileMutation } from '../api-user';
import { useAuthStore } from '@/stores/auth';
import SettingsPage from '../components/SettingsPage';

const Profile = () => {
  const { data: profile, isLoading } = useUserProfileQuery();
  const updateProfile = useUpdateUserProfileMutation();
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState({
    name: profile?.name || user?.name || '',
    phone: profile?.phone || '',
    timezone: profile?.timezone || '',
    language: profile?.language || 'en',
  });

  // Update form when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        timezone: profile.timezone || '',
        language: profile.language || 'en',
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateProfile.mutateAsync(formData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    
    <SettingsPage title="Profile Settings" description="Manage your personal information and preferences">
      <Card title="Personal Information" description="Update your name, contact details, and regional settings.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={profile?.email || user?.email}
              disabled
              helper="Email cannot be changed here"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                Language
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text">
              Timezone
            </label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Auto-detect</option>
              <option value="America/New_York">Eastern Time (US)</option>
              <option value="America/Chicago">Central Time (US)</option>
              <option value="America/Denver">Mountain Time (US)</option>
              <option value="America/Los_Angeles">Pacific Time (US)</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
          </div>

          <div className="xl:col-span-2 flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: profile?.name || '',
                  phone: profile?.phone || '',
                  timezone: profile?.timezone || '',
                  language: profile?.language || 'en',
                });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Account Information"
        description="View account creation date and email verification status."
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Account Created</span>
            <span className="font-medium text-text">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Email Verified</span>
            <span className={`font-medium ${profile?.emailVerified ? 'text-success' : 'text-warning'}`}>
              {profile?.emailVerified ? 'Verified' : 'Not Verified'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Last Login</span>
            <span className="font-medium text-text">
              {profile?.lastLoginAt
                ? new Date(profile.lastLoginAt).toLocaleDateString() +
                  ' at ' +
                  new Date(profile.lastLoginAt).toLocaleTimeString()
                : 'Never'}
            </span>
          </div>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Profile;