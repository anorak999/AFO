/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        afo: {
          purple: "#785AFF",
          emerald: "#34D399",
          amber: "#FBBF24",
          rose: "#FB7185",
          sky: "#38BDF8",
        },
      },
      borderRadius: {
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
    },
  },
  plugins: [],
};
