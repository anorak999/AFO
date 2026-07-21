/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        // Semantic surface colors mapped to CSS vars
        app: "var(--bg-app)",
        sidebar: "var(--bg-sidebar)",
        card: "var(--bg-card)",
        "card-hover": "var(--bg-card-hover)",
        inset: "var(--bg-inset)",
        elevated: "var(--bg-elevated)",

        // Text
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-inverse": "var(--text-inverse)",

        // Accent
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",

        // Semantic
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",

        // Border
        border: "var(--border-default)",
        "border-strong": "var(--border-strong)",
        "border-focus": "var(--border-focus)",

        // Legacy compat — map old afo colors to semantic vars
        afo: {
          purple: "var(--accent)",
          emerald: "var(--success)",
          amber: "var(--warning)",
          rose: "var(--danger)",
          sky: "var(--info)",
        },
      },
      borderRadius: {
        card: "12px",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};
