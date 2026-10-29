import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Vazirmatn Variable"', "Vazirmatn", "Tahoma", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa",
          500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a",
        },
        navy: { 700: "#1b3a78", 800: "#12285b", 900: "#0b1b42" },
        mist: "#f6f8fb",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,37,87,.04), 0 8px 24px -10px rgba(15,37,87,.12)",
        lift: "0 2px 4px rgba(15,37,87,.05), 0 20px 44px -14px rgba(15,37,87,.22)",
      },
    },
  },
  plugins: [],
};
export default config;
