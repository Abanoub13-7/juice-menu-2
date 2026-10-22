/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          950: '#062822',
          900: '#0a3d33',
          800: '#0d4d40',
          700: '#0f5c4e',
          600: '#15715f',
        },
        gold: {
          200: '#f0dfae',
          300: '#e3c27a',
          400: '#d4a94f',
          500: '#c9973e',
          600: '#a97b2e',
        },
        clay: {
          500: '#c0392b',
          600: '#a43124',
        },
        cream: '#f5f0e4',
      },
      fontFamily: {
        display: ['"Reem Kufi"', 'sans-serif'],
        body: ['"Tajawal"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px rgba(56, 44, 24, 0.06)',
      },
    },
  },
  plugins: [],
}
