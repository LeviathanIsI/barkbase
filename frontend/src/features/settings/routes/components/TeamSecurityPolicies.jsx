import { Users, Shield, Clock, Lock, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';

const TeamSecurityPolicies = () => {
  return (
    <Card title="Team Security Policies" icon={Users}>
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Available on Pro and Enterprise plans
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Enforce security requirements for all team members.
              </p>
            </div>
          </div>
        </div>

        {/* Password Requirements */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            PASSWORD REQUIREMENTS
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Require strong passwords (8+ chars, mixed case, numbers)</span>
              <input type="checkbox" className="rounded border-gray-300 dark:border-surface-border" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Require password change every 90 days</span>
              <input type="checkbox" className="rounded border-gray-300 dark:border-surface-border" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Prevent password reuse (last 3 passwords)</span>
              <input type="checkbox" className="rounded border-gray-300 dark:border-surface-border" disabled />
            </div>
          </div>
        </div>

        {/* Access Controls */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            ACCESS CONTROLS
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Require 2FA for all team members</span>
              <input type="checkbox" className="rounded border-gray-300 dark:border-surface-border" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-logout after 30 minutes of inactivity</span>
              <input type="checkbox" className="rounded border-gray-300 dark:border-surface-border" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Restrict access by IP address</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add IPs"
                  className="px-2 py-1 border border-gray-300 dark:border-surface-border rounded text-sm w-32"
                  disabled
                />
                <Button variant="outline" size="sm" disabled>
                  Add
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Require approval for new team invites</span>
              <input type="checkbox" className="rounded border-gray-300 dark:border-surface-border" disabled />
            </div>
          </div>
        </div>

        {/* Session Management */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            SESSION MANAGEMENT
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Maximum session duration</span>
              <div className="min-w-[140px]">
                <StyledSelect
                  options={[
                    { value: '12', label: '12 hours' },
                    { value: '8', label: '8 hours' },
                    { value: '4', label: '4 hours' },
                  ]}
                  defaultValue="12"
                  isDisabled={true}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Force re-authentication for sensitive actions</span>
              <input type="checkbox" className="rounded border-gray-300 dark:border-surface-border" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Single sign-on (SSO) only</span>
              <input type="checkbox" className="rounded border-gray-300 dark:border-surface-border" disabled />
            </div>
          </div>
        </div>

        {/* Upgrade Prompt */}
        <div className="bg-primary-50 dark:bg-surface-primary border border-purple-200 dark:border-purple-900/30 rounded-lg p-6">
          <div className="text-center">
            <Shield className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Advanced Security Controls
            </h4>
            <p className="text-purple-700 dark:text-purple-300 mb-4">
              Protect your entire team with enterprise-grade security policies, automated compliance, and centralized access management.
            </p>
            <div className="flex gap-3 justify-center">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Upgrade to Pro
              </Button>
              <Button variant="outline" className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:bg-surface-primary">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TeamSecurityPolicies;
