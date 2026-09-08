/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B2A4A',
          light: '#2C4066',
          dark: '#0D1526',
          50: '#F1F3F7',
        },
        paper: {
          DEFAULT: '#F7F5F0',
          dark: '#EFEBE2',
        },
        gold: {
          DEFAULT: '#C9973E',
          light: '#E3B968',
          dark: '#A87A2C',
        },
        acerto: { DEFAULT: '#2F6B4F', light: '#E8F2ED' },
        erro: { DEFAULT: '#B23A34', light: '#FBEBEA' },
      },
      fontFamily: {
        serif: ['"Lora"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(27,42,74,0.04), 0 4px 12px rgba(27,42,74,0.05)',
        card: '0 2px 4px rgba(27,42,74,0.04), 0 8px 24px rgba(27,42,74,0.06)',
        lift: '0 8px 16px rgba(27,42,74,0.08), 0 2px 6px rgba(27,42,74,0.06)',
        gold: '0 4px 14px rgba(201,151,62,0.25)',
      },
      backgroundImage: {
        'ink-gradient': 'linear-gradient(160deg, #1B2A4A 0%, #101A30 100%)',
      },
    },
  },
  plugins: [],
}
