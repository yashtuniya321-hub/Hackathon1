/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odoo: {
          primary: '#714B67',
          'primary-hover': '#5d3d54',
          'primary-light': '#F2EDF1',
          accent: '#00A09D',
          'accent-hover': '#008784',
          'accent-light': '#E6F6F6',
          dark: '#1E252B',
          muted: '#6C757D',
          border: '#DEE2E6',
          bg: '#F8F9FA',
          card: '#FFFFFF',
          warning: '#F0AD4E',
          danger: '#D9534F',
          success: '#28A745',
          info: '#17A2B8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
