/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--color-bg-canvas) / <alpha-value>)',
        sidebar: 'rgb(var(--color-bg-sidebar) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',
          hover: 'rgb(var(--color-bg-hover) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--color-text-primary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-brand-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-brand-hover) / <alpha-value>)',
          strong: 'rgb(var(--color-brand-strong) / <alpha-value>)',
          contrast: 'rgb(var(--color-brand-ink) / <alpha-value>)',
        },
        positive: 'rgb(var(--color-accent-green) / <alpha-value>)',
        negative: 'rgb(var(--color-accent-red) / <alpha-value>)',
        line: 'rgb(var(--color-border-subtle) / <alpha-value>)',
        brand: {
          50: '#fffdf5',
          100: '#fff4cc',
          200: '#ffe799',
          300: '#ffdc66',
          400: '#ffd13f',
          500: '#ffc72c',
          600: '#8a5e15',
          700: '#6f4a10',
          800: '#56390d',
          900: '#3b280c',
          950: '#211706',
          DEFAULT: '#ffc72c',
          hover: '#e5ad00',
          ink: '#1b2a4a',
        },
        success: {
          500: '#10b981',
        },
        warning: {
          500: '#f59e0b',
        },
        danger: {
          500: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Be Vietnam Pro', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
