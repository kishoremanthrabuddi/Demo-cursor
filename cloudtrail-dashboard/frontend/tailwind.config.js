/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        severity: {
          high: '#DC2626',
          medium: '#D97706',
          low: '#16A34A',
        },
      },
    },
  },
  plugins: [],
};
