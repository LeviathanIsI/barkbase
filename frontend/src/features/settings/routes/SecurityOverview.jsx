import { useState } from 'react';
import {
  Shield, Lock, Smartphone, Eye, Key, FileText,
  Database, TrendingUp, Users, Bell, AlertTriangle,
  CheckCircle, Clock, MapPin
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import PasswordStrengthMeter from './components/PasswordStrengthMeter';
import ActiveSessions from './components/ActiveSessions';
import TwoFactorAuth from './components/TwoFactorAuth';
import LoginHistory from './components/LoginHistory';
import APIKeys from './components/APIKeys';
import SecurityAudit from './components/SecurityAudit';
import PrivacyControls from './components/PrivacyControls';
import SecurityScore from './components/SecurityScore';
import TeamSecurityPolicies from './components/TeamSecurityPolicies';
import SecurityNotifications from './components/SecurityNotifications';
import { useChangePasswordMutation } from '@/features/auth/api';

const SecurityOverview = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const changePassword = useChangePasswordMutation();

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
      await changePassword.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to update password');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Security</h1>
          <p className="mt-1 text-sm text-muted">Manage your account security, authentication, and access controls</p>
        </div>
      </header>

      {/* Security Score Overview */}
      <SecurityScore />

      {/* Password Management */}
      <Card title="Password Security" icon={Lock}>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <PasswordStrengthMeter password={passwordData.newPassword} />

          <div className="flex justify-end">
            <Button type="submit">
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Two-Factor Authentication */}
      <TwoFactorAuth />

      {/* Active Sessions */}
      <ActiveSessions />

      {/* Login History */}
      <LoginHistory />

      {/* API Keys & Access Tokens */}
      <APIKeys />

      {/* Security Audit Log */}
      <SecurityAudit />

      {/* Privacy & Data Protection */}
      <PrivacyControls />

      {/* Team Security Policies */}
      <TeamSecurityPolicies />

      {/* Security Notifications */}
      <SecurityNotifications />
    </div>
  );
};

export default SecurityOverview;
