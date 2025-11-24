import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import GlobalKeyboardShortcuts from '@/components/GlobalKeyboardShortcuts';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/stores/tenant';
import Sidebar from '@/components/navigation/Sidebar';
import Topbar from '@/components/navigation/Topbar';

const AppShell = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const latestExportPath = tenant?.settings?.exports?.lastPath;
  const handleRestore = () => {
    if (!latestExportPath) return;
    const url = latestExportPath.startsWith('/') ? latestExportPath : `/${latestExportPath}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[color:var(--bb-color-bg-body,#f5f5f4)] text-[color:var(--bb-color-text-primary,#0f172a)]">
      <Sidebar />

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
          <Sidebar variant="mobile" onNavigate={() => setMobileSidebarOpen(false)} />
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col lg:pl-[var(--bb-sidebar-width,240px)]">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen(true)} />
        <GlobalKeyboardShortcuts />
        <main className="flex-1 bg-[color:var(--bb-color-bg-body,#f5f5f4)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      {tenant?.recoveryMode ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 text-center backdrop-blur">
          <div className="max-w-lg space-y-6 rounded-lg border border-warning-600/30 bg-white p-8 shadow-2xl">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning-600">Recovery mode</p>
              <h2 className="text-2xl font-semibold text-gray-900">We detected database issues</h2>
              <p className="text-sm text-gray-600">
                BarkBase opened in read-only recovery mode. Download your most recent export or backup before making
                changes. Support cannot restore local data—use your latest export/backup to recover.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={handleRestore} disabled={!latestExportPath} variant="primary">
                {latestExportPath ? 'Download latest export' : 'No export found yet'}
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Reload after restore
              </Button>
              <p className="text-xs text-gray-600">
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
