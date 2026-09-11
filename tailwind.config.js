/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // azul marinho — cor de marca e ações primárias
        ink: {
          DEFAULT: '#1E3A8A',
          light: '#2563EB',
          dark: '#152B63',
          50: '#EFF4FF',
        },
        paper: {
          DEFAULT: '#F8FAFC',
          dark: '#F1F5F9',
        },
        // laranja/âmbar — usado só em destaques funcionais (sequência, alerta)
        gold: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#B45309',
        },
        acerto: { DEFAULT: '#16A34A', light: '#DCFCE7' },
        erro: { DEFAULT: '#DC2626', light: '#FEE2E2' },
        info: { DEFAULT: '#0284C7', light: '#E0F2FE' },
      },
      fontFamily: {
        serif: ['"Inter"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04)',
        card: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        lift: '0 4px 12px rgba(15,23,42,0.1)',
        glow: '0 0 0 3px rgba(37,99,235,0.15)',
      },
    },
  },
  plugins: [],
}
