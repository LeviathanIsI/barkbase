import Card from '@/components/ui/Card';
import UpgradeBanner from '@/components/ui/UpgradeBanner';
import StyledSelect from '@/components/ui/StyledSelect';
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
          <div className="block text-sm">
            <span className="font-medium text-text">Timeout after</span>
            <div className="mt-1 max-w-xs">
              <StyledSelect
                options={[
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '1 hour' },
                  { value: '120', label: '2 hours' },
                  { value: 'never', label: 'Never' },
                ]}
                value="30"
                onChange={() => {}}
                isDisabled={plan === 'FREE'}
                isClearable={false}
                isSearchable={false}
              />
            </div>
            {plan === 'FREE' && (
              <span className="mt-1 block text-xs text-muted">Upgrade to Pro to configure timeout</span>
            )}
          </div>
        </div>
      </Card>

      
      <Card title="Auto-Logout Interval" description="Users will be logged out at 11:59 PM after this duration.">
        <div className="space-y-3">
          <div className="block text-sm">
            <span className="font-medium text-text">Logout interval</span>
            <div className="mt-1 max-w-xs">
              <StyledSelect
                options={[
                  { value: 8, label: '8 hours' },
                  { value: 12, label: '12 hours' },
                  { value: 24, label: '24 hours (Default)' },
                  { value: 48, label: '48 hours' },
                  { value: 72, label: '72 hours' },
                ]}
                value={tenant?.autoLogoutIntervalHours || 24}
                onChange={(opt) => handleAutoLogoutChange(Number(opt?.value || 24))}
                isDisabled={isSaving}
                isClearable={false}
                isSearchable={false}
              />
            </div>
            <span className="mt-1 block text-xs text-muted">
              Users will be automatically logged out at 11:59 PM after the selected duration
            </span>
          </div>
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