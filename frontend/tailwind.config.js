/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'main-bg': '#0B0B0B',
        'color-bg-main': '#0B0B0B',
        'surface-container': '#1E1E1E',
        'color-surface-container': '#1E1E1E',
        'primary-accent': '#FFCC00',
        'color-primary-accent': '#FFCC00',
        'text-primary': '#FFFFFF',
        'color-text-primary': '#FFFFFF',
        'text-secondary': '#AAAAAA',
        'color-text-secondary': '#AAAAAA',
        'status-process': '#FFB300',
        'color-status-process': '#FFB300',
        'status-review': '#00875A',
        'color-status-review': '#00875A',
        'status-pending': '#0052CC',
        'color-status-pending': '#0052CC',
      },
      fontFamily: {
        'sans': ['Inter', 'Roboto', 'Arial', 'sans-serif'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
      },
      borderRadius: {
        'badge': '6px',
        'card': '12px',
        'pill': '24px',
      }
    },
  },
  plugins: [],
}
