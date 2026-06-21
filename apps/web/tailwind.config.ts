import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Disha palette — "disha" = direction. Green for the better path.
        leaf: "#16a34a",
        leafdark: "#15803d",
        coal: "#0f172a",
      },
    },
  },
  plugins: [],
};

export default config;
