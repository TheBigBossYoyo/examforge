import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f7fa",
          100: "#e9edf3",
          200: "#cdd6e3",
          300: "#a3b2c9",
          400: "#7388a8",
          500: "#52688c",
          600: "#3f5273",
          700: "#34435d",
          800: "#2d3a4f",
          900: "#1b2230",
          950: "#11151d",
        },
        tmua: {
          DEFAULT: "#6d5dfc",
          soft: "#8b7cff",
          dark: "#4c3fd6",
          pale: "#f0efff",
        },
        sat: {
          DEFAULT: "#0ea5a4",
          soft: "#2dd4bf",
          dark: "#0c8a89",
          pale: "#e0fdfd",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0px 2px 8px -2px rgba(16, 24, 40, 0.04), 0px 4px 16px -4px rgba(16, 24, 40, 0.02)",
        lift: "0px 10px 32px -4px rgba(16, 24, 40, 0.08), 0px 6px 14px -6px rgba(16, 24, 40, 0.04)",
        innerTone: "inset 0px 1px 1px rgba(255, 255, 255, 0.2)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
