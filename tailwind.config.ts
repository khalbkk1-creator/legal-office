import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef6f4",
          100: "#d7ebe6",
          200: "#b0d6cc",
          300: "#82bcae",
          400: "#559d8c",
          500: "#357f6f",
          600: "#26665a",
          700: "#1f5348",
          800: "#1a423b",
          900: "#173731",
          950: "#0a1e1a",
        },
        accent: {
          50: "#fbf7ed",
          100: "#f5ecd2",
          200: "#ebd7a3",
          300: "#dfbd6f",
          400: "#d3a441",
          500: "#c28e2b",
          600: "#a37122",
          700: "#82581f",
          800: "#6a481f",
          900: "#593d1e",
        },
        ink: "#161b1a",
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Tahoma", "Segoe UI", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16, 24, 22, 0.04), 0 1px 3px 0 rgba(16, 24, 22, 0.06)",
        elevated: "0 4px 12px -2px rgba(16, 24, 22, 0.08), 0 2px 4px -2px rgba(16, 24, 22, 0.06)",
        floating: "0 12px 32px -8px rgba(16, 24, 22, 0.16)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.375rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease both",
      },
    },
  },
  plugins: [],
};
export default config;
