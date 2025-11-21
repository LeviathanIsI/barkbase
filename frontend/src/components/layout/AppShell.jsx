import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import JumboSidebar from './JumboSidebar';
import JumboHeader from './JumboHeader';
import Button from '@/components/ui/Button';
import GlobalKeyboardShortcuts from '@/components/GlobalKeyboardShortcuts';
import { useUIStore } from '@/stores/ui';
import { useTenantStore } from '@/stores/tenant';
import { cn } from '@/lib/cn';

const AppShell = () => {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const tenant = useTenantStore((state) => state.tenant);
  const location = useLocation();
  const isSettingsRoute = location.pathname.startsWith('/settings');

  const handleMenuToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSidebarOpen((value) => !value);
    } else {
      toggleSidebar();
    }
  };

  const latestExportPath = tenant?.settings?.exports?.lastPath;
  const handleRestore = () => {
    if (!latestExportPath) {
      return;
    }
    const url = latestExportPath.startsWith('/') ? latestExportPath : `/${latestExportPath}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex min-h-screen bg-[#F5F6FA] dark:bg-[#0F0F1A] text-[#263238] dark:text-text-primary dark:text-text-primary">
      {/* Jumbo Dark Sidebar */}
      <JumboSidebar collapsed={collapsed} />

      <div className="flex w-full flex-col">
        {/* Jumbo Blue Header */}
        <JumboHeader onMenuToggle={handleMenuToggle} />

        {/* Global Keyboard Shortcuts Handler */}
        <GlobalKeyboardShortcuts />

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              'flex-1 bg-[#F5F6FA] dark:bg-[#0F0F1A]',
              isSettingsRoute ? 'overflow-hidden' : 'overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex gap-0 lg:hidden">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
          <div className="relative h-full w-64 bg-[#1E1E2D] dark:bg-[#1A1A2E] shadow-xl">
            <JumboSidebar collapsed={false} isMobile onNavigate={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Recovery Mode Modal */}
      {tenant?.recoveryMode ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#F5F6FA]/95 dark:bg-[#0F0F1A]/95 px-4 text-center">
          <div className="max-w-lg space-y-6 rounded-2xl border border-[#FF9800]/40 dark:border-[#FF9800]/60 bg-white dark:bg-surface-primary/95 p-8 shadow-2xl">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#FF9800] dark:text-[#FFA726]">Recovery mode</p>
              <h2 className="text-2xl font-semibold text-[#263238] dark:text-text-primary dark:text-text-primary">We detected database issues</h2>
              <p className="text-sm text-[#64748B] dark:text-text-secondary dark:text-text-secondary">
                BarkBase opened in read-only recovery mode. Download your most recent export or backup before making
                changes. Support cannot restore local data—use your latest export/backup to recover.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={handleRestore} disabled={!latestExportPath} className="bg-[#4B5DD3] hover:bg-[#3A4BC2] text-white">
                {latestExportPath ? 'Download latest export' : 'No export found yet'}
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload after restore
              </Button>
              <p className="text-xs text-[#64748B] dark:text-text-secondary dark:text-text-secondary">
                Tip: You can generate fresh exports from another device if this copy is unusable.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AppShell;
