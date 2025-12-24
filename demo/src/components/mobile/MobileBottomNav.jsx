import { Home, Calendar, Users, PawPrint, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * MobileBottomNav Component
 * Bottom navigation bar for mobile devices (replaces sidebar)
 * Phase 3: Mobile-specific views
 */
const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { id: 'today', icon: Home, label: 'Today', path: '/today', active: location.pathname === '/today' },
    { id: 'schedule', icon: Calendar, label: 'Schedule', path: '/schedule', active: location.pathname.startsWith('/schedule') },
    { id: 'pets', icon: PawPrint, label: 'Pets', path: '/pets', active: location.pathname.startsWith('/pets') },
    { id: 'owners', icon: Users, label: 'Owners', path: '/owners', active: location.pathname.startsWith('/owners') },
    { id: 'more', icon: Menu, label: 'More', path: '/settings', active: location.pathname.startsWith('/settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-primary border-t border-gray-200 dark:border-surface-border z-50 lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-3 min-w-[64px] min-h-[56px] transition-colors',
                item.active
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-text-secondary hover:text-primary-600 dark:hover:text-primary-400'
              )}
            >
              <Icon className={cn('w-6 h-6 mb-1', item.active && 'stroke-[2.5px]')} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
