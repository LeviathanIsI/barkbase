/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ========================================
      // COLOR SYSTEM - References design-tokens.css
      // ========================================
      colors: {
        // Background colors
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },

        // Surface levels for depth hierarchy
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
          overlay: 'var(--surface-overlay)',
        },

        // Text colors
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },

        // Primary - Amber
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },

        // Secondary - Forest Green
        secondary: {
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
        },

        // Grayscale
        gray: {
          50: 'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)',
        },

        // Semantic Status Colors - Vibrant
        success: {
          50: 'var(--color-success-50)',
          100: 'var(--color-success-100)',
          200: 'var(--color-success-200)',
          300: 'var(--color-success-300)',
          400: 'var(--color-success-400)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
          800: 'var(--color-success-800)',
          900: 'var(--color-success-900)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          200: 'var(--color-warning-200)',
          300: 'var(--color-warning-300)',
          400: 'var(--color-warning-400)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
          800: 'var(--color-warning-800)',
          900: 'var(--color-warning-900)',
        },
        error: {
          50: 'var(--color-error-50)',
          100: 'var(--color-error-100)',
          200: 'var(--color-error-200)',
          300: 'var(--color-error-300)',
          400: 'var(--color-error-400)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
          800: 'var(--color-error-800)',
          900: 'var(--color-error-900)',
        },
        info: {
          50: 'var(--color-info-50)',
          100: 'var(--color-info-100)',
          200: 'var(--color-info-200)',
          300: 'var(--color-info-300)',
          400: 'var(--color-info-400)',
          500: 'var(--color-info-500)',
          600: 'var(--color-info-600)',
          700: 'var(--color-info-700)',
          800: 'var(--color-info-800)',
          900: 'var(--color-info-900)',
        },

        // Accent - Premium Purple
        accent: {
          50: 'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
        },

        // Border colors
        border: {
          DEFAULT: 'var(--border-color)',
          subtle: 'var(--border-subtle)',
          light: 'var(--border-light)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },

        // Dark mode specific
        'dark-bg': {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          sidebar: 'var(--bg-sidebar)',
        },
        'dark-text': {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        'dark-border': {
          DEFAULT: 'var(--border-color)',
          light: 'var(--border-light)',
          strong: 'var(--border-strong)',
        },
      },

      // ========================================
      // TYPOGRAPHY
      // ========================================
      fontFamily: {
        sans: 'var(--font-family-sans)',
        mono: 'var(--font-family-mono)',
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
        '5xl': 'var(--text-5xl)',
      },

      // ========================================
      // SPACING - 8-Point Grid
      // ========================================
      spacing: {
        '0': 'var(--space-0)',
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
        '24': 'var(--space-24)',
      },

      // ========================================
      // BORDER RADIUS - Modern SaaS (larger values)
      // ========================================
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',      // 6px
        'DEFAULT': 'var(--radius-md)', // 8px
        'md': 'var(--radius-md)',      // 8px
        'lg': 'var(--radius-lg)',      // 12px - cards
        'xl': 'var(--radius-xl)',      // 16px - large cards
        '2xl': 'var(--radius-2xl)',    // 20px - feature cards
        '3xl': 'var(--radius-3xl)',    // 24px - hero sections
        'full': 'var(--radius-full)',  // circular
      },

      // ========================================
      // SHADOWS - Standard + Glow + Colored
      // ========================================
      boxShadow: {
        // Standard shadows
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow-md)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'none': 'none',

        // Glow shadows
        'glow-sm': 'var(--shadow-glow-sm)',
        'glow': 'var(--shadow-glow-md)',
        'glow-md': 'var(--shadow-glow-md)',
        'glow-lg': 'var(--shadow-glow-lg)',

        // Colored shadows - Primary (orange/amber)
        'primary-sm': 'var(--shadow-primary-sm)',
        'primary': 'var(--shadow-primary-md)',
        'primary-md': 'var(--shadow-primary-md)',
        'primary-lg': 'var(--shadow-primary-lg)',

        // Colored shadows - Accent (purple)
        'accent-sm': 'var(--shadow-accent-sm)',
        'accent': 'var(--shadow-accent-md)',
        'accent-md': 'var(--shadow-accent-md)',
        'accent-lg': 'var(--shadow-accent-lg)',

        // Border glow effects
        'border-glow-primary': 'var(--border-glow-primary)',
        'border-glow-accent': 'var(--border-glow-accent)',
        'border-glow-success': 'var(--border-glow-success)',
        'border-glow-error': 'var(--border-glow-error)',

        // Focus ring
        'focus-ring': 'var(--focus-ring)',
      },

      // ========================================
      // BACKGROUND IMAGE - Gradients
      // ========================================
      backgroundImage: {
        // Page & Card gradients
        'gradient-page': 'var(--gradient-page)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-card-hover': 'var(--gradient-card-hover)',
        'gradient-atmospheric': 'var(--gradient-atmospheric)',
        'gradient-mesh': 'var(--gradient-mesh)',
        'gradient-mesh-light': 'var(--gradient-mesh-light)',

        // Action gradients
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-primary-hover': 'var(--gradient-primary-hover)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-accent-vibrant': 'var(--gradient-accent-vibrant)',

        // Status gradients
        'gradient-success': 'var(--gradient-success)',
        'gradient-warning': 'var(--gradient-warning)',
        'gradient-error': 'var(--gradient-error)',
        'gradient-info': 'var(--gradient-info)',
      },

      // ========================================
      // Z-INDEX SCALE
      // ========================================
      zIndex: {
        '0': 0,
        '10': 10,
        '20': 20,
        '30': 30,
        '40': 40,
        '50': 50,
        'dropdown': 'var(--z-dropdown)',
        'sticky': 'var(--z-sticky)',
        'fixed': 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'popover': 'var(--z-popover)',
        'tooltip': 'var(--z-tooltip)',
      },

      // ========================================
      // TRANSITIONS
      // ========================================
      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      transitionTimingFunction: {
        'DEFAULT': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      // ========================================
      // ANIMATIONS
      // ========================================
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: 'var(--shadow-glow-sm)' },
          '50%': { boxShadow: 'var(--shadow-glow-lg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },

      // ========================================
      // LAYOUT DIMENSIONS
      // ========================================
      width: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
      },
      height: {
        'header': 'var(--header-height)',
        'input': 'var(--input-height)',
        'button': 'var(--button-height)',
      },
      maxWidth: {
        'content': 'var(--content-max-width)',
      },
    },
  },
  plugins: [
    // Custom plugin for premium SaaS utilities
    plugin(function({ addUtilities, addComponents }) {
      // ========================================
      // GLASSMORPHISM UTILITIES
      // ========================================
      const glassUtilities = {
        '.glass': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-subtle)',
        },
        '.glass-light': {
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-light)',
        },
        '.glass-medium': {
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-default)',
        },
        '.glass-heavy': {
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-strong)',
        },
      };

      // ========================================
      // GLOW UTILITIES
      // ========================================
      const glowUtilities = {
        // Accent glow (orange)
        '.glow-accent-sm': { boxShadow: 'var(--accent-glow-sm)' },
        '.glow-accent': { boxShadow: 'var(--accent-glow-md)' },
        '.glow-accent-lg': { boxShadow: 'var(--accent-glow-lg)' },

        // Primary glow (amber)
        '.glow-primary-sm': { boxShadow: 'var(--primary-glow-sm)' },
        '.glow-primary': { boxShadow: 'var(--primary-glow-md)' },
        '.glow-primary-lg': { boxShadow: 'var(--primary-glow-lg)' },

        // Status glows
        '.glow-success': { boxShadow: 'var(--success-glow)' },
        '.glow-error': { boxShadow: 'var(--error-glow)' },
        '.glow-info': { boxShadow: 'var(--info-glow)' },
      };

      // ========================================
      // ELEVATION UTILITIES
      // ========================================
      const elevationUtilities = {
        '.elevation-0': {
          boxShadow: 'var(--elevation-0)',
          background: 'var(--surface-0)',
        },
        '.elevation-1': {
          boxShadow: 'var(--elevation-1)',
          background: 'var(--surface-1)',
        },
        '.elevation-2': {
          boxShadow: 'var(--elevation-2)',
          background: 'var(--surface-2)',
        },
        '.elevation-3': {
          boxShadow: 'var(--elevation-3)',
          background: 'var(--surface-3)',
        },
        '.elevation-4': {
          boxShadow: 'var(--elevation-4)',
          background: 'var(--surface-3)',
        },
      };

      // ========================================
      // GRADIENT TEXT UTILITY
      // ========================================
      const gradientTextUtilities = {
        '.text-gradient-primary': {
          background: 'var(--gradient-primary)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.text-gradient-accent': {
          background: 'var(--gradient-accent)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
      };

      // ========================================
      // BORDER GLOW UTILITIES
      // ========================================
      const borderGlowUtilities = {
        '.border-glow-primary': {
          boxShadow: 'var(--border-glow-primary)',
        },
        '.border-glow-accent': {
          boxShadow: 'var(--border-glow-accent)',
        },
        '.border-glow-success': {
          boxShadow: 'var(--border-glow-success)',
        },
        '.border-glow-error': {
          boxShadow: 'var(--border-glow-error)',
        },
      };

      addUtilities(glassUtilities);
      addUtilities(glowUtilities);
      addUtilities(elevationUtilities);
      addUtilities(gradientTextUtilities);
      addUtilities(borderGlowUtilities);
    }),
  ],
}
