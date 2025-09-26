import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const withOpacityValue = (variable) => ({ opacityValue }) => {
  if (opacityValue !== undefined) {
    return `rgba(var(${variable}) / ${opacityValue})`;
  }
  return `rgb(var(${variable}))`;
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: withOpacityValue('--color-primary'),
        secondary: withOpacityValue('--color-secondary'),
        accent: withOpacityValue('--color-accent'),
        surface: withOpacityValue('--color-surface'),
        background: withOpacityValue('--color-background'),
        text: withOpacityValue('--color-text'),
        muted: withOpacityValue('--color-muted'),
        border: withOpacityValue('--color-border'),
        success: withOpacityValue('--color-success'),
        warning: withOpacityValue('--color-warning'),
        danger: withOpacityValue('--color-danger'),
      },
      textColor: {
        DEFAULT: withOpacityValue('--color-text'),
        muted: withOpacityValue('--color-muted'),
      },
      backgroundColor: {
        surface: withOpacityValue('--color-surface'),
        muted: withOpacityValue('--color-muted'),
      },
      borderColor: {
        DEFAULT: withOpacityValue('--color-border'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        surface: '0 10px 25px -15px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [forms, typography],
};
