import Card from '@/components/ui/Card';
import UpgradeBanner from '@/components/ui/UpgradeBanner';
import { useTenantStore } from '@/stores/tenant';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import SettingsPage from '../components/SettingsPage';

const AccountSecurity = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const plan = tenant?.plan || 'FREE';

  return (
    
    <SettingsPage title="Account Security" description="Manage security settings for your entire workspace">
      <Card title="Two-Factor Authentication (2FA)" description="Add an extra layer of security to all staff accounts.">
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked />
            <span className="text-text">Enable 2FA (Optional for all users)</span>
          </label>
          {plan !== 'FREE' && (
            <label className="flex items-center gap-3">
              <input type="checkbox" />
              <span className="text-text">Require 2FA for all staff members</span>
            </label>
          )}
        </div>
      </Card>

      {plan === 'FREE' || plan === 'PRO' ? (
        <UpgradeBanner
          requiredPlan="ENTERPRISE"
          feature="Single Sign-On (SSO)"
        />
      ) : (
        <Card title="Single Sign-On (SSO)" description="Allow staff to sign in with existing corporate credentials.">
          <p className="text-sm text-muted">Configure SAML or OIDC integrations for enterprise SSO.</p>
        </Card>
      )}

      <Card title="Session Timeout" description="Automatically log out inactive users for security.">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-text">Timeout after</span>
            <select className="mt-1 w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2" disabled={plan === 'FREE'}>
              <option>15 minutes</option>
              <option selected>30 minutes</option>
              <option>1 hour</option>
              <option>2 hours</option>
              <option>Never</option>
            </select>
            {plan === 'FREE' && (
              <span className="mt-1 block text-xs text-muted">Upgrade to Pro to configure timeout</span>
            )}
          </label>
        </div>
      </Card>

      
      <Card title="Auto-Logout Interval" description="Users will be logged out at 11:59 PM after this duration.">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-text">Logout interval</span>
            <select 
              className="mt-1 w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2"
              value={tenant?.autoLogoutIntervalHours || 24}
              onChange={(e) => handleAutoLogoutChange(Number(e.target.value))}
              disabled={isSaving}
            >
              <option value={8}>8 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours (Default)</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
            <span className="mt-1 block text-xs text-muted">
              Users will be automatically logged out at 11:59 PM after the selected duration
            </span>
          </label>
        </div>
      </Card>


      <Card title="Password Policies" description="Set requirements for staff passwords.">
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked />
            <span className="text-text">Minimum 8 characters</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked={plan !== 'FREE'} disabled={plan === 'FREE'} />
            <span className="text-text">Require uppercase and lowercase</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked={plan !== 'FREE'} disabled={plan === 'FREE'} />
            <span className="text-text">Require numbers and special characters</span>
          </label>
          {plan === 'FREE' && (
            <p className="text-xs text-muted">Upgrade to Pro for advanced password policies</p>
          )}
        </div>
      </Card>

      <Card title="Login History" description="Track staff login activity and access patterns.">
        <p className="text-sm text-muted">
          Retention: {plan === 'FREE' ? '30 days' : plan === 'PRO' ? '90 days' : 'Unlimited'}
        </p>
      </Card>

      {plan === 'FREE' || plan === 'PRO' ? (
        <UpgradeBanner
          requiredPlan="ENTERPRISE"
          feature="IP Restrictions"
        />
      ) : (
        <Card title="IP Restrictions" description="Limit access to specific IP addresses or ranges.">
          <p className="text-sm text-muted">Restrict logins to your kennel's network only.</p>
        </Card>
      )}
    </SettingsPage>
  );
};

export default AccountSecurity;