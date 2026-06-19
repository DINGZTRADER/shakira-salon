import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sakira brand palette: Light Brown, Black, White
        brand: {
          50: "#faf6f1",
          100: "#f0e4d6",
          200: "#e2c9ad",
          300: "#d4ae84",
          400: "#c69460",
          500: "#b87d47", // primary light brown
          600: "#9c6539",
          700: "#7d4f2f",
          800: "#5e3c25",
          900: "#3f281a",
        },
        ink: {
          DEFAULT: "#1a1a1a", // near-black
          light: "#333333",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
