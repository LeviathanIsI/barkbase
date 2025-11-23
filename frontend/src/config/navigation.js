export const navSections = [
  {
    id: 'core',
    title: 'Dashboard',
    items: [{ path: '/today', label: 'Dashboard' }],
  },
  {
    id: 'directory',
    title: 'Directory',
    items: [
      { path: '/pets-people', label: 'Clients' },
      { path: '/pets', label: 'Pets' },
      { path: '/owners', label: 'Owners' },
      { path: '/vaccinations', label: 'Vaccinations' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { path: '/bookings', label: 'Bookings' },
      { path: '/schedule', label: 'Schedule' },
      { path: '/runs', label: 'Runs' },
      { path: '/tasks', label: 'Tasks' },
      { path: '/kennels', label: 'Kennels' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    items: [
      { path: '/dashboard', label: 'Legacy Dashboard' },
      { path: '/reports', label: 'Reports' },
      { path: '/payments', label: 'Payments' },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    items: [
      { path: '/staff', label: 'Team' },
      { path: '/settings', label: 'Settings' },
      { path: '/tenants', label: 'Tenant Settings' },
    ],
  },
];

export const mainNavItems = navSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.id })),
);

// TODO: If the /today route is ever renamed, update the Dashboard entry here and adjust any consumers.

