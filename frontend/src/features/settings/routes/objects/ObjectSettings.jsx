import { useState, useEffect } from 'react';
import { useParams, useLocation, NavLink, Navigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { OBJECT_TYPES, getObjectTabs } from './objectConfig';

// Import tab components
import ObjectSetupTab from './tabs/ObjectSetupTab';
import ObjectAssociationsTab from './tabs/ObjectAssociationsTab';
import ObjectPipelinesTab from './tabs/ObjectPipelinesTab';
import ObjectLifecycleTab from './tabs/ObjectLifecycleTab';
import ObjectRecordCustomizationTab from './tabs/ObjectRecordCustomizationTab';
import ObjectPreviewCustomizationTab from './tabs/ObjectPreviewCustomizationTab';
import ObjectIndexCustomizationTab from './tabs/ObjectIndexCustomizationTab';

const ObjectSettings = () => {
  const { objectType } = useParams();
  const location = useLocation();
  const config = OBJECT_TYPES[objectType];

  // Redirect if object type not found
  if (!config) {
    return <Navigate to="/settings/objects/pets" replace />;
  }

  const tabs = getObjectTabs(objectType);
  const Icon = config.icon;

  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    const basePath = `/settings/objects/${objectType}`;

    if (path === basePath || path === `${basePath}/`) {
      return 'setup';
    }

    const segment = path.replace(basePath, '').replace(/^\//, '');

    // Map URL segments to tab IDs
    const segmentToTab = {
      'associations': 'associations',
      'pipelines': 'pipelines',
      'lifecycle': 'status',
      'record': 'record',
      'preview': 'preview',
      'index': 'index',
    };

    return segmentToTab[segment] || 'setup';
  };

  const activeTab = getActiveTab();

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'setup':
        return <ObjectSetupTab objectType={objectType} />;
      case 'associations':
        return <ObjectAssociationsTab objectType={objectType} />;
      case 'pipelines':
        return <ObjectPipelinesTab objectType={objectType} />;
      case 'status':
        return <ObjectLifecycleTab objectType={objectType} />;
      case 'record':
        return <ObjectRecordCustomizationTab objectType={objectType} />;
      case 'preview':
        return <ObjectPreviewCustomizationTab objectType={objectType} />;
      case 'index':
        return <ObjectIndexCustomizationTab objectType={objectType} />;
      default:
        return <ObjectSetupTab objectType={objectType} />;
    }
  };

  // Set document title
  useEffect(() => {
    document.title = `${config.label} Settings | BarkBase`;
    return () => {
      document.title = 'BarkBase';
    };
  }, [config.label]);

  const basePath = `/settings/objects/${objectType}`;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">{config.label}</h1>
            <p className="text-sm text-muted">{config.description}</p>
          </div>
        </div>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          View {config.label} in the data model
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const tabPath = tab.path === '' ? basePath : `${basePath}${tab.path}`;
            const isActive = activeTab === tab.id;

            return (
              <NavLink
                key={tab.id}
                to={tabPath}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-text hover:border-border'
                )}
              >
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ObjectSettings;
