/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'ui-serif', 'serif'],
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
      },
      maxWidth: {
        container: '1200px',
      },
      colors: {
        brand: {
          900: '#0B1D3A',
          800: '#133A6B',
          700: '#0052CC',
        },
        accent: {
          500: '#00B5E2',
        },
        success: '#2DBE60',
        surface: '#FFFFFF',
        'page-bg': '#F4F6F8',
        'border-ui': '#E5E7EB',
        'text-soft': '#64748B',
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        pastel: {
          sky: '#e0f2fe',
          mint: '#ccfbf1',
          lavender: '#ede9fe',
          peach: '#ffedd5',
          cream: '#fefce8',
          rose: '#ffe4e6',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { opacity: '0.6' },
          '100%': { opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        connectorPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(14, 165, 233, 0.35)' },
          '50%': { boxShadow: '0 0 0 12px rgba(14, 165, 233, 0)' },
        },
        flowLine: {
          '0%': { strokeDashoffset: '24', opacity: '0.6' },
          '50%': { opacity: '1' },
          '100%': { strokeDashoffset: '0', opacity: '0.6' },
        },
        staggerIn: {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        scrollLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fadeIn': 'fadeIn 0.5s ease-out',
        'connector-pulse': 'connectorPulse 2s ease-in-out infinite',
        'flow-line': 'flowLine 1.5s ease-in-out infinite',
        'stagger-in': 'staggerIn 0.5s ease-out forwards',
        'scroll-left': 'scrollLeft 25s linear infinite',
      },
      animationDelay: {
        '100': '100ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
        'glow': '0 0 40px -10px rgba(59, 130, 246, 0.4)',
      },
    },
  },
  plugins: [],
}
