export const sidebarSections = [
  {
    id: 'today',
    label: 'Today',
    items: [
      {
        path: '/today',
        label: 'Command Center',
        icon: 'layout-dashboard',
        priority: 1,
      },
      {
        path: '/dashboard',
        label: 'Legacy Dashboard',
        icon: 'home',
      },
    ],
  },
  {
    id: 'clients',
    label: 'Clients & Records',
    items: [
      { path: '/pets-people', label: 'Clients', icon: 'users' },
      { path: '/pets', label: 'Pets', icon: 'paw-print' },
      { path: '/owners', label: 'Owners', icon: 'user-round' },
      { path: '/vaccinations', label: 'Vaccinations', icon: 'syringe' },
      { path: '/segments', label: 'Segments', icon: 'layers' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { path: '/bookings', label: 'Bookings', icon: 'calendar-plus' },
      { path: '/schedule', label: 'Schedule', icon: 'calendar-days' },
      { path: '/calendar', label: 'Calendar', icon: 'calendar' },
      { path: '/runs', label: 'Runs', icon: 'activity' },
      { path: '/tasks', label: 'Tasks', icon: 'check-square' },
      { path: '/kennels', label: 'Kennels', icon: 'home' },
      { path: '/operations', label: 'Ops Overview', icon: 'panels-top-left' },
      { path: '/messages', label: 'Messages', icon: 'message-square' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Reporting',
    items: [
      { path: '/payments', label: 'Payments', icon: 'credit-card' },
      { path: '/invoices', label: 'Invoices', icon: 'file-text' },
      { path: '/reports', label: 'Reports', icon: 'bar-chart-3' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      { path: '/staff', label: 'Team', icon: 'user-cog' },
      { path: '/tenants', label: 'Tenants', icon: 'building-2' },
      { path: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

