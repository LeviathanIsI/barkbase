import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { User, Building, Database, Settings as SettingsIcon, Bell, CreditCard, Users, Shield, FileText, AlertTriangle, Tag, Plug } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

const TAB_CONFIG = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    path: '/settings/profile',
    description: 'Manage your personal account and preferences'
  },
  {
    id: 'business',
    label: 'Business',
    icon: Building,
    path: '/settings/business',
    description: 'Company information and branding'
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    path: '/settings/team',
    description: 'Manage staff and permissions'
  },
  {
    id: 'facility',
    label: 'Facility',
    icon: Building,
    path: '/settings/facility',
    description: 'Kennels, locations, and inventory'
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    path: '/settings/billing',
    description: 'Subscription and payment settings'
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    path: '/settings/security',
    description: 'Security and access controls'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    path: '/settings/notifications',
    description: 'Email and communication preferences'
  },
  {
    id: 'data',
    label: 'Data',
    icon: Database,
    path: '/settings/properties',
    description: 'Custom fields and data management'
  },
  {
    id: 'services',
    label: 'Services & Pricing',
    icon: Tag,
    path: '/settings/services',
    description: 'Manage services, pricing, and packages'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    path: '/settings/integrations',
    description: 'Connect third-party apps and services'
  }
];

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const currentPath = location.pathname;

    // Handle special cases
    if (currentPath === '/settings/members') {
      return 'team';
    }

    // Handle facility sub-routes
    if (currentPath.startsWith('/settings/facility')) {
      return 'facility';
    }

    const activeTab = TAB_CONFIG.find(tab => currentPath.startsWith(tab.path));
    return activeTab?.id || 'profile';
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tabId) => {
    const tab = TAB_CONFIG.find(t => t.id === tabId);
    if (tab) {
      navigate(tab.path);
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary text-text-primary dark:bg-dark-bg-primary dark:text-dark-text-primary">
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Settings"
        title="Settings"
        description="Manage your account, team, and facility settings"
      />

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="bg-white dark:bg-surface-primary border-b border-gray-300 dark:border-surface-border mb-6">
          <div className="max-w-7xl mx-auto px-6">
            <TabsList className="flex overflow-x-auto gap-4 whitespace-nowrap">
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>
      </Tabs>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Tab Description */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-1">
            {TAB_CONFIG.find(tab => tab.id === activeTab)?.label}
          </h2>
          <p className="text-gray-600 dark:text-text-secondary">
            {TAB_CONFIG.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-surface-primary rounded-lg border border-gray-300 dark:border-surface-border shadow-sm">
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
