import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F7F8FB",
        foreground: "#1F1F1F",
        card: "#FFFFFF",
        muted: "#6B6D6A",
        border: "#E5E1DC",
        primary: "#78A3B0",
        accent: "#487988",
        surface: "#F1F2F4",
        status: {
          todo: "#F3E7B8",
          inprogress: "#D7E7FB",
          inreview: "#F8DEC0",
          complete: "#D3EFCB",
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
