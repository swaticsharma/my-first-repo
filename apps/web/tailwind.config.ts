import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9ecff',
          500: '#1e88e5',
          600: '#1565c0',
          700: '#0d47a1',
        },
      },
    },
  },
  plugins: [],
};

export default config;
