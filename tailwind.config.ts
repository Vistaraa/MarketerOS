import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        plum: "#7357f3",
        canvas: "#f7f8fc"
      },
      fontFamily: { sans: ["var(--font-inter)", "Inter", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(20, 33, 61, .04), 0 8px 24px rgba(20, 33, 61, .04)" }
    }
  },
  plugins: []
};

export default config;
