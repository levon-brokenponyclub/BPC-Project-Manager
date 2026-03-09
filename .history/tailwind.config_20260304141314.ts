import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#E8E4DF',
        foreground: '#1F1F1F',
        card: '#FFFFFF',
        muted: '#6B6D6A',
        border: '#E5E1DC',
        primary: '#0F3D2E',
        accent: '#1E2522',
        status: {
          todo: '#F3E7B8',
          inprogress: '#D7E7FB',
          inreview: '#F8DEC0',
          complete: '#D3EFCB',
        },
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.2rem',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(14, 24, 19, 0.08)',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [animate],
}

export default config