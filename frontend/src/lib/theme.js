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
 * Calculate relative luminance for contrast calculations
 */
const getLuminance = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;
  const [r, g, b] = [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Determine if text on this background should be dark or light
 */
const getContrastTextColor = (hex) => {
  const luminance = getLuminance(hex);
  return luminance > 0.4 ? '#18181b' : '#ffffff';
};

/**
 * Darken a hex color by a percentage
 */
const darkenHex = (hex, percent) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.max(0, Math.floor(parseInt(result[1], 16) * (1 - percent)));
  const g = Math.max(0, Math.floor(parseInt(result[2], 16) * (1 - percent)));
  const b = Math.max(0, Math.floor(parseInt(result[3], 16) * (1 - percent)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Lighten a hex color by a percentage
 */
const lightenHex = (hex, percent) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.min(255, Math.floor(parseInt(result[1], 16) + (255 - parseInt(result[1], 16)) * percent));
  const g = Math.min(255, Math.floor(parseInt(result[2], 16) + (255 - parseInt(result[2], 16)) * percent));
  const b = Math.min(255, Math.floor(parseInt(result[3], 16) + (255 - parseInt(result[3], 16)) * percent));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Apply branding customizations from API response
 * This sets CSS variables that override the design tokens for ALL components
 *
 * Three color system:
 * - Primary: Primary buttons, highlight text, main CTAs
 * - Secondary: Secondary buttons, less prominent actions
 * - Accent: Sidebar active states, badges, decorative accents
 */
export const applyBranding = (branding) => {
  if (typeof window === 'undefined' || !branding) return;
  const root = document.documentElement;
  const isDarkMode = root.classList.contains('dark');

  // === PRIMARY COLOR (buttons, highlight text, main CTAs) ===
  if (branding.primaryColor) {
    const primaryHex = branding.primaryColor;
    const primaryDark = darkenHex(primaryHex, 0.15);
    const primaryDarker = darkenHex(primaryHex, 0.25);
    const primaryLight = lightenHex(primaryHex, 0.15);
    const textOnPrimary = getContrastTextColor(primaryHex);

    // Primary button background (--bb-color-accent is used by Button primary variant)
    root.style.setProperty('--bb-color-accent', primaryHex);
    root.style.setProperty('--bb-color-accent-soft', hexToSoft(primaryHex, isDarkMode ? 0.18 : 0.15));
    root.style.setProperty('--bb-color-text-on-accent', textOnPrimary);

    // Tailwind primary color scale
    root.style.setProperty('--color-primary-500', primaryHex);
    root.style.setProperty('--color-primary-600', primaryDark);
    root.style.setProperty('--color-primary-700', primaryDarker);
    root.style.setProperty('--color-primary-400', primaryLight);
    root.style.setProperty('--color-primary-300', lightenHex(primaryHex, 0.30));

    // Focus ring uses primary color
    root.style.setProperty('--border-focus', primaryHex);
    root.style.setProperty('--focus-ring', `0 0 0 3px ${hexToSoft(primaryHex, 0.2)}`);
  }

  // === SECONDARY COLOR (secondary buttons) ===
  if (branding.secondaryColor) {
    const secondaryHex = branding.secondaryColor;
    const secondaryDark = darkenHex(secondaryHex, 0.15);
    const secondaryLight = lightenHex(secondaryHex, 0.15);

    // Secondary button styles
    root.style.setProperty('--bb-color-secondary', secondaryHex);
    root.style.setProperty('--bb-color-secondary-soft', hexToSoft(secondaryHex, isDarkMode ? 0.18 : 0.15));
    root.style.setProperty('--bb-color-text-on-secondary', getContrastTextColor(secondaryHex));

    // Tailwind secondary color scale
    root.style.setProperty('--color-secondary-500', secondaryHex);
    root.style.setProperty('--color-secondary-600', secondaryDark);
    root.style.setProperty('--color-secondary-400', secondaryLight);
  }

  // === ACCENT COLOR (sidebar, badges, decorative accents) ===
  if (branding.accentColor) {
    const accentHex = branding.accentColor;
    const accentDark = darkenHex(accentHex, 0.15);
    const accentDarker = darkenHex(accentHex, 0.25);
    const accentLight = lightenHex(accentHex, 0.15);
    const accentLighter = lightenHex(accentHex, 0.30);

    // Accent text color (for links, accent text)
    root.style.setProperty('--bb-color-accent-text', isDarkMode ? accentLight : accentDark);

    // Sidebar uses accent color
    root.style.setProperty('--bb-color-sidebar-item-hover-bg', hexToSoft(accentHex, 0.08));
    root.style.setProperty('--bb-color-sidebar-item-hover-text', isDarkMode ? accentLighter : accentHex);
    root.style.setProperty('--bb-color-sidebar-item-active-bg', hexToSoft(accentHex, isDarkMode ? 0.20 : 0.15));
    root.style.setProperty('--bb-color-sidebar-item-active-border', accentHex);
    root.style.setProperty('--bb-color-sidebar-item-active-text', isDarkMode ? accentLight : accentDarker);
  }

  // Apply font pairing to ALL text elements
  if (branding.fontPreset) {
    const fonts = FONT_PAIRINGS[branding.fontPreset] || FONT_PAIRINGS.modern;
    // Set all font variables to ensure fonts apply everywhere
    root.style.setProperty('--font-family-sans', fonts.body);  // body, tailwind font-sans
    root.style.setProperty('--font-heading', fonts.heading);   // headings
    root.style.setProperty('--font-sans', fonts.body);         // legacy support
    root.style.setProperty('--font-body', fonts.body);         // legacy support
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

