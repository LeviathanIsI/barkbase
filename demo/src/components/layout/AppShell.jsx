/**
 * Demo App Shell
 * Main layout wrapper for the demo app.
 * Includes DemoModeBanner at the top and adjusted layout to account for it.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import GlobalKeyboardShortcuts from '@/components/GlobalKeyboardShortcuts';
import { DemoModeBanner } from '@/components/demo/DemoModeBanner';
import { DemoResetButton } from '@/components/demo/DemoResetButton';
import Sidebar from '@/components/navigation/Sidebar';
import Topbar from '@/components/navigation/Topbar';

const DEMO_BANNER_HEIGHT = '40px';

const AppShell = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--bb-color-bg-body)',
        color: 'var(--bb-color-text-primary)',
      }}
    >
      {/* Demo Mode Banner - Fixed at very top */}
      <DemoModeBanner />

      {/* Sidebar - adjusted top position for demo banner */}
      <aside
        className="fixed left-0 hidden h-screen w-[var(--bb-sidebar-width,240px)] flex-col border-r lg:flex"
        style={{
          top: DEMO_BANNER_HEIGHT,
          height: `calc(100vh - ${DEMO_BANNER_HEIGHT})`,
          backgroundColor: 'var(--bb-color-sidebar-bg)',
          borderColor: 'var(--bb-color-sidebar-border)',
          color: 'var(--bb-color-sidebar-text-primary)',
        }}
      >
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden" style={{ top: DEMO_BANNER_HEIGHT }}>
          <div
            className="flex-1"
            style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }}
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <Sidebar variant="mobile" onNavigate={() => setMobileSidebarOpen(false)} />
        </div>
      ) : null}

      {/* Main content area */}
      <div
        className="flex min-h-screen flex-col lg:pl-[var(--bb-sidebar-width,240px)]"
        style={{ paddingTop: DEMO_BANNER_HEIGHT }}
      >
        <Topbar onToggleSidebar={() => setMobileSidebarOpen(true)} />
        <GlobalKeyboardShortcuts />
        <main
          className="flex-1"
          style={{ backgroundColor: 'var(--bb-color-bg-body)' }}
        >
          {/* Global content rail */}
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
            <Outlet />
          </div>
        </main>

        {/* Demo Reset Button - Fixed bottom right */}
        <div className="fixed bottom-4 right-4 z-50">
          <DemoResetButton variant="default" />
        </div>
      </div>
    </div>
  );
};

export default AppShell;
