/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        ghost: {
          bg:      '#111111',
          surface: '#1a1a1a',
          teal:    '#2dd4bf',
          red:     '#f87171',
          amber:   '#facc15',
          blue:    '#60a5fa',
        },
      },
    },
  },
  plugins: [],
};
