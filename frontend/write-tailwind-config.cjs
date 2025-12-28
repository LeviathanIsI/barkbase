const fs = require('fs');
const path = require('path');

const tailwindConfig = `/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode strategy
  theme: {
    extend: {
      // Dark SaaS Color Palette - Purple/Blue with glassmorphism
      colors: {
        // CSS variable-based theming for dual mode support
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
          border: 'var(--surface-border)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },

        // Primary - Purple gradients
        primary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#8B5CF6', // Brand purple
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },

        // Secondary - Blue accents
        secondary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6', // Brand blue
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },

        // Grayscale with dark mode optimizations
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0F0F1A', // Extra dark for dark mode
        },

        // Semantic colors
        success: {
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },

        // Accent colors for glow effects
        accent: {
          purple: '#8B5CF6',
          blue: '#3B82F6',
          pink: '#EC4899',
          cyan: '#06B6D4',
        },
      },

      // Typography - Inter Font System
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },

      // Font Sizes - Clear Hierarchy
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
        lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
        '5xl': ['3rem', { lineHeight: '1' }],         // 48px
      },

      // Spacing - 8-Point Grid System
      spacing: {
        '0': '0',
        '1': '0.25rem',  // 4px
        '2': '0.5rem',   // 8px
        '3': '0.75rem',  // 12px
        '4': '1rem',     // 16px
        '5': '1.25rem',  // 20px
        '6': '1.5rem',   // 24px
        '8': '2rem',     // 32px
        '10': '2.5rem',  // 40px
        '12': '3rem',    // 48px
        '16': '4rem',    // 64px
        '20': '5rem',    // 80px
        '24': '6rem',    // 96px
      },

      // Border Radius - Modern rounded corners
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',   // 4px
        'DEFAULT': '0.5rem', // 8px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
        'full': '9999px',
      },

      // Shadows - Glow effects for dark SaaS aesthetic
      boxShadow: {
        // Standard shadows
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',

        // Glow effects for neon aesthetic
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'glow': '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 30px rgba(139, 92, 246, 0.6), 0 0 60px rgba(59, 130, 246, 0.4)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.6)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.6)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.6)',

        // Inner glow for glassmorphism
        'inner-glow': 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',

        'none': 'none',
      },

      // Background Images - Gradient presets
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-purple-blue': 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #60A5FA 100%)',
        'gradient-mesh-dark': 'radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.3) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.3) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.2) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(59, 130, 246, 0.2) 0px, transparent 50%)',
        'gradient-mesh-light': 'radial-gradient(at 0% 0%, rgba(124, 58, 237, 0.2) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(37, 99, 235, 0.2) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(124, 58, 237, 0.15) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(37, 99, 235, 0.15) 0px, transparent 50%)',
      },

      // Backdrop Blur for glassmorphism
      backdropBlur: {
        xs: '2px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },

      // Z-Index Scale
      zIndex: {
        '0': 0,
        '10': 10,
        '20': 20,
        '30': 30,
        '40': 40,
        '50': 50,
        'dropdown': 1000,
        'sticky': 1020,
        'fixed': 1030,
        'modal-backdrop': 1040,
        'modal': 1050,
        'popover': 1060,
        'tooltip': 1070,
      },

      // Transitions - Smooth & Professional
      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },

      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.6)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },

      // Animation utilities
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
      },

      // Professional Layout Dimensions
      width: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
      },
      height: {
        'header': '64px',
        'input': '40px',
        'button': '40px',
      },

      // Max Width for Content
      maxWidth: {
        'content': '1440px',
      },
    },
  },
  plugins: [
    // Custom plugin for glassmorphism utilities
    plugin(function({ addUtilities }) {
      const glassUtilities = {
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
        '.glass-heavy': {
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-dark': {
          background: 'rgba(15, 15, 26, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        },
      };

      addUtilities(glassUtilities);
    }),
  ],
}
`;

// Backup old file
const oldFile = path.join(__dirname, 'tailwind.config.js');
const backupFile = path.join(__dirname, 'tailwind.config.js.backup.' + Date.now());

if (fs.existsSync(oldFile)) {
  fs.copyFileSync(oldFile, backupFile);
}

// Write new file
fs.writeFileSync(oldFile, tailwindConfig, 'utf8');
