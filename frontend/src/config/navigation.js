import { getLabel, defaultLabels } from '@/lib/terminology';

/**
 * Base sidebar section configuration
 * Items include a terminologyKey that maps to customizable labels
 */
const baseSidebarSections = [
  {
    id: 'today',
    label: 'Today',
    collapsible: false,
    items: [
      {
        path: '/today',
        terminologyKey: 'commandCenter',
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
      { path: '/owners', terminologyKey: 'owners', icon: 'user-round' },
      { path: '/pets', terminologyKey: 'pets', icon: 'paw-print' },
      { path: '/vaccinations', terminologyKey: 'vaccinations', icon: 'syringe' },
      { path: '/segments', terminologyKey: 'segments', icon: 'layers' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    collapsible: true,
    defaultExpanded: true,
    items: [
      { path: '/bookings', terminologyKey: 'bookings', icon: 'calendar-plus' },
      { path: '/run-schedules', terminologyKey: 'runSchedules', icon: 'calendar-days' },
      { path: '/tasks', terminologyKey: 'tasks', icon: 'check-square' },
      { path: '/kennels', terminologyKey: 'kennels', icon: 'home' },
      { path: '/incidents', terminologyKey: 'incidents', icon: 'alert-triangle' },
      { path: '/workflows', terminologyKey: 'workflows', icon: 'git-branch' },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    collapsible: true,
    defaultExpanded: false,
    items: [
      { path: '/messages', terminologyKey: 'messages', icon: 'message-square' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    collapsible: true,
    defaultExpanded: true,
    items: [
      { path: '/payments', terminologyKey: 'payments', icon: 'credit-card' },
      { path: '/invoices', terminologyKey: 'invoices', icon: 'file-text' },
      { path: '/packages', terminologyKey: 'packages', icon: 'gift' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    collapsible: true,
    defaultExpanded: false,
    items: [
      { path: '/staff', terminologyKey: 'team', icon: 'user-cog' },
      { path: '/reports', terminologyKey: 'reports', icon: 'bar-chart-3' },
      { path: '/settings', terminologyKey: 'settings', icon: 'settings' },
    ],
  },
];

/**
 * Get sidebar sections with dynamic labels based on tenant terminology
 * @param {object} terminology - Custom terminology object from tenant
 * @returns {Array} Sidebar sections with resolved labels
 */
export const getSidebarSections = (terminology = {}) => {
  return baseSidebarSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      label: item.terminologyKey
        ? getLabel(item.terminologyKey, terminology)
        : item.label,
    })),
  }));
};

/**
 * Static sidebar sections with default labels
 * For backwards compatibility
 */
export const sidebarSections = getSidebarSections({});

// Alias for backwards compatibility
export const navSections = sidebarSections;
