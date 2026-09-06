/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B2A4A',
          light: '#2C4066',
          dark: '#101A30',
        },
        paper: '#F7F5F0',
        gold: {
          DEFAULT: '#C9973E',
          light: '#E3B968',
        },
        acerto: '#2F6B4F',
        erro: '#B23A34',
      },
      fontFamily: {
        serif: ['"Lora"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}
