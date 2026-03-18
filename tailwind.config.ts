import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        canvas: "#f6f3ee",
        brand: "#9f2d20",
        sand: "#e7dccd",
        pine: "#20352f",
      },
      boxShadow: {
        card: "0 18px 40px rgba(23, 23, 23, 0.08)",
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        display: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
