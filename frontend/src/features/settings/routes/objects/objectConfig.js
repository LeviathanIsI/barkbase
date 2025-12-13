import {
  User, PawPrint, CalendarDays, Wrench, Building, Package,
  FileText, CreditCard, Ticket
} from 'lucide-react';

// Object type definitions with their configurations
export const OBJECT_TYPES = {
  owners: {
    id: 'owners',
    label: 'Owners',
    labelSingular: 'Owner',
    labelPlural: 'Owners',
    icon: User,
    description: 'Pet owners and their contact information',
    hasPipeline: false,
    primaryProperty: 'name',
    secondaryProperties: ['email', 'phone'],
    statuses: [
      { id: 'active', label: 'Active', color: '#10b981' },
      { id: 'inactive', label: 'Inactive', color: '#6b7280' },
      { id: 'churned', label: 'Churned', color: '#ef4444' },
    ],
  },
  pets: {
    id: 'pets',
    label: 'Pets',
    labelSingular: 'Pet',
    labelPlural: 'Pets',
    icon: PawPrint,
    description: 'Pet records and their information',
    hasPipeline: false,
    primaryProperty: 'name',
    secondaryProperties: ['breed', 'species'],
    statuses: [
      { id: 'active', label: 'Active', color: '#10b981' },
      { id: 'inactive', label: 'Inactive', color: '#6b7280' },
      { id: 'deceased', label: 'Deceased', color: '#374151' },
    ],
  },
  bookings: {
    id: 'bookings',
    label: 'Bookings',
    labelSingular: 'Booking',
    labelPlural: 'Bookings',
    icon: CalendarDays,
    description: 'Reservation and booking records',
    hasPipeline: true,
    primaryProperty: 'bookingNumber',
    secondaryProperties: ['checkIn', 'checkOut'],
    pipelineStages: [
      { id: 'pending', label: 'Pending', color: '#fbbf24', type: 'open' },
      { id: 'confirmed', label: 'Confirmed', color: '#3b82f6', type: 'open' },
      { id: 'checked_in', label: 'Checked In', color: '#8b5cf6', type: 'open' },
      { id: 'in_progress', label: 'In Progress', color: '#6366f1', type: 'open' },
      { id: 'checked_out', label: 'Checked Out', color: '#14b8a6', type: 'closed' },
      { id: 'completed', label: 'Completed', color: '#10b981', type: 'won' },
      { id: 'cancelled', label: 'Cancelled', color: '#ef4444', type: 'lost' },
      { id: 'no_show', label: 'No Show', color: '#f97316', type: 'lost' },
    ],
  },
  services: {
    id: 'services',
    label: 'Services',
    labelSingular: 'Service',
    labelPlural: 'Services',
    icon: Wrench,
    description: 'Service offerings and pricing',
    hasPipeline: false,
    primaryProperty: 'name',
    secondaryProperties: ['price', 'duration'],
    statuses: [
      { id: 'active', label: 'Active', color: '#10b981' },
      { id: 'inactive', label: 'Inactive', color: '#6b7280' },
      { id: 'archived', label: 'Archived', color: '#374151' },
    ],
  },
  facilities: {
    id: 'facilities',
    label: 'Facilities',
    labelSingular: 'Facility',
    labelPlural: 'Facilities',
    icon: Building,
    description: 'Kennels, runs, and accommodations',
    hasPipeline: false,
    primaryProperty: 'name',
    secondaryProperties: ['type', 'capacity'],
    statuses: [
      { id: 'active', label: 'Active', color: '#10b981' },
      { id: 'maintenance', label: 'Maintenance', color: '#f59e0b' },
      { id: 'inactive', label: 'Inactive', color: '#6b7280' },
    ],
  },
  packages: {
    id: 'packages',
    label: 'Packages',
    labelSingular: 'Package',
    labelPlural: 'Packages',
    icon: Package,
    description: 'Prepaid packages and subscriptions',
    hasPipeline: false,
    primaryProperty: 'name',
    secondaryProperties: ['price', 'credits'],
    statuses: [
      { id: 'active', label: 'Active', color: '#10b981' },
      { id: 'expired', label: 'Expired', color: '#f59e0b' },
      { id: 'discontinued', label: 'Discontinued', color: '#6b7280' },
    ],
  },
  invoices: {
    id: 'invoices',
    label: 'Invoices',
    labelSingular: 'Invoice',
    labelPlural: 'Invoices',
    icon: FileText,
    description: 'Billing invoices and statements',
    hasPipeline: true,
    primaryProperty: 'invoiceNumber',
    secondaryProperties: ['amount', 'dueDate'],
    pipelineStages: [
      { id: 'draft', label: 'Draft', color: '#9ca3af', type: 'open' },
      { id: 'sent', label: 'Sent', color: '#3b82f6', type: 'open' },
      { id: 'viewed', label: 'Viewed', color: '#8b5cf6', type: 'open' },
      { id: 'partially_paid', label: 'Partially Paid', color: '#f59e0b', type: 'open' },
      { id: 'paid', label: 'Paid', color: '#10b981', type: 'won' },
      { id: 'overdue', label: 'Overdue', color: '#ef4444', type: 'open' },
      { id: 'void', label: 'Void', color: '#374151', type: 'lost' },
    ],
  },
  payments: {
    id: 'payments',
    label: 'Payments',
    labelSingular: 'Payment',
    labelPlural: 'Payments',
    icon: CreditCard,
    description: 'Payment transactions',
    hasPipeline: true,
    primaryProperty: 'transactionId',
    secondaryProperties: ['amount', 'method'],
    pipelineStages: [
      { id: 'pending', label: 'Pending', color: '#fbbf24', type: 'open' },
      { id: 'processing', label: 'Processing', color: '#3b82f6', type: 'open' },
      { id: 'completed', label: 'Completed', color: '#10b981', type: 'won' },
      { id: 'failed', label: 'Failed', color: '#ef4444', type: 'lost' },
      { id: 'refunded', label: 'Refunded', color: '#8b5cf6', type: 'closed' },
      { id: 'disputed', label: 'Disputed', color: '#f97316', type: 'open' },
    ],
  },
  tickets: {
    id: 'tickets',
    label: 'Tickets',
    labelSingular: 'Ticket',
    labelPlural: 'Tickets',
    icon: Ticket,
    description: 'Support tickets and issues',
    hasPipeline: true,
    primaryProperty: 'ticketNumber',
    secondaryProperties: ['subject', 'priority'],
    pipelineStages: [
      { id: 'new', label: 'New', color: '#3b82f6', type: 'open' },
      { id: 'open', label: 'Open', color: '#8b5cf6', type: 'open' },
      { id: 'pending', label: 'Pending', color: '#f59e0b', type: 'open' },
      { id: 'in_progress', label: 'In Progress', color: '#6366f1', type: 'open' },
      { id: 'resolved', label: 'Resolved', color: '#10b981', type: 'won' },
      { id: 'closed', label: 'Closed', color: '#374151', type: 'closed' },
    ],
  },
};

// Default associations between objects
export const DEFAULT_ASSOCIATIONS = {
  owners: [
    { objectId: 'pets', cardinality: '1:many', label: 'Owner\'s Pets' },
    { objectId: 'bookings', cardinality: '1:many', label: 'Owner\'s Bookings' },
    { objectId: 'invoices', cardinality: '1:many', label: 'Owner\'s Invoices' },
    { objectId: 'packages', cardinality: '1:many', label: 'Owner\'s Packages' },
    { objectId: 'tickets', cardinality: '1:many', label: 'Owner\'s Tickets' },
  ],
  pets: [
    { objectId: 'owners', cardinality: 'many:1', label: 'Pet\'s Owner' },
    { objectId: 'bookings', cardinality: 'many:many', label: 'Pet\'s Bookings' },
    { objectId: 'tickets', cardinality: '1:many', label: 'Pet\'s Tickets' },
  ],
  bookings: [
    { objectId: 'owners', cardinality: 'many:1', label: 'Booking Owner' },
    { objectId: 'pets', cardinality: 'many:many', label: 'Booked Pets' },
    { objectId: 'services', cardinality: 'many:many', label: 'Booking Services' },
    { objectId: 'facilities', cardinality: 'many:1', label: 'Assigned Facility' },
    { objectId: 'invoices', cardinality: '1:many', label: 'Booking Invoices' },
    { objectId: 'tickets', cardinality: '1:many', label: 'Booking Tickets' },
  ],
  services: [
    { objectId: 'bookings', cardinality: 'many:many', label: 'Service Bookings' },
    { objectId: 'packages', cardinality: 'many:many', label: 'Included in Packages' },
  ],
  facilities: [
    { objectId: 'bookings', cardinality: '1:many', label: 'Facility Bookings' },
  ],
  packages: [
    { objectId: 'owners', cardinality: 'many:1', label: 'Package Owner' },
    { objectId: 'services', cardinality: 'many:many', label: 'Included Services' },
  ],
  invoices: [
    { objectId: 'owners', cardinality: 'many:1', label: 'Invoice Owner' },
    { objectId: 'bookings', cardinality: 'many:1', label: 'Related Booking' },
    { objectId: 'payments', cardinality: '1:many', label: 'Invoice Payments' },
  ],
  payments: [
    { objectId: 'invoices', cardinality: 'many:1', label: 'Payment Invoice' },
  ],
  tickets: [
    { objectId: 'owners', cardinality: 'many:1', label: 'Ticket Owner' },
    { objectId: 'pets', cardinality: 'many:1', label: 'Related Pet' },
    { objectId: 'bookings', cardinality: 'many:1', label: 'Related Booking' },
  ],
};

// Get tabs for an object type
export const getObjectTabs = (objectType) => {
  const config = OBJECT_TYPES[objectType];
  if (!config) return [];

  const tabs = [
    { id: 'setup', label: 'Setup', path: '' },
    { id: 'associations', label: 'Associations', path: '/associations' },
  ];

  // Add Pipelines tab for pipeline objects, Status tab for others
  if (config.hasPipeline) {
    tabs.push({ id: 'pipelines', label: 'Pipelines', path: '/pipelines' });
  } else {
    tabs.push({ id: 'status', label: 'Lifecycle Stage', path: '/lifecycle' });
  }

  tabs.push(
    { id: 'record', label: 'Record Customization', path: '/record' },
    { id: 'preview', label: 'Preview Customization', path: '/preview' },
    { id: 'index', label: 'Index Customization', path: '/index' }
  );

  return tabs;
};
