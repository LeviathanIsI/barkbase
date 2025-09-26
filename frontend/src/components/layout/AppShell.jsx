import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '@/stores/ui';
import { cn } from '@/lib/cn';

const AppShell = () => {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleMenuToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSidebarOpen((value) => !value);
    } else {
      toggleSidebar();
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-text">
      <Sidebar collapsed={collapsed} />
      <div className="flex w-full flex-col">
        <Header onMenuToggle={handleMenuToggle} />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className={cn('flex-1 overflow-y-auto bg-background px-4 py-6 lg:px-8')}>
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
    </div>
  );
};

export default AppShell;
