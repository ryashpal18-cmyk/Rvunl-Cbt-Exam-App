/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#12345b',
        saffron: '#e97824',
        canvas: '#f3f6fa',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
