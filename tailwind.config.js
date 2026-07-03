/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FBF7F0',
          100: '#F5EFE2',
          200: '#EBE0C9',
          300: '#E0CFA6',
          400: '#D4BA87',
          500: '#C7A568',
        },
        amber: {
          400: '#F5B544',
          500: '#E89C1F',
          600: '#C97D12',
          700: '#A25F0E',
        },
        olive: {
          400: '#8FA069',
          500: '#6F8450',
          600: '#566A3B',
          700: '#3F5029',
        },
        charcoal: {
          700: '#3A3326',
          800: '#2A2419',
          900: '#1C1810',
        },
        success: '#5BA676',
        warning: '#E89C1F',
        danger: '#D9534F',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        warm: '0 10px 30px -10px rgba(201, 125, 18, 0.25)',
        card: '0 4px 20px -6px rgba(58, 51, 38, 0.15)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
}
