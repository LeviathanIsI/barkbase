import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import GlobalKeyboardShortcuts from '@/components/GlobalKeyboardShortcuts';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/stores/tenant';
import { useUIStore } from '@/stores/ui';
import Sidebar from '@/components/navigation/Sidebar';
import Topbar from '@/components/navigation/Topbar';

const AppShell = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const latestExportPath = tenant?.settings?.exports?.lastPath;
  const handleRestore = () => {
    if (!latestExportPath) return;
    const url = latestExportPath.startsWith('/') ? latestExportPath : `/${latestExportPath}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--bb-color-bg-body)',
        color: 'var(--bb-color-text-primary)',
      }}
    >
      <Sidebar />

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="flex-1"
            style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }}
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <Sidebar variant="mobile" onNavigate={() => setMobileSidebarOpen(false)} />
        </div>
      ) : null}

      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-[64px]' : 'lg:pl-[var(--bb-sidebar-width,240px)]'
        }`}
      >
        <Topbar onToggleSidebar={() => setMobileSidebarOpen(true)} />
        <GlobalKeyboardShortcuts />
        <main
          className="flex-1"
          style={{ backgroundColor: 'var(--bb-color-bg-body)' }}
        >
          {/* Global content rail - wide layout for SaaS app with comfortable side padding */}
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {tenant?.recoveryMode ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4 text-center backdrop-blur"
          style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }}
        >
          <div
            className="max-w-lg space-y-6 rounded-lg border p-8 shadow-2xl"
            style={{
              backgroundColor: 'var(--bb-color-bg-surface)',
              borderColor: 'var(--bb-color-accent-soft)',
            }}
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bb-color-accent)]">
                Recovery mode
              </p>
              <h2 className="text-2xl font-semibold text-[color:var(--bb-color-text-primary)]">
                We detected database issues
              </h2>
              <p className="text-sm text-[color:var(--bb-color-text-muted)]">
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
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">
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
