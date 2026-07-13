/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'main-bg': '#0B0B0B',
        'surface-container': '#1E1E1E',
        'primary-accent': '#FFCC00',
        'text-primary': '#FFFFFF',
        'text-secondary': '#AAAAAA',
        'status-process': '#FFB300',
        'status-review': '#00875A',
        'status-pending': '#0052CC',
      }
    },
  },
  plugins: [],
}
