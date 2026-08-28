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
        ink: "#161b1a",
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Tahoma", "Segoe UI", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16, 24, 22, 0.04), 0 1px 3px 0 rgba(16, 24, 22, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
