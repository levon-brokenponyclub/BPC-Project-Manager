import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core tokens (driven by CSS variables in ./styles/theme.css)
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",

        // Surfaces
        card: "rgb(var(--card) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        popover: "rgb(var(--popover, var(--card)) / <alpha-value>)",

        // UI chrome
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input, var(--border)) / <alpha-value>)",
        ring: "rgb(var(--ring, var(--primary)) / <alpha-value>)",

        // Accents
        primary: "rgb(var(--primary) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",

        // Sidebar / nav (optional tokens)
        sidebar: {
          DEFAULT: "rgb(var(--sidebar, var(--background)) / <alpha-value>)",
          foreground:
            "rgb(var(--sidebar-foreground, var(--foreground)) / <alpha-value>)",
          muted: "rgb(var(--sidebar-muted, var(--muted)) / <alpha-value>)",
          border: "rgb(var(--sidebar-border, var(--border)) / <alpha-value>)",
        },

        // Status colors
        status: {
          todo: "rgb(var(--status-todo) / <alpha-value>)",
          upcoming: "rgb(var(--status-upcoming) / <alpha-value>)",
          inprogress: "rgb(var(--status-inprogress) / <alpha-value>)",
          inreview: "rgb(var(--status-inreview) / <alpha-value>)",
          "awaiting-client":
            "rgb(var(--status-awaiting-client) / <alpha-value>)",
          "on-hold": "rgb(var(--status-on-hold) / <alpha-value>)",
          complete: "rgb(var(--status-complete) / <alpha-value>)",
          backlog: "rgb(var(--status-backlog, var(--muted)) / <alpha-value>)",
          canceled: "rgb(var(--status-canceled, var(--muted)) / <alpha-value>)",
        },

        // Semantic (optional)
        destructive: {
          DEFAULT: "rgb(var(--destructive, 239 68 68) / <alpha-value>)",
          foreground:
            "rgb(var(--destructive-foreground, 255 255 255) / <alpha-value>)",
        },
      },
      borderRadius: {
        // keep your existing keys
        xl: "0.3rem",
        "2xl": "0.5rem",
        // and add a small scale (handy for UI)
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(14, 24, 19, 0.08)",
        card: "0 1px 0 rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.08)",
        lift: "0 2px 0 rgba(16, 24, 40, 0.04), 0 14px 36px rgba(16, 24, 40, 0.12)",
        modal:
          "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px rgba(16, 24, 40, 0.07), 0 0 0 1px rgba(16, 24, 40, 0.05)",
        // useful for dark UI surfaces
        elevated:
          "0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 32px rgba(0, 0, 0, 0.35)",
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
