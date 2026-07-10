/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdf8f0',
          100: '#faf5eb',
          200: '#f4ead9',
        },
        charcoal: {
          700: '#47453e',
          800: '#32302b',
          900: '#20201a',
          950: '#141209',
        },
        olive: {
          500: '#6b7c52',
          600: '#596845',
        },
        amber: {
          // keep Tailwind defaults but alias for consistency
        },
        success: '#4ade80',
        danger: '#f87171',
      },
      fontFamily: {
        display: ['system-ui', 'ui-sans-serif', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        warm: '0 4px 24px -4px rgba(251,191,36,0.10), 0 2px 8px -2px rgba(0,0,0,0.3)',
        'warm-lg': '0 8px 40px -8px rgba(251,191,36,0.18), 0 4px 16px -4px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
