import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        status: {
          todo: "rgb(var(--status-todo) / <alpha-value>)",
          inprogress: "rgb(var(--status-inprogress) / <alpha-value>)",
          inreview: "rgb(var(--status-inreview) / <alpha-value>)",
          complete: "rgb(var(--status-complete) / <alpha-value>)",
        },
      },
      borderRadius: {
        xl: "0.3rem",
        "2xl": "0.5rem",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(14, 24, 19, 0.08)",
        card: "0 1px 0 rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.08)",
        lift: "0 2px 0 rgba(16, 24, 40, 0.04), 0 14px 36px rgba(16, 24, 40, 0.12)",
      },
      letterSpacing: {
        tight: "-0.01em",
        tighter: "-0.02em",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [animate],
};

export default config;
