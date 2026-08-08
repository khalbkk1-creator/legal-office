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
          50: "#f0f7f6",
          100: "#dcece9",
          200: "#b9dad4",
          300: "#8ec2b8",
          400: "#5fa398",
          500: "#3d857a",
          600: "#2c6b62",
          700: "#25564f",
          800: "#204542",
          900: "#1c3a38",
          950: "#0d211f",
        },
        ink: "#1a1f1e",
      },
      fontFamily: {
        sans: ["Tahoma", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
