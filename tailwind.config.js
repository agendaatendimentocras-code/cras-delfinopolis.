/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a5276',
          light: '#2471a3',
          dark: '#0e2f44',
        },
        accent: {
          DEFAULT: '#2980b9',
          light: '#5dade2',
        },
        success: '#27ae60',
        danger: {
          DEFAULT: '#e74c3c',
          light: '#f1948a',
        },
        warning: {
          DEFAULT: '#f39c12',
          light: '#f7dc6f',
        },
        surface: '#ffffff',
        bg: '#f4f6f8',
        muted: '#7f8c8d',
        border: '#dfe6e9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
