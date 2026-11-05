/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ensuring a true black is available
        dark: '#050505',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      // Adding explicit blur values just in case
      backdropBlur: {
        '40': '40px',
        'xl': '24px',
        '2xl': '40px',
      }
    },
  },
  plugins: [],
};