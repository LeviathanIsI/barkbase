/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode strategy
  theme: {
    extend: {
      // Professional B2B Color Palette - References design-tokens.css
      colors: {
        // Semantic color tokens from design-tokens.css
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
          overlay: 'var(--surface-overlay)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },

        // Primary - Amber (from design-tokens.css)
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)', // Brand primary #d97706 (amber-600)
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },

        // Secondary - Forest Green (from design-tokens.css)
        secondary: {
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)', // Brand secondary #059669
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
        },

        // Grayscale - Professional Neutrals (from design-tokens.css)
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

        // Semantic colors (from design-tokens.css)
        success: {
          100: 'var(--color-success-100)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
        },
        warning: {
          100: 'var(--color-warning-100)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
        },
        error: {
          100: 'var(--color-error-100)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
        },

        // Border colors
        border: {
          DEFAULT: 'var(--border-color)',
          light: 'var(--border-light)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },

        // Dark mode specific backgrounds (for easier usage)
        'dark-bg': {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          sidebar: 'var(--bg-sidebar)',
        },

        // Dark mode specific text (for easier usage)
        'dark-text': {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },

        // Dark mode specific borders (for easier usage)
        'dark-border': {
          DEFAULT: 'var(--border-color)',
          light: 'var(--border-light)',
          strong: 'var(--border-strong)',
        },
      },

      // Typography - Inter Font System (from design-tokens.css)
      fontFamily: {
        sans: 'var(--font-family-sans)',
        mono: 'var(--font-family-mono)',
      },

      // Font Sizes - Professional Hierarchy (from design-tokens.css)
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

      // Spacing - 8-Point Grid System (from design-tokens.css)
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

      // Border Radius - Professional Enterprise (from design-tokens.css)
      borderRadius: {
        'none': 'var(--radius-none)',   // 0
        'sm': 'var(--radius-sm)',       // 4px - Small elements, badges
        'DEFAULT': 'var(--radius-md)',  // 6px - Default for buttons, inputs
        'md': 'var(--radius-md)',       // 6px - Buttons, inputs
        'lg': 'var(--radius-lg)',       // 8px - Cards, modals (MAXIMUM)
        'xl': 'var(--radius-xl)',       // 8px - Overridden to same as lg
        '2xl': 'var(--radius-2xl)',     // 8px - Overridden to same as lg
        'full': 'var(--radius-full)',   // 9999px - Only for avatars
      },

      // Shadows - Subtle Professional Depth (from design-tokens.css)
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow-md)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'none': 'none',
      },

      // Z-Index Scale (from design-tokens.css)
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

      // Transitions - Smooth & Professional (from design-tokens.css)
      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'DEFAULT': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // Professional Animations - B2B Appropriate Only
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
      },

      // Animation Utilities - Professional Only
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },

      // Professional Layout Dimensions (from design-tokens.css)
      width: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
      },
      height: {
        'header': 'var(--header-height)',
        'input': 'var(--input-height)',
        'button': 'var(--button-height)',
      },

      // Max Width for Content (from design-tokens.css)
      maxWidth: {
        'content': 'var(--content-max-width)',
      },
    },
  },
  plugins: [
    // Custom plugin for professional B2B utilities
    plugin(function({ addUtilities }) {
      const professionalUtilities = {
        // Subtle glassmorphism for modern B2B aesthetic
        '.glass': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-light': {
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
        '.glass-medium': {
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        },
      };

      addUtilities(professionalUtilities);
    }),
  ],
}
