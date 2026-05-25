import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#06110d',
          panel: '#0d1914',
          green: '#7bf4b0',
          dim: '#4d8f6a',
          muted: '#a7c8b4',
          amber: '#ffd47e',
          red: '#ff6f61',
          border: '#173124',
        },
      },
      boxShadow: {
        panel: '0 24px 80px rgba(0, 0, 0, 0.35)',
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
