export const sidebarSections = [
  {
    id: 'today',
    label: 'Today',
    collapsible: false,
    items: [
      {
        path: '/today',
        label: 'Command Center',
        icon: 'layout-dashboard',
        priority: 1,
      },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    collapsible: true,
    defaultExpanded: true,
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
    collapsible: true,
    defaultExpanded: true,
    items: [
      { path: '/bookings', label: 'Bookings', icon: 'calendar-plus' },
      { path: '/schedule', label: 'Schedule', icon: 'calendar-days' },
      { path: '/runs', label: 'Runs', icon: 'activity' },
      { path: '/tasks', label: 'Tasks', icon: 'check-square' },
      { path: '/kennels', label: 'Kennels', icon: 'home' },
      { path: '/operations', label: 'Ops Overview', icon: 'panels-top-left' },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    collapsible: true,
    defaultExpanded: false,
    items: [
      { path: '/messages', label: 'Messages', icon: 'message-square' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    collapsible: true,
    defaultExpanded: true,
    items: [
      { path: '/payments', label: 'Payments', icon: 'credit-card' },
      { path: '/invoices', label: 'Invoices', icon: 'file-text' },
      { path: '/reports', label: 'Reports', icon: 'bar-chart-3' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    collapsible: true,
    defaultExpanded: false,
    items: [
      { path: '/staff', label: 'Team', icon: 'user-cog' },
      { path: '/tenants', label: 'Tenants', icon: 'building-2' },
      { path: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];
