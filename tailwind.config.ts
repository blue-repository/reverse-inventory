import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "320px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      spacing: {
        0.5: "0.125rem",
        1.5: "0.375rem",
        2.5: "0.625rem",
        3.5: "0.875rem",
      },
      fontSize: {
        "10px": "0.625rem",
        "11px": "0.6875rem",
        "12px": "0.75rem",
      },
      minHeight: {
        44: "44px",
        48: "48px",
      },
      minWidth: {
        44: "44px",
        48: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
