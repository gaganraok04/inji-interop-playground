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
        parchment: {
          50: '#FDFBF7',
          100: '#FAF6EF',
          200: '#F4ECE0',
          300: '#EBDDC9',
          400: '#DCC8AD',
          500: '#CBB292',
          600: '#B29775',
          700: '#8F7556',
          800: '#68533B',
          900: '#423323',
          DEFAULT: '#FAF6EF',
        },
        cream: {
          50: '#FFFFFF',
          100: '#FDFCF9',
          200: '#FAF7F0',
          DEFAULT: '#FDFCF9',
        },
        copper: {
          50: '#FAF4ED',
          100: '#F3E4D4',
          200: '#E6C6AA',
          300: '#D5A27B',
          400: '#C17B4C',
          500: '#A45D2E',
          600: '#8C4B22',
          700: '#723B19',
          800: '#582C12',
          900: '#3D1D0B',
          DEFAULT: '#8C4B22',
        },
        sand: {
          50: '#F8F6F0',
          100: '#F1EDE2',
          200: '#E5DEC9',
          300: '#D4C9AD',
          400: '#C0B391',
          500: '#A89975',
          DEFAULT: '#F1EDE2',
        },
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(66, 51, 35, 0.05), 0 1px 2px rgba(66, 51, 35, 0.04)',
        'warm-md': '0 4px 12px rgba(66, 51, 35, 0.06), 0 2px 4px rgba(66, 51, 35, 0.04)',
        'warm-lg': '0 10px 24px rgba(66, 51, 35, 0.08), 0 4px 8px rgba(66, 51, 35, 0.04)',
        'copper-glow': '0 0 14px rgba(140, 75, 34, 0.25)',
      },
    },
  },
  plugins: [],
}
