import { useState, useEffect } from 'react';
import { NavLink, Outlet, useParams, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { usePageView } from '@/hooks/useTelemetry';

/**
 * ObjectSetup - Generic setup/configuration page for BarkBase objects
 * Enterprise object setup interface with tabbed navigation
 */
const ObjectSetup = ({
  objectName,
  objectLabel,
  description,
  icon: Icon,
  tabs = [],
  children,
}) => {
  const location = useLocation();
  const basePath = location.pathname.split('/').slice(0, 4).join('/'); // /settings/objects/pets

  usePageView(`object-setup-${objectName}`);

  // Set document title
  useEffect(() => {
    document.title = `${objectLabel} | BarkBase`;
    return () => {
      document.title = 'BarkBase';
    };
  }, [objectLabel]);

  // Default tabs if none provided
  const defaultTabs = [
    { recordId: 'setup', label: 'Setup', path: '' },
    { recordId: 'associations', label: 'Associations', path: '/associations' },
    { recordId: 'lifecycle', label: 'Lifecycle Stage', path: '/lifecycle' },
    { recordId: 'customization', label: 'Record Customization', path: '/customization' },
    { recordId: 'preview', label: 'Preview Customization', path: '/preview' },
    { recordId: 'index', label: 'Index Customization', path: '/index' },
  ];

  const activeTabs = tabs.length > 0 ? tabs : defaultTabs;

  return (
    <div className="flex min-h-full flex-col">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className="h-8 w-8 text-primary" />}
          <h1 className="text-3xl font-semibold text-text">{objectLabel}</h1>
        </div>
        {description && (
          <p className="text-sm text-muted">{description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4 overflow-x-auto">
          {activeTabs.map((tab) => {
            const tabPath = `${basePath}${tab.path}`;
            const isActive = tab.path === ''
              ? location.pathname === basePath
              : location.pathname.startsWith(tabPath);

            return (
              <NavLink
                key={tab.recordId}
                to={tabPath}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-text hover:border-border',
                )}
              >
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default ObjectSetup;
