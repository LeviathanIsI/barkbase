import { Users, Shield, Clock, Lock, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const TeamSecurityPolicies = () => {
  return (
    <Card title="Team Security Policies" icon={Users}>
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Available on Pro and Enterprise plans
              </h4>
              <p className="text-sm text-blue-800">
                Enforce security requirements for all team members.
              </p>
            </div>
          </div>
        </div>

        {/* Password Requirements */}
        <div>
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            PASSWORD REQUIREMENTS
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Require strong passwords (8+ chars, mixed case, numbers)</span>
              <input type="checkbox" className="rounded border-gray-300" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Require password change every 90 days</span>
              <input type="checkbox" className="rounded border-gray-300" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Prevent password reuse (last 3 passwords)</span>
              <input type="checkbox" className="rounded border-gray-300" disabled />
            </div>
          </div>
        </div>

        {/* Access Controls */}
        <div>
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            ACCESS CONTROLS
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Require 2FA for all team members</span>
              <input type="checkbox" className="rounded border-gray-300" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-logout after 30 minutes of inactivity</span>
              <input type="checkbox" className="rounded border-gray-300" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Restrict access by IP address</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add IPs"
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                  disabled
                />
                <Button variant="outline" size="sm" disabled>
                  Add
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Require approval for new team invites</span>
              <input type="checkbox" className="rounded border-gray-300" disabled />
            </div>
          </div>
        </div>

        {/* Session Management */}
        <div>
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            SESSION MANAGEMENT
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Maximum session duration</span>
              <select className="px-3 py-2 border border-gray-300 rounded-md text-sm" disabled>
                <option>12 hours</option>
                <option>8 hours</option>
                <option>4 hours</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Force re-authentication for sensitive actions</span>
              <input type="checkbox" className="rounded border-gray-300" disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Single sign-on (SSO) only</span>
              <input type="checkbox" className="rounded border-gray-300" disabled />
            </div>
          </div>
        </div>

        {/* Upgrade Prompt */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
          <div className="text-center">
            <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-purple-900 mb-2">
              Advanced Security Controls
            </h4>
            <p className="text-purple-700 mb-4">
              Protect your entire team with enterprise-grade security policies, automated compliance, and centralized access management.
            </p>
            <div className="flex gap-3 justify-center">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Upgrade to Pro
              </Button>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
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
