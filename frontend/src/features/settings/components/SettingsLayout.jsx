import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { User, Building, Database, Settings as SettingsIcon, Bell, CreditCard, Users, Shield, FileText, AlertTriangle, Tag, Plug } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";

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
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Settings"
        title="Settings"
        description="Manage your account, team, and facility settings"
      />

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-surface-primary border-b border-[#E0E0E0] mb-6">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-3 px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-[#4B5DD3] text-[#4B5DD3]'
                      : 'border-transparent text-[#64748B] hover:text-[#263238] hover:border-[#E0E0E0]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Tab Description */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#263238] mb-1">
            {TAB_CONFIG.find(tab => tab.id === activeTab)?.label}
          </h2>
          <p className="text-[#64748B]">
            {TAB_CONFIG.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-surface-primary rounded-lg border border-[#E0E0E0] shadow-sm">
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
