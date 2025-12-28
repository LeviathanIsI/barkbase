const fs = require('fs');
const path = require('path');

const designTokensCSS = `/**
 * BarkBase Design Tokens - Dark SaaS Theme
 * Dual theme system: Light mode + Dark mode with purple/blue gradients
 * Features: Glassmorphism, glow effects, smooth transitions
 */

/* ==========================================
   ROOT - Light Mode (Default)
   ========================================== */

:root {
  /* Background Colors - Light Mode */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --bg-tertiary: #F3F4F6;

  /* Surface Colors - Light Mode */
  --surface-primary: rgba(255, 255, 255, 0.8);
  --surface-secondary: rgba(249, 250, 251, 0.9);
  --surface-elevated: rgba(255, 255, 255, 0.95);
  --surface-border: rgba(124, 58, 237, 0.15);

  /* Text Colors - Light Mode */
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-tertiary: #6B7280;
  --text-inverse: #FFFFFF;

  /* Purple Primary Colors - Light Mode (Darker for contrast) */
  --primary-50: #FAF5FF;
  --primary-100: #F3E8FF;
  --primary-200: #E9D5FF;
  --primary-300: #D8B4FE;
  --primary-400: #C084FC;
  --primary-500: #7C3AED;  /* Darker purple for light mode */
  --primary-600: #6D28D9;
  --primary-700: #5B21B6;
  --primary-800: #4C1D95;
  --primary-900: #3B0764;

  /* Blue Secondary Colors - Light Mode (Darker for contrast) */
  --secondary-50: #EFF6FF;
  --secondary-100: #DBEAFE;
  --secondary-200: #BFDBFE;
  --secondary-300: #93C5FD;
  --secondary-400: #60A5FA;
  --secondary-500: #2563EB;  /* Darker blue for light mode */
  --secondary-600: #1D4ED8;
  --secondary-700: #1E40AF;
  --secondary-800: #1E3A8A;
  --secondary-900: #1E3A8A;

  /* Glassmorphism - Light Mode */
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(124, 58, 237, 0.1);
  --glass-shadow: 0 8px 32px rgba(124, 58, 237, 0.1);

  /* Gradient Colors - Light Mode */
  --gradient-start: #7C3AED;
  --gradient-mid: #2563EB;
  --gradient-end: #1D4ED8;

  /* Glow Effects - Light Mode (Subtle) */
  --glow-primary: 0 0 20px rgba(124, 58, 237, 0.2);
  --glow-secondary: 0 0 20px rgba(37, 99, 235, 0.2);
}

/* ==========================================
   DARK MODE - Class-based
   ========================================== */

.dark {
  /* Background Colors - Dark Mode */
  --bg-primary: #1a1d23;
  --bg-secondary: #242930;
  --bg-tertiary: #2d3139;

  /* Surface Colors - Dark Mode with glass effect */
  --surface-primary: #242930;
  --surface-secondary: #2d3139;
  --surface-elevated: #353a44;
  --surface-border: rgba(255, 255, 255, 0.12);

  /* Text Colors - Dark Mode */
  --text-primary: #e5e7eb;
  --text-secondary: #9ca3af;
  --text-tertiary: #6b7280;
  --text-inverse: #FFFFFF;

  /* Purple Primary Colors - Dark Mode (Brighter) */
  --primary-50: #FAF5FF;
  --primary-100: #F3E8FF;
  --primary-200: #E9D5FF;
  --primary-300: #D8B4FE;
  --primary-400: #C084FC;
  --primary-500: #8B5CF6;  /* Brighter purple for dark mode */
  --primary-600: #7C3AED;
  --primary-700: #6D28D9;
  --primary-800: #5B21B6;
  --primary-900: #4C1D95;

  /* Blue Secondary Colors - Dark Mode (Brighter) */
  --secondary-50: #EFF6FF;
  --secondary-100: #DBEAFE;
  --secondary-200: #BFDBFE;
  --secondary-300: #93C5FD;
  --secondary-400: #60A5FA;
  --secondary-500: #3B82F6;  /* Brighter blue for dark mode */
  --secondary-600: #2563EB;
  --secondary-700: #1D4ED8;
  --secondary-800: #1E40AF;
  --secondary-900: #1E3A8A;

  /* Glassmorphism - Dark Mode */
  --glass-bg: rgba(30, 30, 46, 0.6);
  --glass-border: rgba(139, 92, 246, 0.2);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);

  /* Gradient Colors - Dark Mode */
  --gradient-start: #8B5CF6;
  --gradient-mid: #3B82F6;
  --gradient-end: #60A5FA;

  /* Glow Effects - Dark Mode (Prominent) */
  --glow-primary: 0 0 20px rgba(139, 92, 246, 0.5);
  --glow-secondary: 0 0 20px rgba(59, 130, 246, 0.5);
}

/* ==========================================
   SHARED TOKENS (Same for both themes)
   ========================================== */

:root, .dark {
  /* Typography - Inter Font System */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;

  /* Spacing - 8-Point Grid */
  --space-0: 0;
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
  --space-20: 5rem;    /* 80px */
  --space-24: 6rem;    /* 96px */

  /* Border Radius */
  --radius-none: 0;
  --radius-sm: 0.25rem;  /* 4px */
  --radius-md: 0.5rem;   /* 8px */
  --radius-lg: 0.75rem;  /* 12px */
  --radius-xl: 1rem;     /* 16px */
  --radius-2xl: 1.5rem;  /* 24px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slower: 500ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Layout Dimensions */
  --sidebar-width: 240px;
  --sidebar-width-collapsed: 64px;
  --header-height: 64px;
  --content-max-width: 1440px;

  /* Z-Index Scale */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;

  /* Component Specific */
  --input-height: 40px;
  --button-height: 40px;
  --card-padding: var(--space-6);
  --page-padding: var(--space-8);

  /* Backdrop Blur Levels */
  --blur-xs: blur(2px);
  --blur-sm: blur(8px);
  --blur-md: blur(12px);
  --blur-lg: blur(16px);
  --blur-xl: blur(24px);

  /* Semantic Status Colors (Same in both modes) */
  --success-100: #D1FAE5;
  --success-500: #10B981;
  --success-600: #059669;
  --success-700: #047857;

  --warning-100: #FEF3C7;
  --warning-500: #F59E0B;
  --warning-600: #D97706;
  --warning-700: #B45309;

  --error-100: #FEE2E2;
  --error-500: #EF4444;
  --error-600: #DC2626;
  --error-700: #B91C1C;
}

/* ==========================================
   GRADIENT UTILITIES
   ========================================== */

.gradient-purple-blue {
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 50%, var(--gradient-end) 100%);
}

.gradient-radial {
  background: radial-gradient(circle at center, var(--gradient-start) 0%, var(--gradient-mid) 50%, var(--gradient-end) 100%);
}

/* ==========================================
   GLASSMORPHISM UTILITIES
   ========================================== */

.glass-surface {
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass-elevated {
  background: var(--surface-elevated);
  backdrop-filter: var(--blur-lg);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-lg);
}

/* ==========================================
   GLOW EFFECTS
   ========================================== */

.glow-primary {
  box-shadow: var(--glow-primary);
}

.glow-secondary {
  box-shadow: var(--glow-secondary);
}

.glow-primary-hover:hover {
  box-shadow: var(--glow-primary);
  transition: box-shadow var(--transition-base);
}

/* ==========================================
   SMOOTH TRANSITIONS
   ========================================== */

* {
  transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
  transition-duration: var(--transition-fast);
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Disable transitions when dark mode is toggled to avoid flash */
.dark-mode-transition-disable * {
  transition: none !important;
}
`;

// Backup old file
const oldFile = path.join(__dirname, 'src/styles/design-tokens.css');
const backupFile = path.join(__dirname, 'src/styles/design-tokens.css.backup.' + Date.now());

if (fs.existsSync(oldFile)) {
  fs.copyFileSync(oldFile, backupFile);
}

// Write new file
fs.writeFileSync(oldFile, designTokensCSS, 'utf8');
