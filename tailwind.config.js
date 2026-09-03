/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Bright room — the landing. Your bone pulled toward Unseen's blush. */
        paper: { DEFAULT: '#EFE7E2', deep: '#E4DAD4', dim: '#D8CCC4' },
        ink: { DEFAULT: '#16110F', soft: '#2E2724', mute: '#5C534D' },
        ash: '#7A716B',
        terra: { DEFAULT: '#C4491F', deep: '#9B3714' },
        /* Dim room — the instrument. Luminance-capped for photophobia. */
        calm: {
          bg: '#12100F',
          raise: '#1B1817',
          line: '#2C2724',
          text: '#C9BFB6',
          mute: '#8A807A',
          amber: '#B8794A',
        },
      },
      fontFamily: {
        display: ['Instrument Serif', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Archivo', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
        power: 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
};
