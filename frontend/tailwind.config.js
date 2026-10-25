/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#1F7A41', // Primary Deep Green Brand Color
          600: '#1a6937',
          700: '#16572e',
          800: '#124524',
          900: '#0d321a',
          950: '#071f11',
          DEFAULT: '#1F7A41',
        },
        gold: {
          50: '#fffdf5',
          100: '#fef9e7',
          200: '#fcf0c4',
          300: '#fae396',
          400: '#f5ce53',
          500: '#e69b00', // Secondary Accent Gold/Amber Color
          600: '#c78400',
          700: '#a36b00',
          800: '#805300',
          900: '#5c3c00',
          DEFAULT: '#e69b00',
        },
        accent: {
          50: '#fffdf5',
          100: '#fef9e7',
          500: '#e69b00',
          600: '#c78400',
          700: '#a36b00',
          DEFAULT: '#e69b00',
        }
      }
    },
  },
  plugins: [],
}
