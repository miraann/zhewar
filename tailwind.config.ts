import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Kurdish', 'serif'],
        sans:    ['Kurdish', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Material 3 tonal roles for the admin panel — see the token comment
        // block in app/globals.css. `<alpha-value>` keeps bg-md-primary/40
        // style opacity modifiers working.
        'md-primary':                  'rgb(var(--md-primary) / <alpha-value>)',
        'md-on-primary':               'rgb(var(--md-on-primary) / <alpha-value>)',
        'md-primary-container':        'rgb(var(--md-primary-container) / <alpha-value>)',
        'md-on-primary-container':     'rgb(var(--md-on-primary-container) / <alpha-value>)',
        'md-secondary':                'rgb(var(--md-secondary) / <alpha-value>)',
        'md-secondary-container':      'rgb(var(--md-secondary-container) / <alpha-value>)',
        'md-on-secondary-container':   'rgb(var(--md-on-secondary-container) / <alpha-value>)',
        'md-tertiary':                 'rgb(var(--md-tertiary) / <alpha-value>)',
        'md-tertiary-container':       'rgb(var(--md-tertiary-container) / <alpha-value>)',
        'md-on-tertiary-container':    'rgb(var(--md-on-tertiary-container) / <alpha-value>)',
        'md-error':                    'rgb(var(--md-error) / <alpha-value>)',
        'md-error-container':          'rgb(var(--md-error-container) / <alpha-value>)',
        'md-on-error-container':       'rgb(var(--md-on-error-container) / <alpha-value>)',
        'md-warning':                  'rgb(var(--md-warning) / <alpha-value>)',
        'md-warning-container':        'rgb(var(--md-warning-container) / <alpha-value>)',
        'md-on-warning-container':     'rgb(var(--md-on-warning-container) / <alpha-value>)',
        'md-success':                  'rgb(var(--md-success) / <alpha-value>)',
        'md-success-container':        'rgb(var(--md-success-container) / <alpha-value>)',
        'md-on-success-container':     'rgb(var(--md-on-success-container) / <alpha-value>)',
        'md-surface':                  'rgb(var(--md-surface) / <alpha-value>)',
        'md-surface-container':        'rgb(var(--md-surface-container) / <alpha-value>)',
        'md-surface-container-high':   'rgb(var(--md-surface-container-high) / <alpha-value>)',
        'md-surface-container-highest': 'rgb(var(--md-surface-container-highest) / <alpha-value>)',
        'md-on-surface':               'rgb(var(--md-on-surface) / <alpha-value>)',
        'md-on-surface-variant':       'rgb(var(--md-on-surface-variant) / <alpha-value>)',
        'md-outline':                  'rgb(var(--md-outline) / <alpha-value>)',
        'md-outline-variant':          'rgb(var(--md-outline-variant) / <alpha-value>)',
      },
      borderRadius: {
        'md-sm':   'var(--md-shape-sm)',
        'md-md':   'var(--md-shape-md)',
        'md-lg':   'var(--md-shape-lg)',
        'md-xl':   'var(--md-shape-xl)',
        'md-full': 'var(--md-shape-full)',
      },
      boxShadow: {
        'md-1': 'var(--md-elevation-1)',
        'md-2': 'var(--md-elevation-2)',
      },
      animation: {
        shimmer:     'shimmer 2.4s infinite',
        'fade-up':   'fadeUp 0.7s ease forwards',
        'fade-in':   'fadeIn 0.6s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { transform: 'translateX(-150%)' },
          '100%': { transform: 'translateX(250%)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
