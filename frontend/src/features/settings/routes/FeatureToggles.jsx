/**
 * Feature Toggles Settings
 * Enable or disable features for your organization
 */

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  CreditCard,
  Dog,
  FileText,
  MessageSquare,
  Package,
  Save,
  Scissors,
  Settings,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const FeatureToggles = () => {
  const tenant = useTenantStore((s) => s.tenant);
  const setTenant = useTenantStore((s) => s.setTenant);
  const hasWriteAccess = useAuthStore((s) => s.hasRole?.(['OWNER', 'ADMIN']) ?? true);

  const [features, setFeatures] = useState({
    grooming: true,
    daycare: true,
    boarding: true,
    messaging: true,
    payments: true,
    packages: true,
    advancedReports: false,
    aiFeatures: false,
    customerPortal: true,
    smsNotifications: false,
    multiLocation: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from tenant settings
  useEffect(() => {
    if (tenant?.features) {
      setFeatures((prev) => ({ ...prev, ...tenant.features }));
    }
  }, [tenant]);

  const handleToggle = (key) => {
    if (!hasWriteAccess) return;
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasWriteAccess) return;

    setIsSaving(true);
    try {
      // TODO: Save to API
      // await saveFeatureToggles(features);
      setTenant({ ...tenant, features });
      toast.success('Feature settings saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const featureGroups = [
    {
      title: 'Core Services',
      description: 'Primary service modules for your business',
      features: [
        {
          key: 'boarding',
          label: 'Boarding',
          description: 'Enable overnight boarding services and bookings',
          icon: Dog,
        },
        {
          key: 'daycare',
          label: 'Daycare',
          description: 'Enable daycare bookings and daily scheduling',
          icon: Calendar,
        },
        {
          key: 'grooming',
          label: 'Grooming',
          description: 'Enable grooming appointments and services',
          icon: Scissors,
        },
      ],
    },
    {
      title: 'Payments & Packages',
      description: 'Financial and billing features',
      features: [
        {
          key: 'payments',
          label: 'Online Payments',
          description: 'Enable online payment processing via Stripe',
          icon: CreditCard,
        },
        {
          key: 'packages',
          label: 'Packages & Credits',
          description: 'Sell packages and manage credit balances',
          icon: Package,
        },
      ],
    },
    {
      title: 'Communication',
      description: 'Customer communication tools',
      features: [
        {
          key: 'messaging',
          label: 'In-App Messaging',
          description: 'Enable internal and client messaging',
          icon: MessageSquare,
        },
        {
          key: 'smsNotifications',
          label: 'SMS Notifications',
          description: 'Send SMS alerts to customers (requires Twilio)',
          icon: Bell,
          badge: { label: 'Add-on', variant: 'info' },
        },
      ],
    },
    {
      title: 'Customer Experience',
      description: 'Self-service features for customers',
      features: [
        {
          key: 'customerPortal',
          label: 'Customer Portal',
          description: 'Allow customers to view bookings and make payments',
          icon: Users,
        },
      ],
    },
    {
      title: 'Advanced Features',
      description: 'Premium and beta capabilities',
      features: [
        {
          key: 'advancedReports',
          label: 'Advanced Reports',
          description: 'Enable advanced analytics, dashboards, and exports',
          icon: BarChart3,
          badge: { label: 'Premium', variant: 'accent' },
        },
        {
          key: 'multiLocation',
          label: 'Multi-Location',
          description: 'Manage multiple facility locations',
          icon: Settings,
          badge: { label: 'Premium', variant: 'accent' },
        },
        {
          key: 'aiFeatures',
          label: 'AI Assistant',
          description: 'AI-powered scheduling suggestions and insights',
          icon: Bot,
          badge: { label: 'Beta', variant: 'warning' },
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Feature Toggles</h1>
          <p className="text-sm text-muted mt-1">
            Enable or disable features for your organization. Changes apply immediately after saving.
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={!hasWriteAccess || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Feature Groups */}
      {featureGroups.map((group) => (
        <div key={group.title} className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-surface-secondary/50">
            <h3 className="text-base font-semibold text-text">{group.title}</h3>
            <p className="text-sm text-muted mt-0.5">{group.description}</p>
          </div>
          <div className="divide-y divide-border">
            {group.features.map((feature) => {
              const Icon = feature.icon;
              const isEnabled = features[feature.key];

              return (
                <div
                  key={feature.key}
                  className="flex items-center justify-between px-6 py-4 hover:bg-surface-secondary/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isEnabled
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-secondary text-muted"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm font-medium",
                          isEnabled ? "text-text" : "text-muted"
                        )}>
                          {feature.label}
                        </p>
                        {feature.badge && (
                          <Badge variant={feature.badge.variant} size="sm">
                            {feature.badge.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{feature.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(feature.key)}
                    disabled={!hasWriteAccess}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
                      isEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600',
                      !hasWriteAccess && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    )} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Need a feature that's not listed?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Some features require plan upgrades or additional setup. Contact support for custom feature requests or enterprise integrations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureToggles;
