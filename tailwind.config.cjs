/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA'
        }
      }
    }
  },
  plugins: []
};
