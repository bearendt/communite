import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: "#C2714F",
        sage: "#7A9E7E",
        cream: "#F5F0E8",
        sand: "#E8DCC8",
        charcoal: "#2D2D2D",
      },
    },
  },
  plugins: [],
};
export default config;
