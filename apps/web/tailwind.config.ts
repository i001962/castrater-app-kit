import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0a',
          green: '#00ff41',
          dim: '#00aa2a',
          amber: '#ffb000',
          red: '#ff3131',
          border: '#1a1a1a',
          card: '#111111',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
