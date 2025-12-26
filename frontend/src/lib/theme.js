const clone = (value) => (typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const DEFAULT_THEME = {
  name: 'BarkBase Default',
  colors: {
    primary: '245 158 11',   // amber-500 (#f59e0b) - actual app primary
    secondary: '217 119 6',  // amber-600 (#d97706) - darker variant
    accent: '245 158 11',    // amber-500 (#f59e0b) - actual app default
    background: '248 250 252',
    surface: '255 255 255',
    text: '17 24 39',
    muted: '100 116 139',
    border: '226 232 240',
    success: '34 197 94',
    warning: '234 179 8',
    danger: '239 68 68',
  },
  fonts: {
    sans: 'Inter, system-ui, sans-serif',
    heading: 'Inter, system-ui, sans-serif',
  },
  assets: {
    logo: null,
  },
  featureFlags: {
    waitlist: true,
    medicationReminders: true,
    incidentReporting: true,
  },
  terminology: {
    kennel: 'Kennel',
    staff: 'Staff',
    booking: 'Booking',
  },
  fontPairing: 'modern',
};

// Font pairing definitions (must match FONT_PAIRINGS in Branding.jsx)
const FONT_PAIRINGS = {
  modern: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  classic: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  friendly: {
    heading: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  professional: {
    heading: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  playful: {
    heading: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  },
};

const cssVariableMap = {
  primary: '--color-primary',
  secondary: '--color-secondary',
  accent: '--color-accent',
  background: '--color-background',
  surface: '--color-surface',
  text: '--color-text',
  muted: '--color-muted',
  border: '--color-border',
  success: '--color-success',
  warning: '--color-warning',
  danger: '--color-danger',
};

/**
 * Convert hex color to RGB string "r g b"
 */
const hexToRgb = (hex) => {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
};

/**
 * Generate a soft/translucent version of a color for hover/active states
 */
const hexToSoft = (hex, alpha = 0.15) => {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const mergeTheme = (overrides = {}) => {
  const theme = clone(DEFAULT_THEME);
  Object.entries(overrides).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      theme[key] = { ...theme[key], ...value };
    } else if (value !== undefined) {
      theme[key] = value;
    }
  });
  return theme;
};

export const applyTheme = (incomingTheme) => {
  if (typeof window === 'undefined') return;
  const theme = mergeTheme(incomingTheme);
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = cssVariableMap[key];
    if (!cssVar) return;
    root.style.setProperty(cssVar, value);
  });

  if (theme.fonts?.sans) {
    root.style.setProperty('--font-sans', theme.fonts.sans);
  }

  if (theme.fonts?.heading) {
    root.style.setProperty('--font-heading', theme.fonts.heading);
  }

  // Mode functionality removed - single theme mode only

  if (theme.assets?.logo) {
    root.style.setProperty('--logo-url', `url(${theme.assets.logo})`);
  }

  return theme;
};

/**
 * Apply branding customizations from API response
 * This sets CSS variables that override the design tokens
 */
export const applyBranding = (branding) => {
  if (typeof window === 'undefined' || !branding) return;
  const root = document.documentElement;

  // Apply accent color (the main brand color)
  if (branding.accentColor || branding.primaryColor) {
    const accentHex = branding.accentColor || branding.primaryColor;
    root.style.setProperty('--bb-color-accent', accentHex);
    root.style.setProperty('--bb-color-accent-soft', hexToSoft(accentHex, 0.15));
    root.style.setProperty('--bb-color-accent-text', accentHex);

    // Also set sidebar active states to match accent
    root.style.setProperty('--bb-color-sidebar-item-hover-bg', hexToSoft(accentHex, 0.08));
    root.style.setProperty('--bb-color-sidebar-item-active-bg', hexToSoft(accentHex, 0.15));
    root.style.setProperty('--bb-color-sidebar-item-active-border', accentHex);
  }

  // Apply font pairing
  if (branding.fontPreset) {
    const fonts = FONT_PAIRINGS[branding.fontPreset] || FONT_PAIRINGS.modern;
    root.style.setProperty('--font-heading', fonts.heading);
    root.style.setProperty('--font-sans', fonts.body);
    root.style.setProperty('--font-body', fonts.body);
  }

  // Store logo URLs for components to use
  if (branding.squareLogoUrl) {
    root.style.setProperty('--bb-logo-square-url', `url(${branding.squareLogoUrl})`);
  }
  if (branding.wideLogoUrl) {
    root.style.setProperty('--bb-logo-wide-url', `url(${branding.wideLogoUrl})`);
  }

  // Return the branding for chaining
  return branding;
};

export const getDefaultTheme = () => clone(DEFAULT_THEME);

export const injectTheme = (theme) => applyTheme(theme);

