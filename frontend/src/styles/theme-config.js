/**
 * BarkBase Dark SaaS Theme Configuration
 * Dual theme system with modern purple/blue gradients, glassmorphism, and glow effects
 */

export const themeConfig = {
  // Dark Mode Theme (Default)
  dark: {
    name: 'dark',
    colors: {
      // Background colors
      background: {
        primary: '#1a1d23',      // Professional dark canvas
        secondary: '#242930',    // Page surfaces
        tertiary: '#2d3139',     // Raised cards / hovers
        gradient: 'linear-gradient(135deg, #1a1d23 0%, #242930 50%, #2d3139 100%)',
      },

      // Surface colors (cards, panels)
      surface: {
        primary: '#242930',
        secondary: '#2d3139',
        elevated: '#353a44',
        border: 'rgba(255, 255, 255, 0.12)',
      },

      // Primary purple gradient
      primary: {
        50: '#F5F3FF',
        100: '#EDE9FE',
        200: '#DDD6FE',
        300: '#C4B5FD',
        400: '#A78BFA',
        500: '#8B5CF6',   // Base purple
        600: '#7C3AED',
        700: '#6D28D9',
        800: '#5B21B6',
        900: '#4C1D95',
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
        glow: '0 0 20px rgba(139, 92, 246, 0.5)',
      },

      // Accent blue gradient
      accent: {
        50: '#EFF6FF',
        100: '#DBEAFE',
        200: '#BFDBFE',
        300: '#93C5FD',
        400: '#60A5FA',
        500: '#3B82F6',   // Base blue
        600: '#2563EB',
        700: '#1D4ED8',
        800: '#1E40AF',
        900: '#1E3A8A',
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
        glow: '0 0 20px rgba(59, 130, 246, 0.5)',
      },

      // Text colors
      text: {
        primary: '#e5e7eb',
        secondary: '#9ca3af',
        tertiary: '#6b7280',
        disabled: '#616161',
        link: '#5B9CFF',
        gradient: 'linear-gradient(135deg, #e5e7eb 0%, #cdd5ff 100%)',
      },

      // Semantic colors
      success: {
        primary: '#10B981',
        background: 'rgba(16, 185, 129, 0.1)',
        glow: '0 0 20px rgba(16, 185, 129, 0.3)',
      },
      warning: {
        primary: '#F59E0B',
        background: 'rgba(245, 158, 11, 0.1)',
        glow: '0 0 20px rgba(245, 158, 11, 0.3)',
      },
      error: {
        primary: '#EF4444',
        background: 'rgba(239, 68, 68, 0.1)',
        glow: '0 0 20px rgba(239, 68, 68, 0.3)',
      },
      info: {
        primary: '#3B82F6',
        background: 'rgba(59, 130, 246, 0.1)',
        glow: '0 0 20px rgba(59, 130, 246, 0.3)',
      },

      // Interactive states
      hover: {
        overlay: 'rgba(139, 92, 246, 0.1)',
        glow: '0 0 30px rgba(139, 92, 246, 0.6)',
      },
      active: {
        overlay: 'rgba(139, 92, 246, 0.2)',
        glow: '0 0 40px rgba(139, 92, 246, 0.8)',
      },
      focus: {
        ring: 'rgba(139, 92, 246, 0.5)',
        glow: '0 0 0 3px rgba(139, 92, 246, 0.5)',
      },
    },

    // Shadows and effects
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      glow: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
      glowLg: '0 0 30px rgba(139, 92, 246, 0.6), 0 0 60px rgba(59, 130, 246, 0.4)',
    },

    // Glassmorphism
    glass: {
      light: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.1)',
      heavy: 'rgba(255, 255, 255, 0.15)',
      blur: {
        sm: 'blur(8px)',
        md: 'blur(12px)',
        lg: 'blur(16px)',
        xl: 'blur(24px)',
      },
    },
  },

  // Light Mode Theme
  light: {
    name: 'light',
    colors: {
      // Background colors
      background: {
        primary: '#FFFFFF',      // Pure white
        secondary: '#F9FAFB',    // Light gray
        tertiary: '#F3F4F6',     // Card background
        gradient: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 50%, #F3F4F6 100%)',
      },

      // Surface colors
      surface: {
        primary: 'rgba(255, 255, 255, 0.9)',
        secondary: 'rgba(249, 250, 251, 0.8)',
        elevated: 'rgba(255, 255, 255, 0.95)',
        border: 'rgba(124, 58, 237, 0.15)',
      },

      // Primary purple (slightly darker for light mode)
      primary: {
        50: '#F5F3FF',
        100: '#EDE9FE',
        200: '#DDD6FE',
        300: '#C4B5FD',
        400: '#A78BFA',
        500: '#7C3AED',   // Darker base for light mode
        600: '#6D28D9',
        700: '#5B21B6',
        800: '#4C1D95',
        900: '#3B0764',
        gradient: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
        glow: '0 0 20px rgba(124, 58, 237, 0.3)',
      },

      // Accent blue (slightly darker)
      accent: {
        50: '#EFF6FF',
        100: '#DBEAFE',
        200: '#BFDBFE',
        300: '#93C5FD',
        400: '#60A5FA',
        500: '#2563EB',   // Darker base for light mode
        600: '#1D4ED8',
        700: '#1E40AF',
        800: '#1E3A8A',
        900: '#1E293B',
        gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        glow: '0 0 20px rgba(37, 99, 235, 0.3)',
      },

      // Text colors
      text: {
        primary: '#111827',       // Dark gray for headings
        secondary: '#1F2937',     // Medium dark for body
        tertiary: '#6B7280',      // Muted for labels
        disabled: '#9CA3AF',      // Disabled state
        link: '#7C3AED',          // Purple
        gradient: 'linear-gradient(135deg, #111827 0%, #7C3AED 100%)',
      },

      // Semantic colors (same as dark)
      success: {
        primary: '#10B981',
        background: 'rgba(16, 185, 129, 0.1)',
        glow: '0 0 20px rgba(16, 185, 129, 0.2)',
      },
      warning: {
        primary: '#F59E0B',
        background: 'rgba(245, 158, 11, 0.1)',
        glow: '0 0 20px rgba(245, 158, 11, 0.2)',
      },
      error: {
        primary: '#EF4444',
        background: 'rgba(239, 68, 68, 0.1)',
        glow: '0 0 20px rgba(239, 68, 68, 0.2)',
      },
      info: {
        primary: '#3B82F6',
        background: 'rgba(59, 130, 246, 0.1)',
        glow: '0 0 20px rgba(59, 130, 246, 0.2)',
      },

      // Interactive states
      hover: {
        overlay: 'rgba(124, 58, 237, 0.05)',
        glow: '0 0 20px rgba(124, 58, 237, 0.3)',
      },
      active: {
        overlay: 'rgba(124, 58, 237, 0.1)',
        glow: '0 0 30px rgba(124, 58, 237, 0.4)',
      },
      focus: {
        ring: 'rgba(124, 58, 237, 0.5)',
        glow: '0 0 0 3px rgba(124, 58, 237, 0.3)',
      },
    },

    // Shadows (lighter for light mode)
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      glow: '0 0 20px rgba(124, 58, 237, 0.3), 0 0 40px rgba(37, 99, 235, 0.2)',
      glowLg: '0 0 30px rgba(124, 58, 237, 0.4), 0 0 60px rgba(37, 99, 235, 0.3)',
    },

    // Glassmorphism (darker overlay for light mode)
    glass: {
      light: 'rgba(0, 0, 0, 0.02)',
      medium: 'rgba(0, 0, 0, 0.05)',
      heavy: 'rgba(0, 0, 0, 0.08)',
      blur: {
        sm: 'blur(8px)',
        md: 'blur(12px)',
        lg: 'blur(16px)',
        xl: 'blur(24px)',
      },
    },
  },

  // Typography
  typography: {
    fonts: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    },
    sizes: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeights: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Spacing (8-point grid)
  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
    36: '9rem',       // 144px
    40: '10rem',      // 160px
    44: '11rem',      // 176px
    48: '12rem',      // 192px
    52: '13rem',      // 208px
    56: '14rem',      // 224px
    60: '15rem',      // 240px
    64: '16rem',      // 256px
    72: '18rem',      // 288px
    80: '20rem',      // 320px
    96: '24rem',      // 384px
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Transitions
  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    timing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// Gradient presets for common use cases
export const gradients = {
  // Mesh gradients
  purpleBlue: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #60A5FA 100%)',
  purpleCyan: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
  blueTeal: 'linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)',

  // Radial gradients
  radialPurple: 'radial-gradient(circle at 50% 50%, #8B5CF6 0%, transparent 70%)',
  radialBlue: 'radial-gradient(circle at 50% 50%, #3B82F6 0%, transparent 70%)',

  // Background meshes
  backgroundMeshDark: `
    linear-gradient(135deg, #1a1d23 0%, #242930 25%, #2d3139 50%, #242930 75%, #1a1d23 100%),
    radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)
  `,
  backgroundMeshLight: `
    linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 25%, #F3F4F6 50%, #F9FAFB 75%, #FFFFFF 100%),
    radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(37, 99, 235, 0.05) 0%, transparent 50%)
  `,
};

export default themeConfig;
