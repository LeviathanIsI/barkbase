import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Button from '@/components/ui/Button';
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
    <div className="flex min-h-screen bg-background text-text">
      <Sidebar collapsed={collapsed} />
      <div className="flex w-full flex-col">
        <Header onMenuToggle={handleMenuToggle} />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              'flex-1 bg-background',
              isSettingsRoute ? 'overflow-hidden' : 'overflow-y-auto px-4 py-6 lg:px-8',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex gap-0 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
          <div className="relative h-full w-64 bg-surface shadow-xl">
            <Sidebar collapsed={false} isMobile onNavigate={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}
      {tenant?.recoveryMode ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 px-4 text-center">
          <div className="max-w-lg space-y-6 rounded-2xl border border-warning/40 bg-surface/95 p-8 shadow-2xl">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">Recovery mode</p>
              <h2 className="text-2xl font-semibold text-text">We detected database issues</h2>
              <p className="text-sm text-muted">
                BarkBase opened in read-only recovery mode. Download your most recent export or backup before making
                changes. Support cannot restore local data—use your latest export/backup to recover.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={handleRestore} disabled={!latestExportPath}>
                {latestExportPath ? 'Download latest export' : 'No export found yet'}
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload after restore
              </Button>
              <p className="text-xs text-muted">
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
