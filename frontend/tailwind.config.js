/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bce0ff",
          300: "#8ecbff",
          400: "#59aeff",
          500: "#2f8fff",
          600: "#1a6ff5",
          700: "#1558d6",
          800: "#1748ac",
          900: "#193f87",
          950: "#132752",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(47, 143, 255, 0.45)",
      },
    },
  },
  plugins: [],
};
