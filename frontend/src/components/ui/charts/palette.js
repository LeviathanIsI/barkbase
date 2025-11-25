/**
 * Chart Palette Utilities
 * Centralized color palette for all charts using design tokens
 */

// Primary chart colors (use CSS variables for theme support)
export const chartPalette = {
  primary: 'var(--bb-color-chart-blue)',
  success: 'var(--bb-color-chart-green)',
  warning: 'var(--bb-color-chart-yellow)',
  danger: 'var(--bb-color-chart-red)',
  purple: 'var(--bb-color-chart-purple)',
  teal: 'var(--bb-color-chart-teal)',
  pink: 'var(--bb-color-chart-pink)',
  orange: 'var(--bb-color-chart-orange)',
};

// Soft fills for area charts
export const chartSoftPalette = {
  primary: 'var(--bb-color-chart-blue-soft)',
  success: 'var(--bb-color-chart-green-soft)',
  warning: 'var(--bb-color-chart-yellow-soft)',
  danger: 'var(--bb-color-chart-red-soft)',
  purple: 'var(--bb-color-chart-purple-soft)',
  teal: 'var(--bb-color-chart-teal-soft)',
  pink: 'var(--bb-color-chart-pink-soft)',
  orange: 'var(--bb-color-chart-orange-soft)',
};

// Ordered array for multi-series charts
export const chartColorSequence = [
  'var(--bb-color-chart-blue)',
  'var(--bb-color-chart-green)',
  'var(--bb-color-chart-purple)',
  'var(--bb-color-chart-yellow)',
  'var(--bb-color-chart-teal)',
  'var(--bb-color-chart-pink)',
  'var(--bb-color-chart-orange)',
  'var(--bb-color-chart-red)',
];

export const chartSoftColorSequence = [
  'var(--bb-color-chart-blue-soft)',
  'var(--bb-color-chart-green-soft)',
  'var(--bb-color-chart-purple-soft)',
  'var(--bb-color-chart-yellow-soft)',
  'var(--bb-color-chart-teal-soft)',
  'var(--bb-color-chart-pink-soft)',
  'var(--bb-color-chart-orange-soft)',
  'var(--bb-color-chart-red-soft)',
];

// Chart theme configuration for Recharts
export const chartTheme = {
  grid: 'var(--bb-color-chart-grid)',
  axis: 'var(--bb-color-chart-axis)',
  tooltipBg: 'var(--bb-color-chart-tooltip-bg)',
  tooltipBorder: 'var(--bb-color-chart-tooltip-border)',
};

// Tooltip style configuration
export const getTooltipStyle = () => ({
  backgroundColor: 'var(--bb-color-bg-surface)',
  border: '1px solid var(--bb-color-border-subtle)',
  borderRadius: 'var(--bb-radius-lg)',
  boxShadow: 'var(--bb-elevation-card)',
  padding: 'var(--bb-space-3)',
});

// Get color by index for multi-series
export const getChartColor = (index) => {
  return chartColorSequence[index % chartColorSequence.length];
};

export const getChartSoftColor = (index) => {
  return chartSoftColorSequence[index % chartSoftColorSequence.length];
};

// Semantic color mapping
export const getSemanticColor = (type) => {
  const mapping = {
    revenue: chartPalette.success,
    expense: chartPalette.danger,
    profit: chartPalette.primary,
    growth: chartPalette.success,
    decline: chartPalette.danger,
    neutral: chartPalette.purple,
    occupancy: chartPalette.primary,
    capacity: chartPalette.teal,
    bookings: chartPalette.purple,
    payments: chartPalette.success,
  };
  return mapping[type] || chartPalette.primary;
};

