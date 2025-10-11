import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SettingsPage from '../components/SettingsPage';
import { useUpdatePasswordMutation } from '../api-user';

const Security = () => {
  const updatePassword = useUpdatePasswordMutation();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await updatePassword.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    }
  };

  return (
    <SettingsPage
      title="Security Settings"
      description="Control password policies, protect your team with two-factor authentication, and monitor active sessions across devices."
      contentClassName="grid grid-cols-1 gap-6 xl:grid-cols-2"
    >
      <Card
        title="Change Password"
        description="Update your password to keep your account secure."
        className="xl:col-span-2 border-border/80 shadow-sm"
      >
          <form onSubmit={handlePasswordSubmit} className="grid gap-4 lg:grid-cols-2">
            <Input
              label="Current Password"
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              autoComplete="current-password"
            />

            <Input
              label="New Password"
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              helper="Must be at least 8 characters"
              autoComplete="new-password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
              autoComplete="new-password"
            />

            <div className="lg:col-span-2 flex justify-end pt-2">
              <Button type="submit" disabled={updatePassword.isPending}>
                {updatePassword.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </Card>

      <Card
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account."
        className="border-border/80 shadow-sm"
      >
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
          <p className="text-sm text-warning">
            Two-factor authentication is not yet configured. This feature will be available soon.
          </p>
        </div>
      </Card>

      <Card
        title="Active Sessions"
        description="Manage your active login sessions across devices."
        className="border-border/80 shadow-sm"
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-surface/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Current Session</p>
                <p className="text-sm text-muted">This device • Active now</p>
              </div>
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                Active
              </span>
            </div>
          </div>
          <p className="text-sm text-muted">
            Session management features coming soon. You'll be able to view and revoke access from other devices.
          </p>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Security;
