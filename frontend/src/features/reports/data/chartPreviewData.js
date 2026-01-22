// Sample data for chart type previews
// Used when hovering over chart type buttons to show what each chart looks like

// Time series - weekly bookings (for line, area)
export const PREVIEW_TIME_SERIES = [
  { name: 'Mon', bookings: 45, revenue: 1200 },
  { name: 'Tue', bookings: 52, revenue: 1400 },
  { name: 'Wed', bookings: 48, revenue: 1350 },
  { name: 'Thu', bookings: 61, revenue: 1600 },
  { name: 'Fri', bookings: 75, revenue: 2100 },
  { name: 'Sat', bookings: 82, revenue: 2400 },
  { name: 'Sun', bookings: 67, revenue: 1900 },
];

// Categories - services (for bar, column, treemap)
export const PREVIEW_CATEGORIES = [
  { name: 'Boarding', value: 4200 },
  { name: 'Grooming', value: 2800 },
  { name: 'Daycare', value: 3600 },
  { name: 'Training', value: 1400 },
];

// Proportions - pet types (for pie, donut)
export const PREVIEW_PROPORTIONS = [
  { name: 'Dogs', value: 65 },
  { name: 'Cats', value: 25 },
  { name: 'Other', value: 10 },
];

// Funnel - booking stages
export const PREVIEW_FUNNEL = [
  { name: 'Inquiries', value: 100 },
  { name: 'Quotes', value: 75 },
  { name: 'Bookings', value: 45 },
  { name: 'Completed', value: 42 },
];

// Table data - sample bookings
export const PREVIEW_TABLE = [
  { pet: 'Max', owner: 'Smith', service: 'Boarding', amount: '$150' },
  { pet: 'Bella', owner: 'Johnson', service: 'Grooming', amount: '$65' },
  { pet: 'Luna', owner: 'Williams', service: 'Daycare', amount: '$45' },
  { pet: 'Charlie', owner: 'Brown', service: 'Training', amount: '$200' },
];

// Pivot - cross-tabulated data (Service vs Pet Type)
export const PREVIEW_PIVOT = {
  rows: ['Boarding', 'Grooming', 'Daycare', 'Training'],
  columns: ['Dogs', 'Cats', 'Other'],
  data: [
    [45, 12, 3],   // Boarding
    [28, 15, 2],   // Grooming
    [52, 8, 4],    // Daycare
    [18, 5, 1],    // Training
  ]
};

// Treemap - hierarchical data for Recharts Treemap
export const PREVIEW_TREEMAP = [
  { name: 'Boarding', size: 4200 },
  { name: 'Grooming', size: 2800 },
  { name: 'Daycare', size: 3600 },
  { name: 'Training', size: 1400 },
];

// Sankey - nodes and links for flow diagram
export const PREVIEW_SANKEY = {
  nodes: [
    { name: 'Website' },
    { name: 'Referral' },
    { name: 'Walk-in' },
    { name: 'Inquiry' },
    { name: 'Booking' },
  ],
  links: [
    { source: 0, target: 3, value: 50 },  // Website → Inquiry
    { source: 1, target: 3, value: 30 },  // Referral → Inquiry
    { source: 2, target: 3, value: 20 },  // Walk-in → Inquiry
    { source: 3, target: 4, value: 75 },  // Inquiry → Booking
  ]
};

// Stacked data - bookings by pet type per day
export const PREVIEW_STACKED = [
  { name: 'Mon', dogs: 30, cats: 12, other: 3 },
  { name: 'Tue', dogs: 35, cats: 14, other: 3 },
  { name: 'Wed', dogs: 32, cats: 13, other: 3 },
  { name: 'Thu', dogs: 40, cats: 16, other: 5 },
  { name: 'Fri', dogs: 50, cats: 20, other: 5 },
  { name: 'Sat', dogs: 55, cats: 22, other: 5 },
  { name: 'Sun', dogs: 45, cats: 18, other: 4 },
];

// Map chart types to their preview configuration
export const CHART_PREVIEW_CONFIG = {
  line: {
    data: PREVIEW_TIME_SERIES,
    dataKey: 'bookings',
    nameKey: 'name',
    label: 'Bookings'
  },
  bar: {
    data: PREVIEW_CATEGORIES,
    dataKey: 'value',
    nameKey: 'name',
    label: 'Revenue'
  },
  column: {
    data: PREVIEW_CATEGORIES,
    dataKey: 'value',
    nameKey: 'name',
    label: 'Revenue'
  },
  area: {
    data: PREVIEW_TIME_SERIES,
    dataKey: 'bookings',
    nameKey: 'name',
    label: 'Bookings'
  },
  pie: {
    data: PREVIEW_PROPORTIONS,
    dataKey: 'value',
    nameKey: 'name',
    label: 'Pet Types'
  },
  donut: {
    data: PREVIEW_PROPORTIONS,
    dataKey: 'value',
    nameKey: 'name',
    label: 'Pet Types'
  },
  stacked: {
    data: PREVIEW_STACKED,
    series: ['dogs', 'cats', 'other'],
    nameKey: 'name',
    label: 'Bookings by Type'
  },
  table: {
    data: PREVIEW_TABLE,
    label: 'Bookings'
  },
  pivot: {
    data: PREVIEW_PIVOT,
    label: 'Service by Pet Type'
  },
  treemap: {
    data: PREVIEW_TREEMAP,
    dataKey: 'size',
    nameKey: 'name',
    label: 'Services'
  },
  funnel: {
    data: PREVIEW_FUNNEL,
    dataKey: 'value',
    nameKey: 'name',
    label: 'Booking Funnel'
  },
  sankey: {
    data: PREVIEW_SANKEY,
    label: 'Customer Flow'
  },
  gauge: {
    value: 73,
    target: 100,
    label: 'Occupancy %'
  },
};
