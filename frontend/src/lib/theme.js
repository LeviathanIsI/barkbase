const clone = (value) => (typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const DEFAULT_THEME = {
  name: 'BarkBase Default',
  colors: {
    primary: '59 130 246',
    secondary: '129 140 248',
    accent: '249 115 22',
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

  if (theme.mode) {
    root.dataset.theme = theme.mode;
  }

  if (theme.assets?.logo) {
    root.style.setProperty('--logo-url', `url(${theme.assets.logo})`);
  }

  return theme;
};

export const getDefaultTheme = () => clone(DEFAULT_THEME);

export const injectTheme = (theme) => applyTheme(theme);

